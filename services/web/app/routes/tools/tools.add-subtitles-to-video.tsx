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
      title: "Add Subtitles to Video | Editframe",
      description:
        "Subtitle a video programatically or with an SRT file of your choice",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Add Subtitles to Video"
      description="Subtitle a video programatically or with an SRT file of your choice."
      playground={{
        code: `<ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>

      <ef-timegroup
            mode="contain"
            class="flex items-center flex-col justify-center"
      >
<ef-audio id="caption-audio" src="https://assets.editframe.com/card-joker.mp3"></ef-audio>
<ef-captions
  class="h-24 p-2 text-center text-4xl text-white"
  target="caption-audio"
>
  <ef-captions-active-word
    class="text-white"
    style="
      animation: 0.1s bounce-in ease-out forwards;
      animation-play-state: paused;
    "
  ></ef-captions-active-word>
</ef-captions>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Programmatically add subtitles to videos using Editframe's API. Editframe provides functions to overlay text on video frames, with support for both automated subtitling and custom SRT file integration. Ideal for developers creating content localization tools, accessibility solutions, or enhancing video content with captions. 
</p>
<p class="mb-4">
This feature enables the creation of multilingual and more inclusive video experiences. Developers could build platforms for automatically generating subtitled educational content or creating globally accessible marketing videos.</p> 
`}
    />
  );
};
export default IndexPage;
