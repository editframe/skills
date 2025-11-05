import { createRoot } from "react-dom/client";
import { Editor } from "./components/Editor";
import "./index.css";
import { editor } from "./demoModel";
import { EditorProvider } from "./components/EditorContext";
import { DevTools } from "./components/DevTools";

// Import and register all layer types
import "./model/AudioLayer";
import "./model/CaptionLayer";
import "./model/HTMLLayer";
import "./model/ImageLayer";
import "./model/InstanceLayer";
import "./model/TimeGroup";
import "./model/VideoLayer";
import "./model/TextLayer";

// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
createRoot(document.getElementById("app")!).render(
  <EditorProvider editor={editor}>
    <Editor />
    <DevTools />
  </EditorProvider>
);
