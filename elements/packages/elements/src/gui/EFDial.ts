import { css, html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { styleMap } from "lit/directives/style-map.js";

export interface DialChangeDetail {
  value: number;
}

@customElement("ef-dial")
export class EFDial extends LitElement {
  @property({ type: Number })
  set value(newValue: number) {
    // Normalize to 0-360 range
    newValue = newValue % 360;
    if (newValue < 0) {
      newValue += 360;
    }
    // Limit to 6 significant digits
    newValue = Number.parseFloat(newValue.toPrecision(6));

    const oldValue = this._value;
    this._value = newValue;
    this.requestUpdate("value", oldValue);
  }

  get value() {
    return this._value;
  }

  private _value = 0;

  @state()
  private isDragging = false;

  private dragStartAngle = 0;
  private dragStartValue = 0;

  static styles = css`
    :host {
        display: inline-block;
        width: 200px; /* Default size, can be overridden by CSS */
        height: 200px; /* Default size, can be overridden by CSS */
        --dial-stroke: var(--ef-color-border);
        --dial-tick: var(--ef-color-border-subtle);
    }
    .dial-container {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background-color: var(--ef-color-bg-panel);
      border: 2px solid var(--ef-color-border);
    }
    .handle {
        position: absolute;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid var(--ef-color-primary);
        background-color: var(--ef-color-bg-elevated);
        cursor: grab;
    }
    .handle.dragging {
        background-color: var(--ef-color-primary);
        cursor: grabbing;
    }
    .center-text {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: var(--ef-color-bg-elevated);
        border: 1px solid var(--ef-color-border);
        padding: 2px 4px;
        border-radius: 4px;
        font-family: monospace;
        font-size: 12px;
        color: var(--ef-color-text);
    }
  `;

  private getAngleFromPoint(clientX: number, clientY: number, rect: DOMRect) {
    const center = this.clientWidth / 2;
    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;
    return Math.atan2(y, x);
  }

  private handlePointerDown(e: PointerEvent) {
    e.preventDefault();
    this.isDragging = true;
    const rect = this.getBoundingClientRect();
    this.dragStartAngle = this.getAngleFromPoint(e.clientX, e.clientY, rect);
    this.dragStartValue = this.value;
    this.setPointerCapture(e.pointerId);
    this.addEventListener("pointermove", this.handlePointerMove, {
      passive: false,
    });
    this.addEventListener("pointerup", this.handlePointerUp, {
      passive: false,
    });
  }

  private handlePointerMove(e: PointerEvent) {
    if (!this.isDragging) return;

    e.preventDefault();
    const rect = this.getBoundingClientRect();
    const currentAngle = this.getAngleFromPoint(e.clientX, e.clientY, rect);
    const angleDelta = currentAngle - this.dragStartAngle;

    let newValue = this.dragStartValue + (angleDelta * 180) / Math.PI;

    if (e.shiftKey) {
      newValue = Math.round(newValue / 15) * 15;
    }

    // Normalize to 0-360 range
    newValue = newValue % 360;
    if (newValue < 0) {
      newValue += 360;
    }

    // Limit to 6 significant digits
    newValue = Number.parseFloat(newValue.toPrecision(6));

    this.value = newValue;
    this.dispatchEvent(
      new CustomEvent<DialChangeDetail>("change", {
        detail: { value: this.value },
      }),
    );
  }

  private handlePointerUp(e: PointerEvent) {
    e.preventDefault();
    this.isDragging = false;
    this.releasePointerCapture(e.pointerId);
    this.removeEventListener("pointermove", this.handlePointerMove);
    this.removeEventListener("pointerup", this.handlePointerUp);
  }

  render() {
    const center = this.clientWidth / 2;
    const radius = center - 20;
    const handleAngle = (this.value * Math.PI) / 180;
    const handleX = center + Math.cos(handleAngle) * radius;
    const handleY = center + Math.sin(handleAngle) * radius;

    const handleStyles = {
      left: `${handleX - 8}px`,
      top: `${handleY - 8}px`,
    };

    return html`
      <div class="dial-container" @pointerdown=${this.handlePointerDown}>
        <svg class="absolute inset-0 w-full h-full">
          <circle
            cx=${center}
            cy=${center}
            r=${radius}
            fill="none"
            stroke="var(--dial-stroke)"
            stroke-width="2"
            stroke-dasharray="4 4"
          />
          ${[0, 90, 180, 270].map((deg) => {
            const angle = (deg * Math.PI) / 180;
            const x1 = center + Math.cos(angle) * (radius - 8);
            const y1 = center + Math.sin(angle) * (radius - 8);
            const x2 = center + Math.cos(angle) * (radius + 8);
            const y2 = center + Math.sin(angle) * (radius + 8);
            return html`<line x1=${x1} y1=${y1} x2=${x2} y2=${y2} stroke="var(--dial-tick)" stroke-width="2" />`;
          })}
        </svg>
        <div class="handle ${this.isDragging ? "dragging" : ""}" style=${styleMap(handleStyles)}></div>
        <div class="center-text">${this.value.toFixed(0)}°</div>
      </div>
    `;
  }
}
