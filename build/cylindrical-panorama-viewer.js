import * as THREE from 'three';
import { Vector2 } from 'three';

class Label {
  constructor(x, y, label) {
    this.position = new Vector2(x, y);
    this.root = document.createElement('div');
    this.root.style.position = 'absolute';
    this.root.appendChild(label);
  }
}

const DEFAULT_H = 1;
const DEFAULT_DISTORTION = 1.1;
const CYLINDER_SIDES = 128;
const DEFAULT_FOV = THREE.MathUtils.degToRad(55);
class PanoramaViewer {
  constructor(parent, imageURL, initialLongitude = 0, distortion = DEFAULT_DISTORTION, enableControls = false, labels = []) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.fov = DEFAULT_FOV;
    this.repeatCount = 1;
    this.textureLoader = new THREE.TextureLoader();
    this.labels = [];
    this.isAnimating = false;
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
  startAnimationLoop() {
    this.isAnimating = true;
    requestAnimationFrame(() => this.animationLoop());
  }
  stopAnimationLoop() {
    this.isAnimating = false;
  }
  animationLoop() {
    this.texture.offset.set(this.repeatCount / 2 + this.longitude % (2 * Math.PI) / 2 / Math.PI, 0);
    this.renderer.render(this.scene, this.camera);
    this.updateLabelPositions();
    if (this.isAnimating)
      requestAnimationFrame(() => this.animationLoop());
  }
  setImage(imageUrl, initialLongitude = 0) {
    this.loadImage(imageUrl, initialLongitude);
  }
  loadImage(imageURL, initialLongitude) {
    this.texture = this.textureLoader.load(imageURL, (txt) => this.onTextureLoaded(txt, initialLongitude));
  }
  onTextureLoaded(txt, initialLongitude) {
    this.longitude = initialLongitude;
    this.updateTexture(txt);
    this.onResize();
  }
  updateTexture(txt) {
    this.repeatCount = 2 * Math.PI * this.cylinderRadius / this.cylinderHeight / txt.image.width * txt.image.height;
    console.log("repeat count: " + this.repeatCount);
    txt.repeat.setX(-this.repeatCount);
    txt.wrapS = THREE.RepeatWrapping;
    txt.flipY = true;
  }
  onResize() {
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
  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(this.fov));
    this.camera.aspect = this.aspectRatio;
    this.camera.lookAt(0, 0, 1);
    this.camera.position.set(0, this.cylinderHeight / 200, this.cameraRadius);
    this.camera.updateProjectionMatrix();
  }
  setupScene() {
    this.scene = new THREE.Scene();
    const cylinderGeometry = new THREE.CylinderGeometry(this.cylinderRadius, this.cylinderRadius, this.cylinderHeight, CYLINDER_SIDES, 1, true);
    cylinderGeometry.rotateZ(-Math.PI);
    cylinderGeometry.rotateX(Math.PI);
    const material = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(cylinderGeometry, material);
    this.mesh.position.set(0, 0, 0);
    this.scene.add(this.mesh);
  }
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
  initCallbacks() {
    window.addEventListener('resize', () => {
      this.onResize();
    });
  }
  initControls() {
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
  clearLabels() {
    this.labels = [];
    this.labelRoot.replaceChildren();
  }
  addLabels(labels) {
    this.labels = this.labels.concat(labels);
    this.labelRoot.replaceChildren(...this.labels.map((v, i, _) => v.root), ...labels.map((v, i, _) => v.root));
    this.updateLabelPositions();
  }
  to_range(value) {
    let a = (value % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
    if (a > Math.PI) {
      a -= 2 * Math.PI;
    }
    return a;
  }
  updateLabelPositions() {
    this.labels.forEach(element => {
      const width = this.renderer.domElement.width;
      const height = this.renderer.domElement.height;
      const R = this.cylinderRadius;
      const H = this.cylinderHeight;
      const alpha = element.position.x * 2 * Math.PI;
      const beta = this.to_range(this.longitude);
      const delta = this.to_range(alpha - beta);
      let phi = this.to_range(-delta / this.repeatCount);
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
module.exports = {
  Label, PanoramaViewer
};

export { Label, PanoramaViewer };
