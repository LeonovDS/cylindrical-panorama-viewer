import { Vector2 } from "three";

class Label {
    public position: Vector2;
    public root: HTMLElement;

    constructor(x: number, y: number, label: HTMLElement) {
        this.position = new Vector2(x, y);

        this.root = document.createElement('div');
        this.root.style.position = 'absolute';
        this.root.appendChild(label);
    }
}

export {Label};
