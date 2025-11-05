import { ExtendedModel, model, tProp, types, modelAction } from "mobx-keystone";
import { Layer } from "../Layer";
import { yjsAdapterSnapshotProcessor } from "../yjsAdapter/yjsAdapter";
import { computed, override } from "mobx";
import { cssAttributesAsCSS } from "../../cssAttributesAsCSS";
import { htmlToImage } from "@/editor/util/drawHtml";

enum TextAlign {
  Center = "center",
  Left = "left",
  Right = "right",
}
enum TextTransform {
  None = "none",
  Uppercase = "uppercase",
  Lowercase = "lowercase",
  Capitalize = "capitalize",
}

@model("ef/TextLayer")
export class TextLayer extends ExtendedModel(
  Layer,
  {
    text: tProp(types.string, ""),
    fontFamily: tProp(types.string, "Arial"),
    fontSize: tProp(types.number, 24),
    fontWeight: tProp(types.or(types.string, types.number), 400),
    textAlign: tProp(types.enum(TextAlign), TextAlign.Center),
    color: tProp(types.string, "#000000"),
    lineHeight: tProp(types.number, 1.2),
    padding: tProp(types.number, 0),
    backgroundColor: tProp(types.string, "transparent"),
    textTransform: tProp(types.enum(TextTransform), TextTransform.None),
    fontStyle: tProp(types.string, "normal"),
    textDecoration: tProp(types.or(types.string, types.number), "none"),
  },
  yjsAdapterSnapshotProcessor,
) {
  iconName = "edit_note";
  @computed get typographyCSS(): React.CSSProperties {
    return {
      fontFamily: this.fontFamily,
      fontSize: this.fontSize,
      color: this.color,
      zIndex: 100,
      backgroundColor: this.backgroundColor,
      padding: this.padding,
      textTransform: this.textTransform,
      textAlign: this.textAlign,
      lineHeight: this.lineHeight,
      fontWeight: this.fontWeight,
      fontStyle: this.fontStyle,
      textDecoration: this.textDecoration,
    };
  }

  @computed get textContent(): string {
    return this.text;
  }

  @modelAction setTextContent(text: string): void {
    this.text = text;
  }

  @modelAction setTextStyle(style: React.CSSProperties): void {
    if (style.fontStyle !== undefined) this.fontStyle = style.fontStyle;
    if (style.textDecoration !== undefined)
      this.textDecoration = style.textDecoration;
    if (style.fontWeight !== undefined) this.fontWeight = style.fontWeight;
  }

  @override
  get oneLineTitle(): string {
    if (this.text.length > 0) {
      return this.text;
    } else {
      return `(blank text layer)`;
    }
  }

  @computed
  get htmlToImageContent(): string {
    return `<div><p style="${cssAttributesAsCSS(this.typographyCSS)}">${
      this.text
    }</p></div>`;
  }

  htmlToImageCache: HTMLImageElement | null = null;
  lastCachedText: string | null = null;

  async renderToCanvas(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  ): Promise<void> {
    if (
      this.htmlToImageContent === this.lastCachedText &&
      this.htmlToImageCache !== null
    ) {
      ctx.drawImage(this.htmlToImageCache, 0, 0);
      return;
    }

    this.lastCachedText = this.htmlToImageContent;
    this.htmlToImageCache = await htmlToImage(this.htmlToImageContent, []);

    ctx.drawImage(this.htmlToImageCache, 0, 0);
  }
}
