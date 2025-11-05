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
      title: "Crop Video | Editframe",
      description:
        "Crop your video to fit TikTok, Instagram, Facebook, Youtube or any other video platform.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Crop Video"
      description="Crop your video to fit TikTok, Instagram, Facebook, Youtube or any other video platform."
      playground={{
        code: `<ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>
      <ef-timegroup
            mode="fixed"
            duration="3s"
            class="flex items-center flex-col justify-center"
      >
            <div class="flex flex-col gap-2">
                  <ef-video
                        src="assets/video.mp4"
                        class="w-full h-[400px] object-cover object-left-top"
                  ></ef-video>
            </div>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Automate video cropping for various social media platforms using Editframe's API. Implement custom cropping logic to optimize videos for TikTok, Instagram, Twitter, Facebook, YouTube Shorts, or Snapchat Stories. Editframe offers precise control over aspect ratios and focal points, ensuring your programmatically cropped videos look polished across different platforms.
</p>
<p class="mb-4">
This functionality is crucial for developers building multi-platform content distribution systems. You could create a tool that automatically adapts a single video for optimal display across various social media platforms, saving content creators significant time and effort.
       </p>   
                `}
    />
  );
};
export default IndexPage;
