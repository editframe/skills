import { type RenderResult, render } from "@testing-library/react";
import { type Editor } from "../model/Editor";
import { EditorProvider } from "../components/EditorContext";
import { type ReactNode } from "react";

export const testRender = (editor: Editor, contents: ReactNode): RenderResult =>
  render(<EditorProvider editor={editor}>{contents}</EditorProvider>);
