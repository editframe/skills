import type { MetaFunction } from "react-router";
import { useEffect } from "react";
import { MotionDesigner } from "~/components/motion-designer/MotionDesigner";

export const meta: MetaFunction = () => {
  return [
    { title: "Motion Designer | Editframe" },
    {
      name: "description",
      content: "Create motion designs with Editframe elements",
    },
  ];
};

export default function MotionDesignerPage() {
  // Enable Editframe interactive mode so timegroups initialize playback controllers
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).EF_INTERACTIVE = true;
    }
  }, []);

  return <MotionDesigner />;
}
