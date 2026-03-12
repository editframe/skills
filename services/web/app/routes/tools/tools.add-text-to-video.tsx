import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { maybeIdentityContext } from "~/middleware/context";
import "~/styles/marketing.css";
import { Layout } from "~/layouts/tools";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = args.context.get(maybeIdentityContext);

  return {
    isLogged: !!session,
  };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Add Text to Video | Editframe",
      description: "Add text to your video at scale, quickly.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Add Text to Video"
      description="Add text to your video at scale, quickly."
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
                        class="w-full h-full object-contain object-center"
                  ></ef-video>
                  <h1 class="text-white text-lg font-base text-center">Welcome to Editframe</h1>
            </div>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Programmatically add text overlays to videos with Editframe's API. Editframe offers extensive customization options for font, color, size, and animation of text elements. Perfect for developers building captioning tools, automated video editors, or applications requiring dynamic text integration in videos.
</p>
<p class="mb-4">
This feature allows for creative and informative text animations in videos. Developers could create systems for automatic subtitle generation and synchronization, or build tools for creating dynamic infographic videos from data sources.
        </p>
                `}
    />
  );
};
export default IndexPage;
