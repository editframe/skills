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
      title: "Add Music to Image | Editframe",
      description:
        "Add music to your images and create a video slideshow in seconds",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Add Music To Image"
      description="Add songs, music, MP3, or any audio to your image online."
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
                      Programmatically transform static images into dynamic videos with Editframe's API. Seamlessly integrate audio-visual content generation into your applications, allowing you to add music to images with just a few lines of code. Perfect for automating content creation for social media platforms, our API enables scalable solutions for enhancing images with audio. Implement custom audio synchronization logic and manage multiple tracks through well-documented API calls.
</p>
<p class="mb-4">
                     Developers can leverage this feature to build applications that automatically generate music videos from album art, create animated e-cards with background music, or develop tools for social media marketers to quickly produce audio-enhanced image content. The possibilities for creative automation are vast, limited only by your imagination and coding skills.
               </p>    
                `}
    />
  );
};
export default IndexPage;
