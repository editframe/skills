import { EFFilmstrip as EFFilmstripElement } from "@editframe/elements";
import React from "react";
import { createComponent } from "../hooks/create-element";

export const Filmstrip = createComponent({
  tagName: "ef-filmstrip",
  elementClass: EFFilmstripElement,
  react: React,
});
