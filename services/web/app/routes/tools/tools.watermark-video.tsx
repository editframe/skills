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
      title: "Watermark Video | Editframe",
      description:
        "Add watermark to your video online. You can watermark your videos using a logo, text, or branding.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Watermark Video"
      description="Add watermark to your video online. You can watermark your videos using a logo, text, or branding.."
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
            ></ef-video>
            <ef-image
                  src="assets/editframe.png"
                  class="w-[100px] h-auto object-contain object-center absolute bottom-4 right-0"
            ></ef-image>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Automate the process of adding watermarks to videos using Editframe's API. Editframe enables you to overlay logos or text, with control over position, opacity, and timing. Perfect for developers building content protection tools or branded video generators.
</p>
<p class="mb-4">
Adding a watermark is essential for brand consistency and content attribution. Developers could create systems that automatically apply appropriate watermarks to videos based on licensing or distribution channel, or build tools for creating dynamic, context-aware branding overlays.
          </p>
                `}
    />
  );
};
export default IndexPage;
