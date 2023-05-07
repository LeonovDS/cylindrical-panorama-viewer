'use strict';
import * as THREE from 'three';
import {Label} from './label';
import {toRange} from "./util";
import {MouseController, IController, SimpleController} from "./controller";

// Default height of cylinder
const DEFAULT_H: number = 1;
// Default distortion coefficient
const DEFAULT_DISTORTION: number = 1.1;
// Default number of sides of cylinder
const CYLINDER_SIDES: number = 128;
// Default vertical FOV of camera
const DEFAULT_FOV: number = THREE.MathUtils.degToRad(55);

class PanoramaViewer {
  private readonly renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({antialias: true});
  private readonly camera: THREE.PerspectiveCamera;
  private readonly scene: THREE.Scene;
  // Cylinder mesh used to display panorama
  private mesh: THREE.Mesh;
  // Controls rotation of panorama
  public controller: IController;

  // Vertical FOV of camera
  private fov: number = DEFAULT_FOV;
  // Horizontal FOV of camera
  private horizontalFov: number;
  // Distortion coefficient
  private readonly distortion: number;
  // Aspect ratio of render area
  private aspectRatio: number;

  // Radius of cylinder
  private cylinderRadius: number;
  // Height of cylinder
  private cylinderHeight: number;
  // Distance from center of cylinder to camera
  private cameraRadius: number;
  // Number of how many times image is repeated along cylinder surface
  private repeatCount: number = 1;

  // Image texture of panorama
  private texture: THREE.Texture;
  private textureLoader: THREE.TextureLoader = new THREE.TextureLoader();

  // List of labels placed on panorama
  private labels: Label[] = [];
  // Root div for label elements
  private readonly labelRoot: HTMLElement;

  // animation loop is running
  private isAnimating: boolean = false;
  // image is being loaded
  private _isLoadingImage: boolean = false;

  /**
   * Constructor
   * @param parent The parent element of viewer.
   * @param distortion The distortion of image. Adds stretching on left and right sides.
   */
  constructor(
    parent: HTMLElement,
    distortion: number = DEFAULT_DISTORTION,
  ) {
    parent.appendChild(this.renderer.domElement);
    this.labelRoot = document.createElement('div');
    parent.appendChild(this.labelRoot);
    this.initCallbacks();

    // TODO: Make this configurable
    this.controller = new MouseController(0, this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(this.fov));
    this.scene = new THREE.Scene();

    this.distortion = distortion;
  }

  /**
   * Shows image is being loaded
   */
  public get isLoadingImage(): boolean {
    return this._isLoadingImage;
  }

  /**
   * Starts animation loop.
   */
  public startAnimationLoop() {
    this.isAnimating = true;
    requestAnimationFrame(() => this.animationLoop());
  }

  /**
   * Stops animation loop.
   */
  public stopAnimationLoop() {
    this.isAnimating = false;
  }

  /**
   * Sets image to display.
   * @param imageUrl The URL of image to display.
   * @param initialLongitude The initial rotation of image in radians.
   * @param newLabels List of labels to add to viewer after loading image.
   * @param onLoaded Callback to be called when image is loaded.
   */
  public setImage(imageUrl: string, initialLongitude: number = 0, newLabels: Label[] = [], onLoaded: () => void = () => {
  }) {
    this.loadImage(imageUrl, initialLongitude, newLabels, onLoaded);
  }

  /**
   * Removes all labels from viewer.
   */
  public clearLabels() {
    this.labels = [];
    this.labelRoot.replaceChildren();
  }

  /**
   * Adds labels to viewer.
   * @param labels The labels to add.
   */
  public addLabels(labels: Label[]) {
    this.labels = this.labels.concat(labels);
    this.labelRoot.replaceChildren(
      ...this.labels.map((v, _, __) => v.root),
    );
  }

  /**
   * Sets rotation of image in radians.
   * @param longitude New rotation of image in radians.
   */
  public setLongitude(longitude: number) {
    this.controller.longitude = toRange(longitude);
  }

  /**
   * One iteration of animation loop.
   * @private
   */
  private animationLoop() {
    this.texture.offset.set(this.repeatCount / 2 + this.controller.longitude % (2 * Math.PI) / 2 / Math.PI, 0);
    this.renderer.render(this.scene, this.camera);
    this.updateLabelPositions();
    if (this.isAnimating)
      requestAnimationFrame(() => this.animationLoop());
  }

  /**
   * Loads image texture.
   * @param imageURL The URL of image to load.
   * @param initialLongitude The initial rotation of image in radians.
   * @param newLabels List of labels to add to viewer after loading image.
   * @param onLoaded Called when image is loaded.
   * @private
   */
  private loadImage(imageURL: string, initialLongitude: number, newLabels: Label[], onLoaded: () => void) {
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
   * Called when texture is loaded.
   * @param txt Loaded texture.
   * @param initialLongitude The initial rotation of image in radians.
   * @private
   */
  private onTextureLoaded(txt: THREE.Texture, initialLongitude: number) {
    this.texture = txt;
    this.controller.longitude = initialLongitude;
    this.update();
    this.startAnimationLoop();
  }

  /**
   * Updates everything after image loaded or after window resized.
   * @private
   */
  private update() {
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
  private updateRenderer() {
    const width = this.renderer.domElement.parentElement.clientWidth;
    const height = this.renderer.domElement.parentElement.clientHeight;
    this.renderer.setSize(width, height);
    this.aspectRatio = width / height;
  }

  /**
   * Updates texture parameters.
   * @private
   */
  private updateTexture() {
    this.repeatCount = 2 * Math.PI * this.cylinderRadius / this.cylinderHeight / this.texture.image.width * this.texture.image.height;
    console.log("repeat count: " + this.repeatCount);
    this.texture.repeat.setX(-this.repeatCount);
    this.texture.wrapS = THREE.RepeatWrapping;
    this.texture.flipY = true;
  }

  /**
   * Calculates geometric parameters of scene.
   * @private
   */
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

  /**
   * Rebuilds scene.
   * @private
   */
  private updateScene() {
    this.scene.clear();
    const cylinderGeometry = new THREE.CylinderGeometry(
      this.cylinderRadius, this.cylinderRadius,
      this.cylinderHeight,
      CYLINDER_SIDES,
      1,
      true,
    );
    cylinderGeometry.rotateZ(-Math.PI);
    cylinderGeometry.rotateX(Math.PI);

    const material = new THREE.MeshBasicMaterial({map: this.texture, side: THREE.DoubleSide});
    this.mesh = new THREE.Mesh(
      cylinderGeometry,
      material
    );
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
  }

  /**
   * Places camera on scene.
   * @private
   */
  private updateCamera() {
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
  private initCallbacks() {
    window.addEventListener('resize', () => {
      this.update();
    });
  }

  /**
   * Updates label positions and visibility.
   * @private
   */
  private updateLabelPositions() {
    this.labels.forEach(element => {
      const width = this.renderer.domElement.width;
      const height = this.renderer.domElement.height;
      const R = this.cylinderRadius;
      const H = this.cylinderHeight;

      const alpha = element.position.x * 2 * Math.PI;
      const beta = toRange(this.controller.longitude);
      const delta = toRange(alpha - beta);
      let phi = toRange(-delta / this.repeatCount);

      const position = new THREE.Vector3(
        R * Math.sin(phi),
        H / 2 * element.position.y,
        R * Math.cos(phi),
      );

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

export {Label, PanoramaViewer, IController, SimpleController, MouseController};
