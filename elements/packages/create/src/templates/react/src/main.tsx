import React from "react";
import ReactDOM from "react-dom/client";
import { Video } from "./Video";
import "@editframe/elements/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(<Video />);
