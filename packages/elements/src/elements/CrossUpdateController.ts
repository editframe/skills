import type {
  LitElement,
  ReactiveController,
  ReactiveControllerHost,
} from "lit";

export class CrossUpdateController implements ReactiveController {
  constructor(
    private host: ReactiveControllerHost,
    private target: LitElement,
  ) {
    this.host.addController(this);
  }

  hostUpdate(): void {
    this.target.requestUpdate();
  }

  remove(): void {
    this.host.removeController(this);
  }
}
