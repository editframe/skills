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
      title: "Add Audio to GIF | Editframe",
      description:
        "Add your favorite music to your GIFs online. Create awesome videos online by adding audio to your animated GIFs.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Add Audio to GIF"
      description="Add your favorite music to your GIFs online. Create awesome videos online by adding audio to your animated GIFs."
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
Automate audio removal from videos using Editframe's API. Editframe offers simple functions to mute videos or replace existing audio tracks. Perfect for developers building tools that require background noise removal or preparing videos for new audio addition.
</p>
<p class="mb-4">
This capability is crucial for content repurposing and moderation. Developers could build systems for automatically creating silent versions of videos for text-overlay social media content, or tools for removing inappropriate audio content from user-generated videos.
        </p>    
                `}
    />
  );
};
export default IndexPage;
