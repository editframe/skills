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
      title: "Video Merger | Editframe",
      description:
        "Join videos together and merge videos online by combining clips.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Video Merger"
      description="Join videos together and merge videos online by combining clips."
      playground={{
        code: ` <ef-timegroup
        mode="sequence"
        class="w-[400px] h-[400px] bg-black relative overflow-hidden">

        <ef-timegroup
          mode="contain"
          class="flex items-center flex-col justify-center"
        >
          <ef-video 
          src="assets/coffee.mp4"
          class="w-full h-full object-contain object-center"
          sourcein="1s"
          sourceout="3s"
          ></ef-video>
        </ef-timegroup>

        <ef-timegroup
          mode="contain"
          class="flex items-center flex-col justify-center"
        >
          <ef-video src="assets/video.mp4"        
          trimstart="1s"
          trimend="2s"
          class="w-full h-full object-contain object-center"
          >
          </ef-video>
        </ef-timegroup>
      </ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
              <p class="mb-4">
Automate the process of combining multiple video clips into a single video using Editframe's API. Editframe enables seamless video joining, with control over transitions and timing. Perfect for developers building tools for creating compilations, episodic content, or long-form videos from shorter clips.
</p>
<p class="mb-4">
Concatinating video, streamlines the creation of cohesive video content from multiple sources. Developers could build systems for automatically assembling highlight reels from multiple event recordings, or create tools for easily producing episodic content from individually recorded segments.
           </p>
                `}
    />
  );
};
export default IndexPage;
