import * as THREE from 'three';
import { Vector2 } from 'three';

/**
 * Class for a label placed on panorama surface
 */
class Label {
    /**
     *
     * @param x X coordinate of label. Must be between 0 and 1.
     * @param y Y coordinate of label. Must be between -1 (bottom) and 1 (top).
     * @param label
     */
    constructor(x, y, label) {
        this.position = new Vector2(x, y);
        this.root = document.createElement('div');
        this.root.style.position = 'absolute';
        this.root.appendChild(label);
    }
}

/**
 * Maps angle to range from -PI to PI
 * @param value Angle in radians
 */
function toRange(value) {
    let a = (value % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    if (a > Math.PI) {
        a -= 2 * Math.PI;
    }
    return a;
}

// Default mouse speed
const DEFAULT_SPEED = 0.01;
/**
 * Simple controller implementation. Just sets longitude manually
 */
class SimpleController {
}
/**
 * Mouse controller for viewer. Supports mouse and touch events
 */
class MouseController {
    /**
     * Constructor
     * @param initialLongitude The initial rotation of panorama in radians
     * @param rootElement Element to which event listeners are attached
     * @param isMouseEnabled Whether mouse events are enabled
     * @param mouseSpeed Mouse speed
     */
    constructor(initialLongitude, rootElement, isMouseEnabled = true, mouseSpeed = DEFAULT_SPEED) {
        // Whether mouse button is pressed
        this.isPressed = false;
        // Previous mouse x coordinate
        this.prevPosition = null;
        this.onMouseDown = (event) => {
            this.isPressed = true;
            this.prevPosition = event.clientX;
        };
        this.onMouseUp = (event) => {
            this.isPressed = false;
            this.prevPosition = null;
        };
        this.onMouseMove = (event) => {
            if (this.isPressed) {
                this.longitude -= (event.clientX - this.prevPosition) * this._mouseSpeed;
                this.longitude = toRange(this.longitude);
                this.prevPosition = event.clientX;
            }
        };
        this.root = rootElement;
        this._longitude = toRange(initialLongitude);
        this.isMouseEnabled = isMouseEnabled;
        this._mouseSpeed = mouseSpeed;
        console.log('MouseController constructor');
    }
    /**
     * Gets whether mouse events are enabled
     */
    get isMouseEnabled() {
        return this._isMouseEnabled;
    }
    /**
     * Sets whether mouse events are enabled. Enables or disables event listeners when needed
     * @param value
     */
    set isMouseEnabled(value) {
        this._isMouseEnabled = value;
        if (!this.root)
            return;
        if (value) {
            this.root.addEventListener('mousedown', this.onMouseDown);
            this.root.addEventListener('mouseup', this.onMouseUp);
            this.root.addEventListener('mousemove', this.onMouseMove);
            // this.root.addEventListener('touchstart', this.onMouseDown);
            // this.root.addEventListener('touchup', this.onMouseUp);
            // this.root.addEventListener('touchmove', this.onMouseMove);
        }
        else {
            this.root.removeEventListener('mousedown', this.onMouseDown);
            this.root.removeEventListener('mouseup', this.onMouseUp);
            this.root.removeEventListener('mousemove', this.onMouseMove);
        }
    }
    /**
     * Gets current rotation angle
     */
    get longitude() {
        return this._longitude;
    }
    /**
     * Sets current rotation angle
     * @param value
     */
    set longitude(value) {
        this._longitude = toRange(value);
    }
}

// Default height of cylinder
const DEFAULT_H = 1;
// Default distortion coefficient
const DEFAULT_DISTORTION = 1.1;
// Default number of sides of cylinder
const CYLINDER_SIDES = 128;
// Default vertical FOV of camera
const DEFAULT_FOV = THREE.MathUtils.degToRad(55);
class PanoramaViewer {
    /**
     * Constructor
     * @param parent The parent element of the viewer.
     * @param distortion The distortion of the image. Adds stretching on the left and right sides.
     * @param controller The controller of the viewer. By default, mouse controller is used
     */
    constructor(parent, distortion = DEFAULT_DISTORTION) {
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        // Vertical FOV of the camera
        this.fov = DEFAULT_FOV;
        // Number of how many times image is repeated along cylinder surface
        this.repeatCount = 1;
        this.textureLoader = new THREE.TextureLoader();
        // List of labels placed on panorama
        this.labels = [];
        // Whether animation loop is running
        this.isAnimating = false;
        // Whether image is being loaded
        this._isLoadingImage = false;
        parent.appendChild(this.renderer.domElement);
        this.labelRoot = document.createElement('div');
        parent.appendChild(this.labelRoot);
        this.initCallbacks();
        this.controller = new MouseController(0, this.renderer.domElement);
        this.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(this.fov));
        this.scene = new THREE.Scene();
        this.distortion = distortion;
    }
    /**
     * Shows whether image is being loaded
     */
    get isLoadingImage() {
        return this._isLoadingImage;
    }
    /**
     * Starts the animation loop.
     */
    startAnimationLoop() {
        this.isAnimating = true;
        requestAnimationFrame(() => this.animationLoop());
    }
    /**
     * Stops the animation loop.
     */
    stopAnimationLoop() {
        this.isAnimating = false;
    }
    /**
     * Sets the image to display.
     * @param imageUrl The URL of the image to display.
     * @param initialLongitude The initial rotation of the image in radians.
     * @param newLabels List of labels to add to the viewer after loading image.
     * @param onLoaded Callback to be called when image is loaded.
     */
    setImage(imageUrl, initialLongitude = 0, newLabels = [], onLoaded = () => {
    }) {
        this.loadImage(imageUrl, initialLongitude, newLabels, onLoaded);
    }
    /**
     * Removes all labels from the viewer.
     */
    clearLabels() {
        this.labels = [];
        this.labelRoot.replaceChildren();
    }
    /**
     * Adds labels to the viewer.
     * @param labels The labels to add.
     */
    addLabels(labels) {
        this.labels = this.labels.concat(labels);
        this.labelRoot.replaceChildren(...this.labels.map((v, _, __) => v.root));
    }
    /**
     * Sets rotation of the image in radians.
     * @param longitude New rotation of the image in radians.
     */
    setLongitude(longitude) {
        this.controller.longitude = toRange(longitude);
    }
    /**
     * One iteration of the animation loop.
     * @private
     */
    animationLoop() {
        this.texture.offset.set(this.repeatCount / 2 + this.controller.longitude % (2 * Math.PI) / 2 / Math.PI, 0);
        this.renderer.render(this.scene, this.camera);
        this.updateLabelPositions();
        if (this.isAnimating)
            requestAnimationFrame(() => this.animationLoop());
    }
    /**
     * Loads image texture.
     * @param imageURL The URL of the image to load.
     * @param initialLongitude The initial rotation of the image in radians.
     * @param newLabels List of labels to add to the viewer after loading image.
     * @param onLoaded Called when image is loaded.
     * @private
     */
    loadImage(imageURL, initialLongitude, newLabels, onLoaded) {
        this._isLoadingImage = true;
        const isAnimating = this.isAnimating;
        this.stopAnimationLoop();
        this.texture = this.textureLoader.load(imageURL, (txt) => {
            this.onTextureLoaded(txt, initialLongitude);
            this.clearLabels();
            this.addLabels(newLabels);
            if (isAnimating)
                this.startAnimationLoop();
            this._isLoadingImage = false;
            onLoaded();
        });
    }
    /**
     * Called when the texture is loaded.
     * @param txt Loaded texture.
     * @param initialLongitude The initial rotation of the image in radians.
     * @private
     */
    onTextureLoaded(txt, initialLongitude) {
        this.texture = txt;
        this.controller.longitude = initialLongitude;
        this.update();
        this.startAnimationLoop();
    }
    /**
     * Updates everything after the image loaded or after window resized.
     * @private
     */
    update() {
        this.updateRenderer();
        this.calculateSceneParameters();
        this.updateTexture();
        this.updateScene();
        this.updateCamera();
    }
    /**
     * Updates renderer parameters
     * @private
     */
    updateRenderer() {
        const width = this.renderer.domElement.parentElement.clientWidth;
        const height = this.renderer.domElement.parentElement.clientHeight;
        this.renderer.setSize(width, height);
        this.aspectRatio = width / height;
    }
    /**
     * Updates texture parameters.
     * @private
     */
    updateTexture() {
        this.repeatCount = 2 * Math.PI * this.cylinderRadius / this.cylinderHeight / this.texture.image.width * this.texture.image.height;
        console.log("repeat count: " + this.repeatCount);
        this.texture.repeat.setX(-this.repeatCount);
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.flipY = true;
    }
    /**
     * Calculates geometric parameters of the scene.
     * @private
     */
    calculateSceneParameters() {
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
    /**
     * Rebuilds the scene.
     * @private
     */
    updateScene() {
        this.scene.clear();
        const cylinderGeometry = new THREE.CylinderGeometry(this.cylinderRadius, this.cylinderRadius, this.cylinderHeight, CYLINDER_SIDES, 1, true);
        cylinderGeometry.rotateZ(-Math.PI);
        cylinderGeometry.rotateX(Math.PI);
        const material = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(cylinderGeometry, material);
        this.mesh.position.set(0, 0, 0);
        this.scene.add(this.mesh);
    }
    /**
     * Places the camera on scene.
     * @private
     */
    updateCamera() {
        this.camera.aspect = this.aspectRatio;
        this.camera.position.set(0, 0, 0);
        this.camera.lookAt(0, 0, 1);
        this.camera.position.set(0, this.cylinderHeight / 200, this.cameraRadius);
        // TODO: Change camera y position to fix black strips on edges
        this.camera.updateProjectionMatrix();
    }
    /**
     * Initializes callbacks. (For now only onResize)
     * @private
     */
    initCallbacks() {
        window.addEventListener('resize', () => {
            this.update();
        });
    }
    /**
     * Updates label positions and visibility.
     * @private
     */
    updateLabelPositions() {
        this.labels.forEach(element => {
            const width = this.renderer.domElement.width;
            const height = this.renderer.domElement.height;
            const R = this.cylinderRadius;
            const H = this.cylinderHeight;
            const alpha = element.position.x * 2 * Math.PI;
            const beta = toRange(this.controller.longitude);
            const delta = toRange(alpha - beta);
            let phi = toRange(-delta / this.repeatCount);
            const position = new THREE.Vector3(R * Math.sin(phi), H / 2 * element.position.y, R * Math.cos(phi));
            const projected = position.project(this.camera);
            const x = width / 2 * (1 + projected.x) - element.root.offsetWidth / 2;
            const y = height / 2 * (1 - projected.y) - element.root.offsetHeight / 2;
            if (Math.abs(delta) > this.horizontalFov / 2) {
                element.root.style.display = 'none';
            }
            else {
                element.root.style.display = 'block';
            }
            element.root.style.left = x.toString() + 'px';
            element.root.style.top = y.toString() + 'px';
        });
    }
}

export { Label, MouseController, PanoramaViewer, SimpleController };
//# sourceMappingURL=cylindrical-panorama-viewer.js.map
