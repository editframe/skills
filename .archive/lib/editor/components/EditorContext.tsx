import {
  type PropsWithChildren,
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { type Editor } from "../model/Editor";

// @ts-expect-error Our wrapped EditorProvider requires an editor value,
// This context is not exported, so it's safe to ignore this error.
const EditorContext = createContext<Editor>();

export const useEditor = (): Editor => useContext(EditorContext);

export const EditorProvider = (
  props: PropsWithChildren<{ editor: Editor }>
): ReactNode => (
  <EditorContext.Provider value={props.editor}>
    {props.children}
  </EditorContext.Provider>
);
