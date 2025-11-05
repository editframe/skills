import type { LitElement, ReactiveController } from "lit";
import type { EFTimegroup } from "./EFTimegroup.js";

export class TimegroupController implements ReactiveController {
  constructor(
    private host: EFTimegroup,
    private child: { currentTimeMs: number; startTimeMs?: number } & LitElement,
  ) {
    this.host.addController(this);
  }

  remove() {
    this.host.removeController(this);
  }

  hostDisconnected(): void {
    this.host.removeController(this);
  }

  hostUpdated(): void {
    this.child.requestUpdate();
    const newChildTimeMs =
      this.host.currentTimeMs - (this.child.startTimeMs ?? 0);
    this.child.currentTimeMs = newChildTimeMs;
  }
}
