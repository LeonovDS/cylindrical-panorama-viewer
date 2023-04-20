'use strict';
import * as THREE from 'three';
import { Label } from './label';

const DEFAULT_H: number = 1;
const DEFAULT_DISTORTION: number = 1.1;
const CYLINDER_SIDES: number = 128;
const DEFAULT_FOV: number = THREE.MathUtils.degToRad(55);

type PanoramaViewerOptions = {
    parent: HTMLElement,
    imageURL?: string,
    initialLongitude: number,
    distortion: number,
    enableControls: boolean,
    labels: Label[]
}

class PanoramaViewer {
    private renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({ antialias: true });
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private mesh: THREE.Mesh;

    private fov: number = DEFAULT_FOV;
    private horizontalFov: number;
    private distortion: number;
    private aspectRatio: number;

    private cylinderRadius: number;
    private cylinderHeight: number;
    private cameraRadius: number;
    private repeatCount: number = 1;

    private texture: THREE.Texture;
    private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();

    public longitude: number;

    private labels: Label[] = [];
    private labelRoot: HTMLElement;

    private isAnimating = false;

    constructor(
            parent: HTMLElement,
            imageURL: string,
            initialLongitude: number = 0,
            distortion: number = DEFAULT_DISTORTION,
            enableControls: boolean = false,
            labels: Label[] = [],) {
        parent.appendChild(this.renderer.domElement);

        this.labelRoot = document.createElement('div');
        parent.appendChild(this.labelRoot);
        this.addLabels(labels);

        this.distortion = distortion;
        this.loadImage(imageURL, initialLongitude);
        this.onResize();

        this.initCallbacks();
        if (enableControls)
            this.initControls();
    }

    public startAnimationLoop() {
        this.isAnimating = true;
        requestAnimationFrame(() => this.animationLoop());
    }

    public stopAnimationLoop() {
        this.isAnimating = false;
    }

    private animationLoop() {
        this.texture.offset.set(this.longitude % (2 * Math.PI) / 2 / Math.PI, 0);
        this.renderer.render(this.scene, this.camera);
        this.updateLabelPositions();
        if (this.isAnimating)
            requestAnimationFrame(() => this.animationLoop());
    }

    public setImage(imageUrl: string, initialLongitude: number = 0) {
        this.loadImage(imageUrl, initialLongitude);
        this.onResize();
    }

    private loadImage(imageURL: string, initialLongitude: number) {
        this.texture = this.textureLoader.load(imageURL, () => this.onTextureLoaded(initialLongitude));
    }

    private onTextureLoaded(initialLongitude: number) {
        this.longitude = initialLongitude;
        this.updateTexture();
    }

    private updateTexture() {
        this.repeatCount = 2 * Math.PI * this.cylinderRadius / this.cylinderHeight / this.texture.image.width * this.texture.image.height;
        this.texture.repeat.setX(-this.repeatCount);
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.flipY = true;
    }

    private onResize() {
        const width = this.renderer.domElement.parentElement.clientWidth;
        const height = this.renderer.domElement.parentElement.clientHeight;
        this.renderer.setSize(width, height);
        this.aspectRatio = width / height;

        this.calculateSceneParameters();
        this.setupCamera();
        this.setupScene();
    }

