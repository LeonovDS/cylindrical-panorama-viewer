import * as THREE from 'three';
import { Vector2 } from 'three';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __spreadArray(to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
}

var Label = /** @class */ (function () {
    function Label(x, y, label) {
        this.position = new Vector2(x, y);
        this.root = document.createElement('div');
        this.root.style.position = 'absolute';
        this.root.appendChild(label);
    }
    return Label;
}());

var DEFAULT_H = 1;
var DEFAULT_DISTORTION = 1.1;
var CYLINDER_SIDES = 128;
var DEFAULT_FOV = THREE.MathUtils.degToRad(55);
var PanoramaViewer = /** @class */ (function () {
    function PanoramaViewer(parent, imageURL, initialLongitude, distortion, enableControls, labels) {
        if (initialLongitude === void 0) { initialLongitude = 0; }
        if (distortion === void 0) { distortion = DEFAULT_DISTORTION; }
        if (enableControls === void 0) { enableControls = false; }
        if (labels === void 0) { labels = []; }
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
    PanoramaViewer.prototype.startAnimationLoop = function () {
        var _this = this;
        this.isAnimating = true;
        requestAnimationFrame(function () { return _this.animationLoop(); });
    };
    PanoramaViewer.prototype.stopAnimationLoop = function () {
        this.isAnimating = false;
    };
    PanoramaViewer.prototype.animationLoop = function () {
        var _this = this;
        this.texture.offset.set(this.longitude % (2 * Math.PI) / 2 / Math.PI, 0);
        this.renderer.render(this.scene, this.camera);
        this.updateLabelPositions();
        if (this.isAnimating)
            requestAnimationFrame(function () { return _this.animationLoop(); });
    };
    PanoramaViewer.prototype.setImage = function (imageUrl, initialLongitude) {
        if (initialLongitude === void 0) { initialLongitude = 0; }
        this.loadImage(imageUrl, initialLongitude);
        this.onResize();
    };
    PanoramaViewer.prototype.loadImage = function (imageURL, initialLongitude) {
        var _this = this;
        this.texture = this.textureLoader.load(imageURL, function () { return _this.onTextureLoaded(initialLongitude); });
    };
    PanoramaViewer.prototype.onTextureLoaded = function (initialLongitude) {
        this.longitude = initialLongitude;
        this.updateTexture();
    };
    PanoramaViewer.prototype.updateTexture = function () {
        this.repeatCount = 2 * Math.PI * this.cylinderRadius / this.cylinderHeight / this.texture.image.width * this.texture.image.height;
        this.texture.repeat.setX(-this.repeatCount);
        this.texture.wrapS = THREE.RepeatWrapping;
        this.texture.flipY = true;
    };
    PanoramaViewer.prototype.onResize = function () {
        var width = this.renderer.domElement.parentElement.clientWidth;
        var height = this.renderer.domElement.parentElement.clientHeight;
        this.renderer.setSize(width, height);
        this.aspectRatio = width / height;
        this.calculateSceneParameters();
        this.setupCamera();
        this.setupScene();
    };
    PanoramaViewer.prototype.setupCamera = function () {
        this.camera = new THREE.PerspectiveCamera(THREE.MathUtils.radToDeg(this.fov));
        this.camera.aspect = this.aspectRatio;
        this.camera.lookAt(1, 0, 0);
        this.camera.position.set(this.cameraRadius, 0, 0);
        this.camera.updateProjectionMatrix();
    };
    PanoramaViewer.prototype.setupScene = function () {
        this.scene = new THREE.Scene();
        var cylinderGeometry = new THREE.CylinderGeometry(this.cylinderRadius, this.cylinderRadius, this.cylinderHeight, CYLINDER_SIDES, 1, true);
        cylinderGeometry.rotateY(Math.PI / 2 + 2 * Math.PI / this.repeatCount);
        cylinderGeometry.rotateZ(-Math.PI);
        cylinderGeometry.rotateX(Math.PI);
        var material = new THREE.MeshBasicMaterial({ map: this.texture, side: THREE.DoubleSide });
        this.mesh = new THREE.Mesh(cylinderGeometry, material);
        this.mesh.position.set(0, 0, 0);
        this.scene.add(this.mesh);
    };
    PanoramaViewer.prototype.calculateSceneParameters = function () {
        var fov = this.fov;
        var aspectRatio = this.aspectRatio;
        this.horizontalFov = 2 * Math.atan(Math.tan(fov / 2) * aspectRatio);
        var distortion = 1 + (this.distortion - 1) / aspectRatio / aspectRatio;
        var H = DEFAULT_H;
        this.cylinderHeight = H;
        var diff = H / 2 / Math.tan(fov / 2);
        var d = diff * (1 - 1 / distortion);
        var R = (d * d + Math.pow(H / 2 / distortion / aspectRatio, 2)) / (2 * d);
        this.cylinderRadius = R;
        var r = R - diff;
        this.cameraRadius = r;
    };
    PanoramaViewer.prototype.initCallbacks = function () {
        var _this = this;
        window.addEventListener('resize', function () {
            _this.onResize();
        });
    };
    PanoramaViewer.prototype.initControls = function () {
        var _this = this;
        var elem = this.renderer.domElement;
        elem.focus();
        var isPressed = false;
        var lastPosition = 0;
        elem.addEventListener('mousedown', function (event) {
            isPressed = true;
            lastPosition = event.clientX;
        });
        elem.addEventListener('mousemove', function (event) {
            if (isPressed) {
                _this.longitude -= (event.clientX - lastPosition) * 0.001;
                _this.longitude %= 2 * Math.PI;
                lastPosition = event.clientX;
            }
        });
        elem.addEventListener('mouseup', function (event) {
            isPressed = false;
        });
        elem.addEventListener('touchstart', function (event) {
            isPressed = true;
            lastPosition = event.targetTouches[0].clientX;
        });
        elem.addEventListener('touchmove', function (event) {
            if (isPressed) {
                _this.longitude -= (event.targetTouches[0].clientX - lastPosition) * 0.001;
                _this.longitude %= 2 * Math.PI;
                lastPosition = event.targetTouches[0].clientX;
            }
        });
        elem.addEventListener('touchup', function (event) {
            isPressed = false;
        });
        document.addEventListener('keydown', function (event) {
            if (event.key === 'ArrowLeft') {
                _this.longitude -= 0.01;
                _this.longitude %= 2 * Math.PI;
            }
            if (event.key === 'ArrowRight') {
                _this.longitude += 0.01;
                _this.longitude %= 2 * Math.PI;
            }
        });
    };
    PanoramaViewer.prototype.clearLabels = function () {
        this.labels = [];
        this.labelRoot.replaceChildren();
    };
    PanoramaViewer.prototype.addLabels = function (labels) {
        var _a;
        this.labels = this.labels.concat(labels);
        (_a = this.labelRoot).replaceChildren.apply(_a, __spreadArray(__spreadArray([], this.labels.map(function (v, i, _) { return v.root; }), false), labels.map(function (v, i, _) { return v.root; }), false));
        this.updateLabelPositions();
    };
    PanoramaViewer.prototype.updateLabelPositions = function () {
        var _this = this;
        this.labels.forEach(function (element) {
            var width = _this.renderer.domElement.width;
            var height = _this.renderer.domElement.height;
            var R = _this.cylinderRadius;
            var H = _this.cylinderHeight;
            var delta = THREE.MathUtils.euclideanModulo(element.position.x - _this.longitude, 2 * Math.PI);
            if (delta > Math.PI)
                delta -= 2 * Math.PI;
            if (delta < -Math.PI)
                delta += 2 * Math.PI;
            if (Math.abs(delta) <= _this.horizontalFov)
                element.root.style.display = 'block';
            else
                element.root.style.display = 'none';
            var pos = new THREE.Vector3(2 * R * Math.cos(delta), H / 2 * element.position.y, 2 * R * Math.sin(delta));
            var projection = pos.project(_this.camera);
            var x = width / 2 * (1 + projection.x) - element.root.clientWidth / 2;
            var y = height / 2 * (1 - projection.y) + element.root.clientHeight / 2;
            element.root.style.left = x.toString() + 'px';
            element.root.style.top = y.toString() + 'px';
        });
    };
    return PanoramaViewer;
}());
module.exports = {
    Label: Label,
    PanoramaViewer: PanoramaViewer
};
