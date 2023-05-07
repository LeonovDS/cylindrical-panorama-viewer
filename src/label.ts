import {Vector2} from "three";

/**
 * Class for a label placed on panorama surface
 */
class Label {
  /**
   * Position of center of the label.
   */
  public position: Vector2;
  /**
   * Root element for label
   */
  public root: HTMLElement;

  /**
   *
   * @param x X coordinate of label. Must be between 0 and 1.
   * @param y Y coordinate of label. Must be between -1 (bottom) and 1 (top).
   * @param label
   */
  constructor(x: number, y: number, label: HTMLElement) {
    this.position = new Vector2(x, y);

    this.root = document.createElement('div');
    this.root.style.position = 'absolute';
    this.root.appendChild(label);
  }
}

export {Label};
