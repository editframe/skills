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
      title: "Logo Video Intro Maker | Editframe",
      description: "Add your logo to any video intro.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Logo Video Intro Maker"
      description="Add your logo to any video intro."
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
Create custom video intros programmatically with Editframe's API. Editframe helps generate dynamic intro sequences featuring logos, text, and animations. Ideal for developers building tools for creating consistent branded video content at scale.
</p>
<p class="mb-4">
This capability enables the creation of professional-looking video content at scale. Developers could build platforms that automatically generate custom intro sequences for different product lines or brand subdivisions, or create tools for easily producing personalized video greetings.
          </p> 
                `}
    />
  );
};
export default IndexPage;
