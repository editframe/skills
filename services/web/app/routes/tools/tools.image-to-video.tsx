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
      title: "Image to Video | Editframe",
      description: "Turn any image into a video.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Image to Video"
      description="Turn any image into a video."
      playground={{
        code: `<ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>
      <ef-timegroup
            mode="fixed"
            duration="1s"
            class="flex items-center flex-col justify-center"
      >
            <ef-image src="assets/art.jpg" class="w-full h-full object-contain object-center" />
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Convert still images to MP4 videos programmatically using Editframe's API. Ideal for developers looking to automate the creation of video content from image libraries. Editframe offers controls for duration, transitions, and effects, enabling you to transform static visuals into engaging video content suitable for various social media platforms.
</p>
<p class="mb-4">
This capability allows for creative repurposing of static content. Developers could build tools that automatically turn photo albums into video slideshows, or create systems that generate video product catalogs from e-commerce product images.
     </p>      
                `}
    />
  );
};
export default IndexPage;
