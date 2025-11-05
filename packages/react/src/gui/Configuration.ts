import { EFConfiguration } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Configuration = createComponent({
  tagName: "ef-configuration",
  elementClass: EFConfiguration,
  react: React,
});
