import {
  ExtendedModel,
  type ModelCreationData,
  model,
  tProp,
  types,
} from "mobx-keystone";
import { Layer } from "../Layer";
import { computed } from "mobx";
import { yjsAdapterSnapshotProcessor } from "../yjsAdapter/yjsAdapter";
import { cssAttributesAsCSS } from "../../cssAttributesAsCSS";
import { htmlToImage } from "@/editor/util/drawHtml";
interface Word {
  text: string;
  start: number;
  end: number;
  confidence: number;
}

interface Segment {
  start: number;
  end: number;
  text: string;
  confidence: number;
  words: Word[];
}

interface Caption {
  text: string;
  segments: Segment[];
  language: string;
}

@model("ef/CaptionLayer")
export class CaptionLayer extends ExtendedModel(
  Layer,
  {
    // captionData: prop<Caption | null>(null),
    rawCaptionData: tProp(types.maybe(types.string)),
    activeWordColor: tProp(types.maybe(types.string), "white"),
    wordColor: tProp(types.maybe(types.string), "black"),
    activeWordBackgroundColor: tProp(types.maybe(types.string), "black"),
    wordBackgroundColor: tProp(types.maybe(types.string), "white"),
  },
  yjsAdapterSnapshotProcessor,
) {
  iconName = "subtitles";

  @computed
  get captionData(): Caption | undefined {
    if (this.rawCaptionData === undefined) {
      return undefined;
    }
    return JSON.parse(this.rawCaptionData);
  }

  static async createFromFile(
    file: File,
    props: ModelCreationData<CaptionLayer> = {},
  ): Promise<CaptionLayer> {
    const srcUrl = URL.createObjectURL(file);
    return await CaptionLayer.createFromURL(srcUrl, props);
  }

  static async createFromURL(
    url: string,
    props: ModelCreationData<CaptionLayer> = {},
  ): Promise<CaptionLayer> {
    const request = await fetch(url);
    const captions: Caption = await request.json();
    const layer = new CaptionLayer({
      ...props,
      rawCaptionData: JSON.stringify(captions),
      intrinsicDurationMs:
        captions.segments[captions.segments.length - 1].end * 1000,
    });
    return layer;
  }

  @computed
  get currentSegment(): Segment | null {
    return (
      this.captionData?.segments.find(
        (segment) =>
          segment.start * 1000 <= this.trimAdjustedCurrentTimeMs &&
          segment.end * 1000 >= this.trimAdjustedCurrentTimeMs,
      ) ?? null
    );
  }

  isCurrentWord(word: Word): boolean {
    return (
      word.start * 1000 <= this.trimAdjustedCurrentTimeMs &&
      word.end * 1000 >= this.trimAdjustedCurrentTimeMs &&
      this.trimAdjustedCurrentTimeMs !== this.durationMs
    );
  }

  get activeWordCSS(): React.CSSProperties {
    return {
      color: this.activeWordColor,
      backgroundColor: this.activeWordBackgroundColor,
      padding: "2px",
      fontSize: "2rem",
    };
  }

  get wordCSS(): React.CSSProperties {
    return {
      color: this.wordColor,
      backgroundColor: this.wordBackgroundColor,
      padding: "2px",
      fontSize: "2rem",
    };
  }

  @computed
  get htmlToImageContent(): string {
    const html = String.raw;
    return html`<div>
      ${this.currentSegment?.words
        .map((word) => {
          const current = this.isCurrentWord(word);
          return html`<span
            style="${cssAttributesAsCSS(
              current ? this.activeWordCSS : this.wordCSS,
            )}"
          >
            ${word.text}
          </span>`;
        })
        .join(" ")}
    </div>`;
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
