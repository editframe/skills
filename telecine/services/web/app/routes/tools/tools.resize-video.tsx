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
      title: "Resize Video | Editframe",
      description:
        "Make your video fit perfectly with a few clicks in square, rectangle, or wide aspect ratios.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Resize Video"
      description="Make your video fit perfectly with a few clicks in square, rectangle, or wide aspect ratios."
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
         class="w-full h-[200px] object-contain object-center"
         />
   </ef-timegroup>
</ef-timegroup>

`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Implement automated video resizing for multiple platforms with Editframe's API. Programmatically adjust video dimensions to fit requirements for Slack, Discord, TikTok, Snapchat, YouTube, Instagram Stories, or any other platform. Editframe provides precise control over aspect ratios, resolution, and cropping, making it easy to build scalable video adaptation solutions.
</p>
<p class="mb-4">
This functionality is essential for developers working on cross-platform content management systems. You could create a centralized video publishing tool that automatically optimizes and distributes content across various social and professional platforms, ensuring consistent quality and proper formatting.
</p>  
`}
    />
  );
};
export default IndexPage;
