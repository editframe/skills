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
      title: "Promote Podcasts On Social Media | Editframe",
      description:
        "Promote your podcast show across Instagram, TikTok, YouTube, Shorts or Reels by using our easy tool. ",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Promote Podcasts On Social Media"
      description="Promote your podcast show across Instagram, TikTok, YouTube, Shorts or Reels by using our easy tool. ."
      playground={{
        code: `<ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>
      <ef-timegroup
            mode="fixed"
            duration="3s"
            class="flex items-center flex-col mt-8"
      >
            <div class="flex flex-col">
                  <h1 class="text-gray-400 text-2xl mb-4 font-base text-center">
                        Editframe Podcast
                  </h1>
                  <ef-video
                        src="assets/video.mp4"
                        class="w-full h-full object-contain object-center"
                        sourcein="0s"
                        sourceout="3s"
                        id="video"
                  ></ef-video>
                  <h1 class="text-white text-lg font-base text-left">
                        Guest Name
                  </h1>
            </div>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Leverage Editframe's API to automate the creation of promotional videos for podcasts. Convert audio episodes into visually engaging content for social media platforms. Editframe supports the ability to generate audiograms, add waveforms or progress bars, and customize visual elements, enabling developers to build scalable podcast promotion tools.
</p>
<p class="mb-4">
This is invaluable for podcast marketing automation. Developers could create a system that automatically generates and posts promotional clips for new podcast episodes across multiple social media platforms, significantly expanding reach and engagement.
        </p>  
                `}
    />
  );
};
export default IndexPage;
