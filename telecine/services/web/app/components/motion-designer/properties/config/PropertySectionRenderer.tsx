import React from "react";
import type { ElementNode } from "~/lib/motion-designer/types";
import type { PropertySectionConfig, PropertyFieldConfig } from "./types";
import { PropertySection } from "../controls/PropertySection";
import { NumberInput } from "../controls/NumberInput";
import { SelectInput } from "../controls/SelectInput";
import { CheckboxInput } from "../controls/CheckboxInput";
import { ColorInput } from "../controls/ColorInput";
import { SpacingInput } from "../controls/SpacingInput";
import { PaddingInput } from "../controls/PaddingInput";
import { SliderInput } from "../controls/SliderInput";
import { IconButtonGroup } from "../controls/IconButtonGroup";
import { AlignmentGrid } from "../controls/AlignmentGrid";
import { PositionInput } from "../controls/PositionInput";
import { DimensionsInput } from "../controls/DimensionsInput";
import { VideoSizePresetPicker } from "../controls/VideoSizePresetPicker";
import { InlineInputs } from "../controls/InlineInputs";
import { LayoutTypeSelector } from "../controls/LayoutTypeSelector";
import { AspectRatioScalingControl } from "../controls/AspectRatioScalingControl";
import { GridLayoutControls } from "../controls/GridLayoutControls";
import { LayoutDirectionSelector } from "../controls/LayoutDirectionSelector";
import { SizeInput } from "../controls/SizeInput";
import { TimegroupSizeInput } from "../controls/TimegroupSizeInput";
import { ContainerAlignmentControl } from "../controls/ContainerAlignmentControl";
import { getNestedValue, setNestedValue } from "./propertyHelpers";

interface PropertySectionRendererProps {
  sections: PropertySectionConfig[];
  element: ElementNode;
  state: { composition: { rootTimegroupIds: string[] } };
  onUpdate: (updates: Partial<ElementNode["props"]>) => void;
}

export function PropertySectionRenderer({
  sections,
  element,
  state,
  onUpdate,
}: PropertySectionRendererProps) {
  const visibleSections = sections.filter(
    (section) => !section.visible || section.visible(element, state)
  );

  return (
    <>
      {visibleSections.map((section) => (
        <PropertySection
          key={section.id}
          title={section.title}
          defaultExpanded={section.defaultExpanded}
          icon={section.icon}
        >
          {section.fields
            .filter((field) => {
              if (field.type === "alignment-grid" || field.type === "inline-inputs") {
                return !field.visible || field.visible(element, state);
              }
              return !field.visible || field.visible(element, state);
            })
            .map((field, index) => {
              const key = field.type === "alignment-grid" || field.type === "inline-inputs"
                ? `${section.id}-${field.type}-${index}`
                : `${section.id}-${field.propPath}-${index}`;
              return (
                <PropertyFieldRenderer
                  key={key}
                  field={field}
                  element={element}
                  onUpdate={onUpdate}
                />
              );
            })}
        </PropertySection>
      ))}
    </>
  );
}

interface PropertyFieldRendererProps {
  field: PropertyFieldConfig;
  element: ElementNode;
  onUpdate: (updates: Partial<ElementNode["props"]>) => void;
}

