import { Vector2 } from "three";
/**
 * Class for a label placed on panorama surface
 */
declare class Label {
    /**
     * Position of center of the label.
     */
    position: Vector2;
    /**
     * Root element for label
     */
    root: HTMLElement;
    /**
     *
     * @param x X coordinate of label. Must be between 0 and 1.
     * @param y Y coordinate of label. Must be between -1 (bottom) and 1 (top).
     * @param label
     */
    constructor(x: number, y: number, label: HTMLElement);
}
/**
 * Interface for controller
 */
interface IController {
    longitude: number;
}
/**
 * Simple controller implementation. Just sets longitude manually
 */
declare class SimpleController implements IController {
    longitude: number;
}
/**
 * Mouse controller for viewer. Supports mouse and touch events
 */
declare class MouseController implements IController {
    // Element to which event listeners are attached
    root: HTMLElement;
    // Whether mouse events are enabled
    private _isMouseEnabled;
    // Current rotation angle of panorama
    private _longitude;
    // Mouse speed
    private readonly _mouseSpeed;
    /**
     * Constructor
     * @param initialLongitude The initial rotation of panorama in radians
     * @param rootElement Element to which event listeners are attached
     * @param isMouseEnabled Whether mouse events are enabled
     * @param mouseSpeed Mouse speed
     */
    constructor(initialLongitude: number, rootElement: HTMLElement, isMouseEnabled?: boolean, mouseSpeed?: number);
    /**
     * Gets whether mouse events are enabled
     */
    get isMouseEnabled(): boolean;
    /**
     * Sets whether mouse events are enabled. Enables or disables event listeners when needed
     * @param value
     */
    set isMouseEnabled(value: boolean);
    /**
     * Gets current rotation angle
     */
    get longitude(): number;
    /**
     * Sets current rotation angle
     * @param value
     */
    set longitude(value: number);
    // Whether mouse button is pressed
    private isPressed;
    // Previous mouse x coordinate
    private prevPosition;
    private onMouseDown;
    private onMouseUp;
    private onMouseMove;
}
declare class PanoramaViewer {
    private readonly renderer;
    private readonly camera;
    private readonly scene;
    private mesh;
    controller: IController;
    private fov;
    private horizontalFov;
    private readonly distortion;
    private aspectRatio;
    private cylinderRadius;
    private cylinderHeight;
    private cameraRadius;
    private repeatCount;
    private texture;
    private textureLoader;
    private labels;
    private readonly labelRoot;
    private isAnimating;
    private _isLoadingImage;
    /**
     * Constructor
     * @param parent The parent element of the viewer.
     * @param distortion The distortion of the image. Adds stretching on the left and right sides.
     * @param controller The controller of the viewer. By default, mouse controller is used
     */
    /**
     * Constructor
     * @param parent The parent element of the viewer.
     * @param distortion The distortion of the image. Adds stretching on the left and right sides.
     * @param controller The controller of the viewer. By default, mouse controller is used
     */
    constructor(parent: HTMLElement, distortion?: number);
    /**
     * Shows whether image is being loaded
     */
    get isLoadingImage(): boolean;
    /**
     * Starts the animation loop.
     */
    /**
     * Starts the animation loop.
     */
    startAnimationLoop(): void;
    /**
     * Stops the animation loop.
     */
    /**
     * Stops the animation loop.
     */
    stopAnimationLoop(): void;
    /**
     * Sets the image to display.
     * @param imageUrl The URL of the image to display.
     * @param initialLongitude The initial rotation of the image in radians.
     * @param newLabels List of labels to add to the viewer after loading image.
     * @param onLoaded Callback to be called when image is loaded.
     */
    /**
     * Sets the image to display.
     * @param imageUrl The URL of the image to display.
     * @param initialLongitude The initial rotation of the image in radians.
     * @param newLabels List of labels to add to the viewer after loading image.
     * @param onLoaded Callback to be called when image is loaded.
     */
    setImage(imageUrl: string, initialLongitude?: number, newLabels?: Label[], onLoaded?: () => void): void;
    /**
     * Removes all labels from the viewer.
     */
    /**
     * Removes all labels from the viewer.
     */
    clearLabels(): void;
    /**
     * Adds labels to the viewer.
     * @param labels The labels to add.
     */
    /**
     * Adds labels to the viewer.
     * @param labels The labels to add.
     */
    addLabels(labels: Label[]): void;
    /**
     * Sets rotation of the image in radians.
     * @param longitude New rotation of the image in radians.
     */
    /**
     * Sets rotation of the image in radians.
     * @param longitude New rotation of the image in radians.
     */
    setLongitude(longitude: number): void;
    /**
     * One iteration of the animation loop.
     * @private
     */
    /**
     * One iteration of the animation loop.
     * @private
     */
    private animationLoop;
    /**
     * Loads image texture.
     * @param imageURL The URL of the image to load.
     * @param initialLongitude The initial rotation of the image in radians.
     * @param newLabels List of labels to add to the viewer after loading image.
     * @param onLoaded Called when image is loaded.
     * @private
     */
    /**
     * Loads image texture.
     * @param imageURL The URL of the image to load.
     * @param initialLongitude The initial rotation of the image in radians.
     * @param newLabels List of labels to add to the viewer after loading image.
     * @param onLoaded Called when image is loaded.
     * @private
     */
    private loadImage;
    /**
     * Called when the texture is loaded.
     * @param txt Loaded texture.
     * @param initialLongitude The initial rotation of the image in radians.
     * @private
     */
    /**
     * Called when the texture is loaded.
     * @param txt Loaded texture.
     * @param initialLongitude The initial rotation of the image in radians.
     * @private
     */
    private onTextureLoaded;
    /**
     * Updates everything after the image loaded or after window resized.
     * @private
     */
    /**
     * Updates everything after the image loaded or after window resized.
     * @private
     */
    private update;
    /**
     * Updates renderer parameters
     * @private
     */
    /**
     * Updates renderer parameters
     * @private
     */
    private updateRenderer;
    /**
     * Updates texture parameters.
     * @private
     */
    /**
     * Updates texture parameters.
     * @private
     */
    private updateTexture;
    /**
     * Calculates geometric parameters of the scene.
     * @private
     */
    /**
     * Calculates geometric parameters of the scene.
     * @private
     */
    private calculateSceneParameters;
    /**
     * Rebuilds the scene.
     * @private
     */
    /**
     * Rebuilds the scene.
     * @private
     */
    private updateScene;
    /**
     * Places the camera on scene.
     * @private
     */
    /**
     * Places the camera on scene.
     * @private
     */
    private updateCamera;
    /**
     * Initializes callbacks. (For now only onResize)
     * @private
     */
    /**
     * Initializes callbacks. (For now only onResize)
     * @private
     */
    private initCallbacks;
    /**
     * Updates label positions and visibility.
     * @private
     */
    /**
     * Updates label positions and visibility.
     * @private
     */
    private updateLabelPositions;
}
export { Label, PanoramaViewer, IController, SimpleController, MouseController };
