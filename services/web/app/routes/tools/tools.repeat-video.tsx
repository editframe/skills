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
      title: "Repeat Video | Editframe",
      description: "Repeat video over and over again to create a longer video.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Repeat Video"
      description="Repeat video over and over again to create a longer video. "
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
         />

   </ef-timegroup>
       <ef-timegroup
      mode="contain"
            class="flex items-center flex-col justify-center"
      >
      <ef-video 
         src="assets/video.mp4" 
        class="w-full h-full object-contain object-center"
         />

   </ef-timegroup>
      <ef-timegroup
      mode="contain"
            class="flex items-center flex-col justify-center"
      >
      <ef-video 
         src="assets/video.mp4" 
        class="w-full h-full object-contain object-center"
         />

   </ef-timegroup>
   </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Automate video looping and repetition with Editframe's API. Editframe supports the ability to repeat video content, with control over loop count and transitions. Ideal for developers building tools for creating endless loops, extended background videos, or emphasizing key moments in content.
</p>
<p class="mb-4">
This feature enables the creation of hypnotic or emphasis-driven video content. Developers could create systems for automatically generating looped background videos for websites or digital signage, or build tools for easily producing emphasis videos that repeat key moments for instructional or comedic effect.
        </p>
                `}
    />
  );
};
export default IndexPage;
