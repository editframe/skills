import { Task } from "@lit/task";
import { html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { createRef, ref } from "lit/directives/ref.js";
import { EF_INTERACTIVE } from "../EF_INTERACTIVE.js";
import { TWMixin } from "../gui/TWMixin.js";
import { EFMedia } from "./EFMedia.js";

@customElement("ef-audio")
export class EFAudio extends TWMixin(EFMedia) {
  // HACK: This dummy property is needed to activate Lit's property processing system
  // Without it, inherited properties from EFMedia don't work correctly
  // TODO: Remove this as soon as we have an audio-specific property that needs @property
  @property({ type: Boolean, attribute: "dummy-property" })
  // @ts-expect-error - This is a hack to activate Lit's property processing system
  // biome-ignore lint/correctness/noUnusedPrivateClassMembers: Used to activate Lit's property processing
  private _propertyHack = false;

  audioElementRef = createRef<HTMLAudioElement>();

  render() {
    return html`<audio ${ref(this.audioElementRef)}></audio>`;
  }

  frameTask = new Task(this, {
    autoRun: EF_INTERACTIVE,
    args: () =>
      [
        this.audioBufferTask.status,
        this.audioSeekTask.status,
        this.audioSegmentFetchTask.status,
        this.mediaEngineTask.status,
      ] as const,
    task: async () => {
      await this.mediaEngineTask.taskComplete;
      await this.audioSegmentFetchTask.taskComplete;
      await this.audioSeekTask.taskComplete;
      await this.audioBufferTask.taskComplete;
      this.rootTimegroup?.requestUpdate();
    },
  });

  /**
   * Legacy getter for fragment index task (maps to audioSegmentIdTask)
   * Still used by EFCaptions
   */
  get fragmentIndexTask() {
    return this.audioSegmentIdTask;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ef-audio": EFAudio;
  }
}
