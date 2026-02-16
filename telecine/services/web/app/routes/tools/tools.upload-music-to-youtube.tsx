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
      title:
        "Upload Audio to TikTok, Instagram, YouTube, Facebook, or Shorts | Editframe",
      description: "Add music to YouTube by making a video.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Upload Audio to TikTok, Instagram, YouTube, Facebook, or Shorts"
      description="Add music to YouTube by making a video."
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
      <ef-video 
         src="assets/video.mp4" 
         class="w-full h-full object-contain object-center"
         sourcein="1s"
         sourceout="5s"
         >
         </ef-video>
               <ef-audio 
         src="https://assets.editframe.com/card-joker.mp3" 
         >
         </ef-audio>
   </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Automate the process of converting audio content into platform-specific video formats using Editframe's API. Editframe offers functions to generate visuals, add artwork, and customize video output for various social media platforms. Perfect for developers building tools for musicians, podcasters, or audio content creators to expand their online presence.
</p>
<p class="mb-4">
This feature streamlines multi-platform audio content distribution. Developers could create comprehensive audio management systems that automatically optimize and distribute audio content across various social media channels, maximizing reach and engagement.
        </p>    
                `}
    />
  );
};
export default IndexPage;
