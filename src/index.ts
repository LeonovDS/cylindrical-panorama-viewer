'use strict';
import * as THREE from 'three';
import { Label } from './label';

const DEFAULT_H: number = 1;
const DEFAULT_DISTORTION: number = 1.1;
const CYLINDER_SIDES: number = 128;
const DEFAULT_FOV: number = THREE.MathUtils.degToRad(55);

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

  private longitude: number;

  private labels: Label[] = [];
  private labelRoot: HTMLElement;

  private isAnimating = false;

  /**
   * Constructor
   * @param parent The parent element of the viewer.
   * @param imageURL The URL of the image to display.
   * @param initialLongitude The initial rotation of the image in radians.
   * @param distortion The distortion of the image. Adds stretching on the left and right sides.
   * @param enableControls Whether to enable mouse and keyboard controls.
   * @param labels List of labels to add to the viewer.
   */
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

  /**
  * Starts the animation loop.
  */
  public startAnimationLoop() {
    this.isAnimating = true;
    requestAnimationFrame(() => this.animationLoop());
  }

  /**
  * Stops the animation loop.
  */
  public stopAnimationLoop() {
    this.isAnimating = false;
  }

  /**
  * Sets the image to display.
  * @param imageUrl The URL of the image to display.
  * @param initialLongitude The initial rotation of the image in radians.
  */
  public setImage(imageUrl: string, initialLongitude: number = 0) {
    this.loadImage(imageUrl, initialLongitude);
  }

  /**
  * Removes all labels from the viewer.
  */
  public clearLabels() {
    this.labels = [];
    this.labelRoot.replaceChildren();
  }

  /**
  * Adds labels to the viewer.
  * @param labels The labels to add.
  */
  public addLabels(labels: Label[]) {
    this.labels = this.labels.concat(labels);
    this.labelRoot.replaceChildren(
      //      ...this.labels.map((v, _, __) => v.root),  // TODO: Check if breaks without this line :)
      ...labels.map((v, _, __) => v.root)
    );
    this.updateLabelPositions();
  }

  /**
  * Sets rotation of the image in radians.
  * @param longitude New rotation of the image in radians.
  */
  public setLongitude(longitude: number) {
    this.longitude = this.to_range(longitude);
  }

  public async animateTo(longitude: number, duration: number) {
    const startTime = Date.now();

  }

  private animationLoop() {
    this.texture.offset.set(this.repeatCount / 2 + this.longitude % (2 * Math.PI) / 2 / Math.PI, 0);
    this.renderer.render(this.scene, this.camera);
    this.updateLabelPositions();
    if (this.isAnimating)
      requestAnimationFrame(() => this.animationLoop());
  }

  // TODO: Change loading order
  private loadImage(imageURL: string, initialLongitude: number) {
    this.texture = this.textureLoader.load(imageURL, (txt) => this.onTextureLoaded(txt, initialLongitude));
  }

  private onTextureLoaded(txt: THREE.Texture, initialLongitude: number) {
    this.longitude = initialLongitude;
    this.updateTexture(txt);
    this.onResize();
  }

  private updateTexture(txt: THREE.Texture) {
    this.repeatCount = 2 * Math.PI * this.cylinderRadius / this.cylinderHeight / txt.image.width * txt.image.height;
    console.log("repeat count: " + this.repeatCount);
    txt.repeat.setX(-this.repeatCount);
    txt.wrapS = THREE.RepeatWrapping;
    txt.flipY = true;
  }

  private onResize() {
    const width = this.renderer.domElement.parentElement.clientWidth;
    const height = this.renderer.domElement.parentElement.clientHeight;
    this.renderer.setSize(width, height);
    this.aspectRatio = width / height;

    this.calculateSceneParameters();
    this.setupCamera();
    this.setupScene();
    if (this.texture.image) {
      this.repeatCount = 2 * Math.PI * this.cylinderRadius / this.cylinderHeight / this.texture.image.width * this.texture.image.height;
      this.texture.repeat.setX(-this.repeatCount);
      console.log("repeat count: " + this.repeatCount);
    }
  }

  private setupCamera() {
    this.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(this.fov));
    this.camera.aspect = this.aspectRatio;
    this.camera.lookAt(0, 0, 1);
    // this.camera.position.set(0, 0, 0);
    this.camera.position.set(0, this.cylinderHeight / 200, this.cameraRadius);
    // TODO: Change camera y position to fix black strips on edges
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

  // TODO: Extract all controls to a separate class
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

  private to_range(value: number) {
    let a = (value % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    if (a > Math.PI) {
      a -= 2 * Math.PI;
    }
    return a;
  }

  private updateLabelPositions() {
    this.labels.forEach(element => {
      const width = this.renderer.domElement.width;
      const height = this.renderer.domElement.height;
      const R = this.cylinderRadius;
      const H = this.cylinderHeight;

      const alpha = element.position.x * 2 * Math.PI;
      const beta = this.to_range(this.longitude);
      const delta = this.to_range(alpha - beta);
      let phi = this.to_range(-delta / this.repeatCount);

      const position = new THREE.Vector3(
        R * Math.sin(phi),
        H / 2 * element.position.y,
        R * Math.cos(phi),
      )

      const projected = position.project(this.camera);
      const x = width / 2 * (1 + projected.x) - element.root.offsetWidth / 2;
      const y = height / 2 * (1 - projected.y) - element.root.offsetHeight / 2;
      if (Math.abs(delta) > this.horizontalFov / 2) {
        element.root.style.display = 'none';
      } else {
        element.root.style.display = 'block';
      }

      element.root.style.left = x.toString() + 'px';
      element.root.style.top = y.toString() + 'px';
    });
  }
}

export { Label, PanoramaViewer };

module.exports = {
  Label, PanoramaViewer
};
