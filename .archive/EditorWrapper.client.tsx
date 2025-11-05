import { Editor as EditorModel } from "@/editor/model/Editor";
import { Editor } from "@/editor/components/Editor";
import { EditorProvider } from "@/editor/components/EditorContext";
import * as keystone from "mobx-keystone";
import * as mobx from "mobx";
import "@/editor/index.css";

// // Import and register all layer types
import "@/editor/model/AudioLayer";
import "@/editor/model/CaptionLayer";
import "@/editor/model/HTMLLayer";
import "@/editor/model/ImageLayer";
import "@/editor/model/InstanceLayer";
import "@/editor/model/TimeGroup";
import "@/editor/model/VideoLayer";
import "@/editor/model/TextLayer";
import { useEffect, useMemo } from "react";
import { LayerComposition } from "@/editor/model/LayerComposition";
import {
  isRootStore,
  registerRootStore,
  unregisterRootStore,
} from "mobx-keystone";
import { autorun } from "mobx";

interface EditorWrapperProps {
  id: string;
}

export function EditorWrapper({ id }: EditorWrapperProps) {
  const composition = useMemo(() => new LayerComposition({ id }), [id]);
  const editor = useMemo(() => new EditorModel({ composition }), [composition]);

  useEffect(() => {
    if (!isRootStore(editor)) {
      registerRootStore(editor);
    }

    // @ts-expect-error useful for debugging
    window.$e = editor;
    // @ts-expect-error useful for debugging
    window.$k = keystone;
    // @ts-expect-error useful for debugging
    window.$m = mobx;

    const disposer = autorun(() => {
      // @ts-expect-error useful for debugging
      window.$c = editor.composition;
      // @ts-expect-error useful for debugging
      window.$t = editor.selectedTemporalLayer;
      // @ts-expect-error useful for debugging
      window.$l = editor.selectedLayers[0];
    });
    return () => {
      unregisterRootStore(editor);
      disposer;
    };
  }, [editor]);

  return (
    <EditorProvider editor={editor}>
      <Editor />
      {/* <DevTools /> */}
    </EditorProvider>
  );
}
