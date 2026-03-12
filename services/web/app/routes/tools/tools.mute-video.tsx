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
      title: "Mute Video | Editframe",
      description: "Remove audio and sound from your video.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Mute Video"
      description="Remove audio and sound from your video.."
      playground={{
        code: `<<ef-timegroup
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
                  sourcein="5s"
                  sourceout="7s"
            ></ef-video>
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
