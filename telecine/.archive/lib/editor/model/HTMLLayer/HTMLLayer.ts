import { computed, override } from "mobx";
import { ExtendedModel, model, modelAction, tProp, types } from "mobx-keystone";
import { Layer } from "../Layer";
import { yjsAdapterSnapshotProcessor } from "../yjsAdapter/yjsAdapter";

export const domParser = new DOMParser();

@model("ef/HTMLLayer")
export class HTMLLayer extends ExtendedModel(
  Layer,
  {
    html: tProp(types.string, ""),
  },
  yjsAdapterSnapshotProcessor,
) {
  iconName = "code";
  @modelAction
  setHTML(html: string): void {
    try {
      domParser.parseFromString(html, "text/html");
      this.html = html;
    } catch (error) {
      console.error("Could not parse html", error);
    }
  }

  @computed
  get parsedDOM(): HTMLElement {
    return domParser.parseFromString(this.html, "text/html").documentElement;
  }

  @override
  get oneLineTitle(): string {
    if (this.title !== undefined) {
      return this.title;
    }
    const textContent = this.parsedDOM.textContent?.replace(/\n/g, " ") ?? "";
    if (textContent.length > 0) {
      return textContent;
    }
    return `Untitled HTML Layer`;
  }
}
