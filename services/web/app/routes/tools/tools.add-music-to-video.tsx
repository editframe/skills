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
      title: "Add Music to Video | Editframe",
      description: "Add songs, music, MP3, or any audio to your video.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Add Music to Video"
      description="Add songs, music, MP3, or any audio to your video."
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
                  sourcein="0s"
                  sourceout="3s"
                  id="video"
            ></ef-video>
            <ef-audio src="https://assets.editframe.com/card-joker.mp3" />
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Automate the process of adding music to videos using Editframe's API. Editframe offers functions to merge audio tracks with video content, control volume levels, and manage timing. Perfect for developers building applications that require background music addition or voice-over integration in videos.
</p>
<p class="mb-4">
This capability enables the creation of sophisticated audio-visual content tools. Developers could build a system that automatically scores videos based on mood or genre, or create a platform for easy creation of music videos by syncing user-uploaded footage with audio tracks.
</p>
`}
    />
  );
};
export default IndexPage;
