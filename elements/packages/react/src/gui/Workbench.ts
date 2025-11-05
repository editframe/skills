import { EFWorkbench as EFWorkbenchElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Workbench = createComponent({
  tagName: "ef-workbench",
  elementClass: EFWorkbenchElement,
  react: React,
});
