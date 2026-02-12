import React from "react";
import { describe, test, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DimensionsInput } from "./DimensionsInput";
import type { ElementSize } from "~/lib/motion-designer/sizingTypes";
import { SIZING_MODE_LABELS } from "~/lib/motion-designer/sizingTypes";

describe("DimensionsInput", () => {
  describe("fraction mode UI", () => {
    test("fraction mode shows ratio selector when widthMode is fraction", () => {
      const size: ElementSize = {
        widthMode: "fraction",
        widthValue: { numerator: 1, denominator: 2 },
        heightMode: "fixed",
        heightValue: 100,
      };

      const onChange = () => {};

      render(<DimensionsInput label="Size" size={size} onChange={onChange} />);

      const ratioSelector = screen.getByRole("combobox") as HTMLSelectElement;
      expect(ratioSelector).toBeDefined();
      expect(ratioSelector.value).toBe("1/2");
      expect(ratioSelector.tagName).toBe("SELECT");
    });

    test("fraction mode hides pixel input when widthMode is fraction", () => {
      const size: ElementSize = {
        widthMode: "fraction",
        widthValue: { numerator: 1, denominator: 2 },
        heightMode: "fixed",
        heightValue: 100,
      };

      const onChange = () => {};

      render(<DimensionsInput label="Size" size={size} onChange={onChange} />);

      const spinbuttons = screen.queryAllByRole("spinbutton");
      expect(spinbuttons).toHaveLength(1);
    });

    test("selected ratio displays correctly in selector", () => {
      const size: ElementSize = {
        widthMode: "fraction",
        widthValue: { numerator: 1, denominator: 3 },
        heightMode: "fixed",
        heightValue: 100,
      };

      const onChange = () => {};

      render(<DimensionsInput label="Size" size={size} onChange={onChange} />);

      const ratioSelector = screen.getByRole("combobox") as HTMLSelectElement;
      expect(ratioSelector.value).toBe("1/3");
    });

    test("fraction mode shows ratio selector when heightMode is fraction", () => {
      const size: ElementSize = {
        widthMode: "fixed",
        widthValue: 100,
        heightMode: "fraction",
        heightValue: { numerator: 1, denominator: 4 },
      };

      const onChange = () => {};

      render(<DimensionsInput label="Size" size={size} onChange={onChange} />);

      const ratioSelector = screen.getByRole("combobox") as HTMLSelectElement;
      expect(ratioSelector).toBeDefined();
      expect(ratioSelector.value).toBe("1/4");
    });
  });

  describe("mode switching", () => {
    test("switching from fixed to fraction converts value appropriately", async () => {
      const user = userEvent.setup();
      let currentSize: ElementSize = {
        widthMode: "fixed",
        widthValue: 100,
        heightMode: "fixed",
        heightValue: 100,
      };

      const onChange = (newSize: ElementSize) => {
        currentSize = newSize;
      };

      const { rerender } = render(
        <DimensionsInput label="Size" size={currentSize} onChange={onChange} />,
      );

      const widthSection = screen.getByText("W").closest("div")?.parentElement;
      const fractionButton = within(widthSection!).getByTitle(
        SIZING_MODE_LABELS.fraction,
      );
      await user.click(fractionButton);

      rerender(
        <DimensionsInput label="Size" size={currentSize} onChange={onChange} />,
      );

      expect(currentSize.widthMode).toBe("fraction");
      expect(currentSize.widthValue).toEqual({ numerator: 1, denominator: 2 });
    });
  });
});
