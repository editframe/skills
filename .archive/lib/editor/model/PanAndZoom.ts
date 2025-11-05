import { computed, observable } from "mobx";
import { Model, model, modelAction } from "mobx-keystone";

@model("gui/PanAndZoom")
export class PanAndZoom extends Model({}) {
  static LOCAL_STORAGE_KEY = "gui/panAndZoom";
  @observable
  zoom: number = 1;

  @observable
  translateX: number = 0;

  @observable
  translateY: number = 0;

  constructor(attrs: any) {
    super(attrs);
    try {
      const loadedString = localStorage.getItem(PanAndZoom.LOCAL_STORAGE_KEY);
      if (loadedString === null) {
        return;
      }
      this.setTransform(JSON.parse(loadedString));
    } catch (error) {
      console.info(
        "Failed to set pan and zoom from local storage. Not a critical error."
      );
    }
  }

  @modelAction
  propagateWheelEvent(
    event: WheelEvent,
    transformedElement: HTMLElement
  ): void {
    if (event.ctrlKey) {
      const rect = transformedElement.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      // map x and y into the canvas coordinate space
      const originalCanvasX = x / this.zoom;
      const originalCanvasY = y / this.zoom;

      // TODO this gets weird when scaling down below the limit 0.1
      const delta = parseFloat((-event.deltaY / 100).toFixed(2));

      const newCanvasX = originalCanvasX * delta + originalCanvasX;
      const newCanvasY = originalCanvasY * delta + originalCanvasY;
      const newTranslateX = this.translateX + originalCanvasX - newCanvasX;
      const newTranslateY = this.translateY + originalCanvasY - newCanvasY;
      const newZoom = Math.max(0.1, this.zoom + delta);
      if (newZoom === this.zoom) {
        // Bail out if zoom doesn't change. Otherwise the translation will take the zoom center off-center
        return;
      }

      this.setTransform({
        zoom: newZoom,
        translateX: newTranslateX,
        translateY: newTranslateY,
      });
    } else {
      this.setTransform({
        zoom: this.zoom,
        translateX: this.translateX - event.deltaX,
        translateY: this.translateY - event.deltaY,
      });
    }
  }

  @modelAction
  setTransform(transform: {
    zoom?: number;
    translateX?: number;
    translateY?: number;
  }): void {
    if (transform.zoom !== undefined) {
      this.zoom = transform.zoom;
    }
    if (transform.translateX !== undefined) {
      this.translateX = transform.translateX;
    }
    if (transform.translateY !== undefined) {
      this.translateY = transform.translateY;
    }
    localStorage.setItem(
      PanAndZoom.LOCAL_STORAGE_KEY,
      JSON.stringify(transform)
    );
  }

  @computed
  get cssTransform(): string {
    return `translate(${this.translateX}px, ${this.translateY}px) scale(${this.zoom})`;
  }
}
