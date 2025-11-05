import { EFTimegroup as EFTimegroupElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Timegroup = createComponent({
  tagName: "ef-timegroup",
  elementClass: EFTimegroupElement,
  react: React,
});
