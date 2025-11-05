import ReactDOM from "react-dom/client";
import "@editframe/elements";
import "@editframe/elements/styles.css";
import { Timegroup, useTimingInfo } from "@editframe/react";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

const Video = () => {
  const { ownCurrentTimeMs, ref } = useTimingInfo();
  return (
    <div>
      <Timegroup
        mode="fixed"
        duration="4s"
        ref={ref}
        style={{ width: 1920, height: 1080 }}
      >
        <h1>Hello</h1>
        <h2 style={{ fontFamily: "monospace" }}>{ownCurrentTimeMs}</h2>
      </Timegroup>
    </div>
  );
};

ReactDOM.createRoot(root).render(<Video />);
