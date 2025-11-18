import type { ElementNode } from "~/lib/motion-designer/types";
import type React from "react";

export interface PropertySectionConfig {
  id: string;
  title: string;
  defaultExpanded?: boolean;
  icon?: React.ReactNode;
  visible?: (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) => boolean;
  fields: PropertyFieldConfig[];
}

export type PropertyFieldConfig =
  | NumberFieldConfig
  | SelectFieldConfig
  | CheckboxFieldConfig
  | ColorFieldConfig
  | SpacingFieldConfig
  | TextFieldConfig
  | NumberGridFieldConfig
  | SliderFieldConfig
  | IconButtonGroupFieldConfig
  | AlignmentGridFieldConfig
  | PositionFieldConfig
  | DimensionsFieldConfig
  | VideoSizePresetFieldConfig
  | InlineInputsFieldConfig
  | LayoutTypeFieldConfig
  | AspectRatioScalingFieldConfig
  | GridLayoutFieldConfig
  | LayoutDirectionFieldConfig
  | SizeFieldConfig
  | TimegroupSizeFieldConfig
  | ContainerAlignmentFieldConfig;

interface BaseFieldConfig {
  label: string;
  propPath: string;
  visible?: (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) => boolean;
}

export interface NumberFieldConfig extends BaseFieldConfig {
  type: "number";
  unit?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
}

export interface SelectFieldConfig extends BaseFieldConfig {
  type: "select";
  options: Array<{ value: string; label: string }>;
}

export interface CheckboxFieldConfig extends BaseFieldConfig {
  type: "checkbox";
}

export interface ColorFieldConfig extends BaseFieldConfig {
  type: "color";
}

export interface SpacingFieldConfig extends BaseFieldConfig {
  type: "spacing";
}

export interface TextFieldConfig extends BaseFieldConfig {
  type: "text";
  placeholder?: string;
  rows?: number;
}

export interface NumberGridFieldConfig extends BaseFieldConfig {
  type: "number-grid";
  fields: Array<{
    key: string;
    placeholder: string;
  }>;
}

export interface SliderFieldConfig extends BaseFieldConfig {
  type: "slider";
  min?: number;
  max?: number;
  step?: number;
  displayMultiplier?: number;
  unit?: string;
}

export interface IconButtonGroupFieldConfig extends BaseFieldConfig {
  type: "icon-button-group";
  options: Array<{
    value: string;
    icon: React.ReactNode;
    title: string;
  }>;
}

export interface AlignmentGridFieldConfig {
  type: "alignment-grid";
  label: string;
  justifyPropPath: string;
  alignPropPath: string;
  visible?: (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) => boolean;
}

export interface PositionFieldConfig extends BaseFieldConfig {
  type: "position";
}

export interface DimensionsFieldConfig extends BaseFieldConfig {
  type: "dimensions";
}

export interface VideoSizePresetFieldConfig extends BaseFieldConfig {
  type: "video-size-preset";
}

export interface InlineInputsFieldConfig {
  type: "inline-inputs";
  inputs: Array<{
    label: string;
    propPath: string;
    unit?: string;
    placeholder?: string;
    min?: number;
    max?: number;
    step?: number;
    type?: "number" | "slider";
    displayMultiplier?: number;
  }>;
  visible?: (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) => boolean;
}

export interface LayoutTypeFieldConfig {
  type: "layout-type";
  label: string;
  visible?: (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) => boolean;
}

export interface AspectRatioScalingFieldConfig extends BaseFieldConfig {
  type: "aspect-ratio-scaling";
}

export interface GridLayoutFieldConfig {
  type: "grid-layout";
  label: string;
  visible?: (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) => boolean;
}

export interface LayoutDirectionFieldConfig {
  type: "layout-direction";
  label: string;
  propPath: string;
  visible?: (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) => boolean;
}

export interface SizeFieldConfig extends BaseFieldConfig {
  type: "size";
}

export interface TimegroupSizeFieldConfig extends BaseFieldConfig {
  type: "timegroup-size";
}

export interface ContainerAlignmentFieldConfig {
  type: "container-alignment";
  label: string;
  justifyPropPath: string;
  alignPropPath: string;
  visible?: (element: ElementNode, state?: { composition: { rootTimegroupIds: string[] } }) => boolean;
}

