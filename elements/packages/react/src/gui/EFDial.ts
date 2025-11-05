import { EFDial as EFDialElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Dial = createComponent({
  tagName: "ef-dial",
  elementClass: EFDialElement,
  react: React,
  events: {
    onChange: "change",
  },
});
