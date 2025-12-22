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
    // Skip setting currentTimeMs for timegroup children - they compute ownCurrentTimeMs
    // from the root timegroup via EFTemporal. Setting it directly causes an infinite loop
    // because the @property decorator on currentTime triggers reactive updates.
    if ('mode' in this.child && 'isRootTimegroup' in this.child) {
      // Child is a timegroup - just request update, don't set currentTimeMs
      this.child.requestUpdate();
      return;
    }

    this.child.requestUpdate();
    const newChildTimeMs =
      this.host.currentTimeMs - (this.child.startTimeMs ?? 0);
    this.child.currentTimeMs = newChildTimeMs;
  }
}
