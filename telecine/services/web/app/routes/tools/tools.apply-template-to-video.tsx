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
      title: "Apply Template to Video | Editframe",
      description:
        "Quickly create or use the perfect template to generate a video.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Apply Template to Video"
      description="Quickly create or use the perfect template to generate a video."
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
Implement template-based video creation at scale with Editframe's API. Editframe has the ability to apply and customize video templates programmatically. Ideal for developers building tools for creating consistent branded content or automating video production for various use cases.
</p>
<p class="mb-4">
This functionality enables efficient, large-scale video production. Developers could create systems for automatically generating personalized video content, such as customized product demos or tailored educational content, based on user data or preferences.
        </p>    
                `}
    />
  );
};
export default IndexPage;
