import {toRange} from "./util";

// Default mouse speed
const DEFAULT_SPEED: number = 0.001;

/**
 * Interface for controller
 */
export interface IController {
  longitude: number;
}

/**
 * Simple controller implementation. Just sets longitude manually
 */
export class SimpleController implements IController {
  public longitude: number;
}

/**
 * Mouse controller for viewer. Supports mouse and touch events
 */
export class MouseController implements IController {
  // Element to which event listeners are attached
  public root: HTMLElement;

  // Whether mouse events are enabled
  private _isMouseEnabled: boolean;
  // Current rotation angle of panorama
  private _longitude: number;
  // Mouse speed
  private readonly _mouseSpeed: number;

  /**
   * Constructor
   * @param initialLongitude The initial rotation of panorama in radians
   * @param rootElement Element to which event listeners are attached
   * @param isMouseEnabled Whether mouse events are enabled
   * @param mouseSpeed Mouse speed
   */
  constructor(initialLongitude: number, rootElement: HTMLElement, isMouseEnabled: boolean = true, mouseSpeed: number = DEFAULT_SPEED) {
    this.root = rootElement;
    this._longitude = toRange(initialLongitude);
    this.isMouseEnabled = isMouseEnabled;
    this._mouseSpeed = mouseSpeed;
    console.log('MouseController constructor');
  }

  /**
   * Gets whether mouse events are enabled
   */
  public get isMouseEnabled(): boolean {
    return this._isMouseEnabled;
  }

  /**
   * Sets whether mouse events are enabled. Enables or disables event listeners when needed
   * @param value
   */
  public set isMouseEnabled(value: boolean) {
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
    } else {
      this.root.removeEventListener('mousedown', this.onMouseDown);
      this.root.removeEventListener('mouseup', this.onMouseUp);
      this.root.removeEventListener('mousemove', this.onMouseMove);
    }
  }

  /**
   * Gets current rotation angle
   */
  public get longitude(): number {
    return this._longitude;
  }

  /**
   * Sets current rotation angle
   * @param value
   */
  public set longitude(value: number) {
    this._longitude = toRange(value);
  }

  // Whether mouse button is pressed
  private isPressed: boolean = false;
  // Previous mouse x coordinate
  private prevPosition: number | null = null;

  private onMouseDown = (event: MouseEvent) => {
    this.isPressed = true;
    this.prevPosition = event.clientX;
  }

  private onMouseUp = (event: MouseEvent) => {
    this.isPressed = false;
    this.prevPosition = null;
  }

  private onMouseMove = (event: MouseEvent) => {
    if (this.isPressed) {
      this.longitude -= (event.clientX - this.prevPosition) * this._mouseSpeed;
      this.longitude = toRange(this.longitude);
      this.prevPosition = event.clientX;
    }
  }
}
