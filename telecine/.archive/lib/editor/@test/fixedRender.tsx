import { type RenderResult } from "@testing-library/react";

export const fixedRender = (result: RenderResult): RenderResult => {
  Object.assign(result.container.style, {
    position: "fixed",
    top: "0px",
    left: "0px",
  });
  return result;
};
