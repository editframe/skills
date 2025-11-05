// TODO: consider this as a pixel value or a percentage :crying-cat:
export interface CropDefinition {
  /** Crop in from top as a % */
  topPercent?: number;
  /** Crop in from bottom as a % */
  bottomPercent?: number;
  /** Crop in from left as a % */
  leftPercent?: number;
  /** Crop in from right as a % */
  rightPercent?: number;
}
export interface TrimDefinition {
  /** Trim from the start as a % */
  startMs?: number;
  /** Trim from the end as a % */
  endMs?: number;
}
export type LengthTypes = "px" | "em" | "rem" | "vh" | "vw" | "%" | undefined;
export interface Length {
  /** Length value */
  value: number;
  /** Length type */
  type: LengthTypes;
}
export interface BlurFilter {
  /** Filter name */
  name: "blur";
  /** Filter value as length */
  value: Length;
}
export interface BrightnessFilter {
  /** Filter name */
  name: "brightness";
  /** Filter value as percent integer */
  value: number;
}
export interface ContrastFilter {
  /** Filter name */
  name: "contrast";
  /** Filter value as percent integer */
  value: number;
}
export interface DropShadowFilter {
  /** Filter name */
  name: "drop-shadow";
  inset: boolean;
  offsetX: Length;
  offsetY: Length;
  blurRadius: Length;
  spreadRadius: Length;
  color: string;
}
export interface GrayscaleFilter {
  /** Filter name */
  name: "grayscale";
  /** Filter value */
  value: number;
}
export interface HueRotateFilter {
  /** Filter name */
  name: "hue-rotate";
  /** Filter value as degrees angle */
  value: number;
}
export interface InvertFilter {
  /** Filter name */
  name: "invert";
  /** Filter value as percent integer */
  value: number;
}
export interface OpacityFilter {
  /** Filter name */
  name: "opacity";
  /** Filter value as percent integer */
  value: number;
}
export interface SaturateFilter {
  /** Filter name */
  name: "saturate";
  /** Filter value as percent integer */
  value: number;
}
export interface SepiaFilter {
  /** Filter name */
  name: "sepia";
  /** Filter value as percent integer */
  value: number;
}

export enum SizeMode {
  /**
   * The size of the layer is a fixed value.
   */
  Fixed = "fixed",
  /**
   * The size of the layer will expand to fill the size of it's immediate parent.
   */
  Fill = "fill",
  /**
   * The size of the layer will be the size of the source, but scaled to fit the size of it's immediate parent.
   */
  Fit = "fit",
}

export enum TimeMode {
  /**
   * The duration of the layer is a fixed value.
   */
  Fixed = "fixed",

  /**
   * The duration of the layer will expand to fill the duration of it's immediate parent.
   *
   * If the layer is the root layer, the the time mode will behave as if `TimeMode.Fixed` was used.
   */
  Fill = "fill",
}

export enum ContainerTimeMode {
  /**
   * The children of the container will be lined up in a single sequence.
   *
   * The duration of the container will be the sum of the duration of the children.
   */
  Sequence = "sequence",
  /**
   * The children of the container are free-floating.
   *
   * The duration of the container will be the greatest end time of all the children.
   */
  Fit = "fit",
  /**
   * The children of the container are free-floating.
   *
   * The duration of the container is a fixed value.
   */
  Fixed = "fixed",
}

export enum PointerModes {
  Pointer = "Pointer",
  Text = "Text",
  TimeGroup = "TimeGroup",
}
