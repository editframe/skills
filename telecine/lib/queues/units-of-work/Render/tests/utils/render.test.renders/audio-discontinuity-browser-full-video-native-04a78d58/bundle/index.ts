
          import "@editframe/elements";
          import "@editframe/elements/styles.css";
          import { renderTimegroupToVideo } from "/app/lib/packages/packages/elements/src/preview/renderTimegroupToVideo.ts";
          import { captureTimegroupAtTime } from "/app/lib/packages/packages/elements/src/preview/renderTimegroupToCanvas.ts";
          
          // Make render functions globally available for RPC calls
          (window as any).renderTimegroupToVideo = renderTimegroupToVideo;
          (window as any).captureTimegroupAtTime = captureTimegroupAtTime;
        