function PropertyFieldRenderer({
  field,
  element,
  onUpdate,
}: PropertyFieldRendererProps) {
  const propPath = field.type === "alignment-grid" 
    ? field.justifyPropPath 
    : field.type === "inline-inputs"
    ? ""
    : field.propPath;
  const value = propPath ? getNestedValue(element.props, propPath) : undefined;

  const handleChange = (newValue: any) => {
    if (propPath) {
      // For "size" prop, we need to replace it completely, not merge
      // because it can be either legacy format {width, height} or new format {widthMode, widthValue, ...}
      if (propPath === "size") {
        onUpdate({ size: newValue });
      } else {
        const updates = setNestedValue({}, propPath, newValue);
        onUpdate(updates);
      }
    }
  };

  switch (field.type) {
    case "number":
      return (
        <NumberInput
          label={field.label}
          value={value}
          onChange={handleChange}
          unit={field.unit}
          placeholder={field.placeholder}
          min={field.min}
          max={field.max}
          step={field.step}
        />
      );

    case "select":
      return (
        <SelectInput
          label={field.label}
          value={value}
          onChange={handleChange}
          options={field.options}
        />
      );

    case "checkbox":
      return (
        <CheckboxInput
          label={field.label}
          checked={value}
          onChange={handleChange}
        />
      );

    case "color":
      return (
        <ColorInput
          label={field.label}
          value={value}
          onChange={handleChange}
        />
      );

    case "spacing":
      return (
        <SpacingInput
          label={field.label}
          value={value}
          onChange={handleChange}
        />
      );

    case "padding":
      return (
        <PaddingInput
          label={field.label}
          value={value}
          onChange={handleChange}
        />
      );

    case "text":
      return (
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
            {field.label}
          </label>
          {field.rows ? (
            <textarea
              value={value ?? ""}
              onChange={(e) => handleChange(e.target.value)}
              className="flex-1 px-1.5 py-1 text-[10px] leading-relaxed bg-gray-900/50 border border-gray-700/30 rounded-sm text-white placeholder:text-gray-700 hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors resize-none"
              placeholder={field.placeholder}
              rows={field.rows}
            />
          ) : (
            <input
              type="text"
              value={value ?? ""}
              onChange={(e) => handleChange(e.target.value)}
              className="flex-1 h-5 px-1.5 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white placeholder:text-gray-700 hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors"
              placeholder={field.placeholder}
            />
          )}
        </div>
      );

    case "number-grid":
      return (
        <div className="flex items-center gap-1">
          <label className="text-[10px] text-gray-500 w-10 font-normal flex-shrink-0">
            {field.label}
          </label>
          <div className="flex-1 grid grid-cols-3 gap-px">
            {field.fields.map((gridField) => {
              const gridValue = value?.[gridField.key] ?? 0;
              return (
                <input
                  key={gridField.key}
                  type="number"
                  value={gridValue}
                  onChange={(e) => {
                    const newGridValue = {
                      ...value,
                      [gridField.key]: Number(e.target.value),
                    };
                    handleChange(newGridValue);
                  }}
                  className="h-5 px-1 text-[10px] bg-gray-900/50 border border-gray-700/30 rounded-sm text-white text-center placeholder:text-gray-700 hover:border-gray-600/50 focus:border-blue-500/50 focus:bg-gray-900 focus:outline-none transition-colors"
                  placeholder={gridField.placeholder}
                />
              );
            })}
          </div>
        </div>
      );

    case "slider":
      return (
        <SliderInput
          label={field.label}
          value={value}
          onChange={handleChange}
          min={field.min}
          max={field.max}
          step={field.step}
          displayMultiplier={field.displayMultiplier}
          unit={field.unit}
        />
      );

    case "icon-button-group":
      return (
        <IconButtonGroup
          label={field.label}
          options={field.options}
          value={value}
          onChange={handleChange}
        />
      );

    case "alignment-grid":
      const justifyValue = getNestedValue(element.props, field.justifyPropPath);
      const alignValue = getNestedValue(element.props, field.alignPropPath);
      const flexDirectionValue = element.props.flexDirection;
      return (
        <AlignmentGrid
          label={field.label}
          justifyContent={justifyValue}
          alignItems={alignValue}
          flexDirection={flexDirectionValue}
          onJustifyChange={(newValue) => {
            const updates = setNestedValue({}, field.justifyPropPath, newValue);
            onUpdate(updates);
          }}
          onAlignChange={(newValue) => {
            const updates = setNestedValue({}, field.alignPropPath, newValue);
            onUpdate(updates);
          }}
        />
      );

    case "position":
      return (
        <PositionInput
          label={field.label}
          x={value?.x}
          y={value?.y}
          onChange={handleChange}
        />
      );

    case "dimensions":
      return (
        <DimensionsInput
          label={field.label}
          size={value}
          onChange={handleChange}
        />
      );

    case "video-size-preset":
      return (
        <VideoSizePresetPicker
          label={field.label}
          size={value}
          onChange={handleChange}
        />
      );

    case "inline-inputs":
      return (
        <InlineInputs
          inputs={field.inputs.map((input) => ({
            ...input,
            value: getNestedValue(element.props, input.propPath),
          }))}
          onChange={(propPath, value) => {
            const updates = setNestedValue({}, propPath, value);
            onUpdate(updates);
          }}
        />
      );

    case "layout-type": {
      const displayValue = element.props.display;
      const layoutFlexDirection = element.props.flexDirection;
      return (
        <LayoutTypeSelector
          label={field.label}
          display={displayValue}
          flexDirection={layoutFlexDirection}
          onChange={(display, flexDirection) => {
            const updates: Partial<ElementNode["props"]> = { display };
            if (flexDirection !== undefined) {
              updates.flexDirection = flexDirection;
            } else if (display !== "flex" && display !== "grid") {
              // Clear flexDirection when switching to block
              updates.flexDirection = undefined;
            }
            onUpdate(updates);
          }}
        />
      );
    }

    case "aspect-ratio-scaling":
      return (
        <AspectRatioScalingControl
          label={field.label}
          value={value}
          onChange={handleChange}
        />
      );

    case "grid-layout":
      const columnsValue = element.props.gridColumns;
      const rowsValue = element.props.gridRows;
      const gapValue = element.props.gridGap;
      return (
        <GridLayoutControls
          columns={columnsValue}
          rows={rowsValue}
          gap={gapValue}
          onColumnsChange={(value) => {
            const updates = setNestedValue({}, "gridColumns", value);
            onUpdate(updates);
          }}
          onRowsChange={(value) => {
            const updates = setNestedValue({}, "gridRows", value);
            onUpdate(updates);
          }}
          onGapChange={(value) => {
            const updates = setNestedValue({}, "gridGap", value);
            onUpdate(updates);
          }}
        />
      );

    case "layout-direction":
      return (
        <LayoutDirectionSelector
          label={field.label}
          value={value}
          onChange={handleChange}
        />
      );

    case "size": {
      // Handle both legacy size format and simple width/height props
      const sizeValue = value;
      let width: number | undefined;
      let height: number | undefined;
      
      if (sizeValue) {
        if (typeof sizeValue === "object" && "width" in sizeValue && "height" in sizeValue) {
          // Legacy format: { width: number, height: number }
          // Only use if width/height are not 0 (0 means "not set" in our system)
          if (sizeValue.width !== 0) width = sizeValue.width;
          if (sizeValue.height !== 0) height = sizeValue.height;
        } else if (typeof sizeValue === "object" && "widthMode" in sizeValue) {
          // New format with modes - extract fixed values or default
          const legacySize = sizeValue as any;
          if (legacySize.widthMode === "fixed" && typeof legacySize.widthValue === "number" && legacySize.widthValue !== 0) {
            width = legacySize.widthValue;
          }
          if (legacySize.heightMode === "fixed" && typeof legacySize.heightValue === "number" && legacySize.heightValue !== 0) {
            height = legacySize.heightValue;
          }
        }
      }
      
      // Fallback to direct props if size object doesn't have values
      // Only use if not 0 (0 means "not set")
      if (width === undefined && element.props.width !== undefined && element.props.width !== 0) {
        width = element.props.width;
      }
      if (height === undefined && element.props.height !== undefined && element.props.height !== 0) {
        height = element.props.height;
      }
      
      return (
        <SizeInput
          label={field.label}
          width={width}
          height={height}
          onChange={(newWidth, newHeight) => {
            // Update both legacy size format and direct props for compatibility
            // Use 0 to represent "not set" for backward compatibility, or undefined for new format
            onUpdate({
              size: { 
                width: newWidth ?? 0, 
                height: newHeight ?? 0 
              },
              width: newWidth,
              height: newHeight,
            });
          }}
        />
      );
    }

    case "timegroup-size": {
      // Handle both legacy size format and simple width/height props
      const sizeValue = value;
      let width: number | undefined;
      let height: number | undefined;
      
      if (sizeValue) {
        if (typeof sizeValue === "object" && "width" in sizeValue && "height" in sizeValue) {
          // Legacy format: { width: number, height: number }
          width = sizeValue.width;
          height = sizeValue.height;
        } else if (typeof sizeValue === "object" && "widthMode" in sizeValue) {
          // New format with modes - extract fixed values or default
          const legacySize = sizeValue as any;
          if (legacySize.widthMode === "fixed" && typeof legacySize.widthValue === "number") {
            width = legacySize.widthValue;
          }
          if (legacySize.heightMode === "fixed" && typeof legacySize.heightValue === "number") {
            height = legacySize.heightValue;
          }
        }
      }
      
      // Fallback to direct props if size object doesn't have values
      if (width === undefined) width = element.props.width;
      if (height === undefined) height = element.props.height;
      
      return (
        <TimegroupSizeInput
          label={field.label}
          width={width}
          height={height}
          onChange={(newWidth, newHeight) => {
            // Update both legacy size format and direct props for compatibility
            onUpdate({
              size: { width: newWidth, height: newHeight },
              width: newWidth,
              height: newHeight,
            });
          }}
        />
      );
    }

    case "container-alignment": {
      const justifyValue = getNestedValue(element.props, field.justifyPropPath);
      const alignValue = getNestedValue(element.props, field.alignPropPath);
      return (
        <ContainerAlignmentControl
          label={field.label}
          justifyItems={justifyValue}
          alignItems={alignValue}
          onChange={(justifyItems, alignItems) => {
            const updates = {
              ...setNestedValue({}, field.justifyPropPath, justifyItems),
              ...setNestedValue({}, field.alignPropPath, alignItems),
            };
            onUpdate(updates);
          }}
        />
      );
    }

    default:
      return null;
  }
}

