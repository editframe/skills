import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { parseRequestSession } from "@/util/session";
import "~/styles/marketing.css";
import { Layout } from "~/layouts/tools";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = await parseRequestSession(args.request);

  return {
    isLogged: !!session,
  };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Cut Video Online | Editframe",
      description:
        "Quickly cut your video to the perfect length. Select the ideal section and quickly trim the start and end of a video.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Cut Video Online"
      description="Quickly cut your video to the perfect length. Select the ideal section and quickly trim the start and end of a video."
      playground={{
        code: `<<ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>
      <ef-timegroup
            mode="fixed"
            duration="3s"
            class="flex items-center flex-col justify-center"
      >
            <ef-video
                  src="assets/video.mp4"
                  class="w-full h-full object-contain object-center"
                  sourcein="5s"
                  sourceout="7s"
            ></ef-video>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Implement programmatic video trimming and splitting with Editframe's API. Editframe provides precise control over cut points, enabling developers to automate the process of creating short clips from longer videos. Ideal for building tools that generate social media-friendly video snippets or highlight reels.
</p>
<p class="mb-4">
Editframe allows for intelligent content chunking and highlight generation. Developers could create AI-powered systems that automatically identify and clip the most engaging parts of long-form videos, or build tools for easily creating episodic content from longer recordings.
        </p>    
                `}
    />
  );
};
export default IndexPage;
