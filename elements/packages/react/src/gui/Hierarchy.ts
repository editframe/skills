import { EFHierarchy as EFHierarchyElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Hierarchy = createComponent({
  tagName: "ef-hierarchy",
  elementClass: EFHierarchyElement,
  react: React,
});
