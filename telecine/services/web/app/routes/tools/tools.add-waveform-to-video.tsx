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
      title: "Add Progress Bar or Waveform | Editframe",
      description:
        "Add a waveform or progress bar dynamically to your video, gif, or audiogram.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Add Progress Bar or Waveform."
      description="Add a waveform or progress bar dynamically to your video, gif, or audiogram."
      playground={{
        code: `<ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>

      <ef-timegroup
            mode="contain"
            class="flex items-center flex-col justify-center"
      >
            <ef-video
                  src="assets/video.mp4"
                  class="w-full h-full object-contain object-center"
                  sourcein="0s"
                  sourceout="3s"
                  id="video"
            ></ef-video>
                <ef-waveform
                   target="video"
                   mode="roundBars"
                  class="w-full h-12 fill-gray-500 stroke-white absolute bottom-10 left-1/2 right-1/2  transform -translate-x-1/2"
            ></ef-waveform>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Programmatically enhance videos, GIFs, or audiograms with dynamic visual elements using Editframe's API. Easily add responsive waveforms or progress bars to your content. Editframe provides functions to generate and overlay these elements onto your media, allowing for customization of appearance, timing, and behavior through simple API calls.
</p>
<p class="mb-4">
This feature enables developers to create more engaging and informative audio-visual content. You could build a video platform that shows viewers their progress through long-form content, and enhancing user experience and engagement.               
</p>
`}
    />
  );
};
export default IndexPage;