    private setupCamera() {
        this.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(this.fov));
        this.camera.aspect = this.aspectRatio;
        this.camera.lookAt(1, 0, 0);
        this.camera.position.set(this.cameraRadius, 0, 0);
        this.camera.updateProjectionMatrix();
    }

    private setupScene() {
        this.scene = new THREE.Scene();
        const cylinderGeometry = new THREE.CylinderGeometry(
            this.cylinderRadius, this.cylinderRadius,
            this.cylinderHeight,
            CYLINDER_SIDES,
            1,
            true,
        );
        cylinderGeometry.rotateY(Math.PI / 2 + 2 * Math.PI / this.repeatCount);
        cylinderGeometry.rotateZ(-Math.PI);
        cylinderGeometry.rotateX(Math.PI);

        const material = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(
            cylinderGeometry,
            material
        );
        this.mesh.position.set(0, 0, 0);
        this.scene.add(this.mesh);
    }

    private calculateSceneParameters() {
        const fov = this.fov;
        const aspectRatio = this.aspectRatio;
        this.horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * aspectRatio);
        const distortion = 1 + (this.distortion - 1) / aspectRatio / aspectRatio;
        const H = DEFAULT_H;
        this.cylinderHeight = H;
        const diff = H / 2 / Math.tan(fov / 2);
        const d = diff * (1 - 1 / distortion);
        const R = (d * d + Math.pow(H / 2 / distortion / aspectRatio, 2)) / (2 * d);
        this.cylinderRadius = R;
        const r = R - diff;
        this.cameraRadius = r;
    }

    private initCallbacks() {
        window.addEventListener('resize', () => {
            this.onResize();
        })
    }

    private initControls() {
        const elem = this.renderer.domElement;
        elem.focus();

        let isPressed = false;
        let lastPosition = 0;
        elem.addEventListener('mousedown', (event) => {
            isPressed = true;
            lastPosition = event.clientX;
        });
        elem.addEventListener('mousemove', (event) => {
            if (isPressed) {
                this.longitude -= (event.clientX - lastPosition) * 0.001;
                this.longitude %= 2 * Math.PI;
                lastPosition = event.clientX;
            }
        });
        elem.addEventListener('mouseup', (event) => {
            isPressed = false;
        });
        elem.addEventListener('touchstart', (event) => {
            isPressed = true;
            lastPosition = event.targetTouches[0].clientX;
        });
        elem.addEventListener('touchmove', (event) => {
            if (isPressed) {
                this.longitude -= (event.targetTouches[0].clientX - lastPosition) * 0.001;
                this.longitude %= 2 * Math.PI;
                lastPosition = event.targetTouches[0].clientX;
            }
        });
        elem.addEventListener('touchup', (event) => {
            isPressed = false;
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'ArrowLeft') {
                this.longitude -= 0.01;
                this.longitude %= 2 * Math.PI;
            }
            if (event.key === 'ArrowRight') {
                this.longitude += 0.01;
                this.longitude %= 2 * Math.PI;
            }
        });
    }

    public clearLabels() {
        this.labels = [];
        this.labelRoot.replaceChildren();
    }

    public addLabels(labels: Label[]) {
        this.labels = this.labels.concat(labels);
        this.labelRoot.replaceChildren(...this.labels.map((v, i, _) => v.root), ...labels.map((v, i, _) => v.root));
        this.updateLabelPositions();
    }

    private updateLabelPositions() {

        this.labels.forEach(element => {
            const width = this.renderer.domElement.width;
            const height = this.renderer.domElement.height;
            const R = this.cylinderRadius;
            const H = this.cylinderHeight;

            let delta = THREE.MathUtils.euclideanModulo(element.position.x - this.longitude, 2 * Math.PI);
            if (delta > Math.PI)
                delta -= 2 * Math.PI;
            if (delta < -Math.PI)
                delta += 2 * Math.PI;

            if (Math.abs(delta) <= this.horizontalFov)
                element.root.style.display = 'block';
            else
                element.root.style.display = 'none';

            const pos = new THREE.Vector3(2 * R * Math.cos(delta), H / 2 * element.position.y, 2 * R * Math.sin(delta));
            const projection = pos.project(this.camera);
            const x = width / 2 * (1 + projection.x) - element.root.clientWidth / 2;
            const y = height / 2 * (1 - projection.y) + element.root.clientHeight / 2;

            element.root.style.left = x.toString() + 'px';
            element.root.style.top = y.toString() + 'px';
        });
    }
}

module.exports = {
    Label, PanoramaViewer
};
