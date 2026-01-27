import type { EFTimegroup } from "@editframe/elements/node";
import type { Page } from "playwright";

export const attachWorkbench = (page: Page) => {
  page.on("load", buildWorkbench.bind(null, page));
  buildWorkbench(page);
};

const buildWorkbench = async (page: Page) => {
  await page.evaluate(async () => {
    const rootTimegroup = document.body.querySelector("ef-timegroup") as
      | EFTimegroup
      | undefined;
    rootTimegroup?.wrapWithWorkbench();
  });
};
