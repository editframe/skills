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
      title: "Add an Image or Photo to Video | Editframe",
      description:
        "Add an image to your video, or add a logo or photo to your video. ",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Add an Image or Photo to Video"
      description="Add an image to your video, or add a logo or photo to your video. "
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
      <ef-image 
         src="https://assets.editframe.com/bridge.jpg" 
         class="w-full h-full object-contain object-center"
         /></ef-image>
               <ef-audio 
         src="https://assets.editframe.com/card-joker.mp3" 
         >

   </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Programmatically overlay images, brand logos, or photos onto videos with Editframe's API. Editframe provides precise control over image placement, timing, and transitions. Ideal for automating brand watermarking, creating video slideshows, or building tools for custom video overlays.
</p>
<p class="mb-4">
This opens up possibilities for dynamic video branding and customization. Developers could create a tool that automatically adds context-aware overlays to videos, such as location information for travel vlogs or player stats for sports highlights.
        </p>
                `}
    />
  );
};
export default IndexPage;
