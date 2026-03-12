import { redirect } from "react-router";

const DOCS_REDIRECTS: Record<string, string> = {
  // Getting started
  "getting-started": "/skills/composition/getting-started",
  "getting-started/main-idea": "/skills/composition/getting-started",
  "getting-started/packages": "/skills/composition/getting-started",
  "getting-started/temporal-elements": "/skills/composition/time-model",
  "getting-started/authentication": "/skills/editframe-api/authentication",
  "getting-started/webhook-verification": "/skills/webhooks/security",

  // Elements
  elements: "/skills/composition",
  "elements/audio": "/skills/composition/audio",
  "elements/captions": "/skills/composition/captions",
  "elements/image": "/skills/composition/image",
  "elements/surface": "/skills/composition/surface",
  "elements/text": "/skills/composition/text",
  "elements/timegroup": "/skills/composition/timegroup",
  "elements/video": "/skills/composition/video",
  "elements/waveform": "/skills/composition/waveform",
  "elements/examples": "/skills/composition",
  "elements/examples/multi-track": "/skills/composition",
  "elements/examples/responsive": "/skills/composition",

  // Controls
  controls: "/skills/editor-gui/controls",
  "controls/controls": "/skills/editor-gui/controls",
  "controls/scrubber": "/skills/editor-gui/scrubber",
  "controls/time-display": "/skills/editor-gui/time-display",
  "controls/toggle-loop": "/skills/editor-gui/toggle-loop",
  "controls/toggle-play": "/skills/editor-gui/toggle-play",

  // Editor UI
  "editor-ui": "/skills/editor-gui",
  "editor-ui/configuration": "/skills/editor-gui",
  "editor-ui/preview": "/skills/editor-gui/preview",
  "editor-ui/preview-element": "/skills/editor-gui/preview",
  "editor-ui/toggle-loop": "/skills/editor-gui/toggle-loop",

  // React
  react: "/skills/composition",
  "react/components": "/skills/composition",
  "react/hooks": "/skills/composition/hooks",

  // Rendering
  rendering: "/skills/editframe-api/renders",
  "rendering/api": "/skills/editframe-api/renders",

  // Resources
  resources: "/skills/editframe-api",
  "resources/isobmff-tracks": "/skills/editframe-api/files",
  "resources/isobmff-files": "/skills/editframe-api/files",
  "resources/image-files": "/skills/editframe-api/image-files",
  "resources/renders": "/skills/editframe-api/renders",
  "resources/transcriptions": "/skills/editframe-api/transcription",
  "resources/unprocessed-files": "/skills/editframe-api/unprocessed-files",
  "resources/url-token": "/skills/editframe-api/url-signing",
  "resources/process-isobmff": "/skills/editframe-api/media-pipeline",

  // Processing files
  "processing-files/audio-video-files": "/skills/editframe-api/files",
  "processing-files/image-files": "/skills/editframe-api/image-files",
  "processing-files/transcriptions": "/skills/editframe-api/transcription",

  // Video composition (very old URLs)
  "video-composition/adding-layers/layer-types/add-image": "/skills/composition/image",
};

export const loader = async ({ params }: { params: Record<string, string | undefined> }) => {
  const splat = (params as Record<string, string>)["*"] ?? "";
  const normalized = splat.replace(/^\/|\/$/g, "");
  const target = DOCS_REDIRECTS[normalized] ?? "/skills";
  return redirect(target, { status: 301 });
};
