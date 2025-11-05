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
      title: "Share Audio to Social Media | Editframe",
      description:
        "Quickly share your music, podcasts, or any audio on YouTube, Instagram, or TIkTok.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Share Audio to Social Media"
      description="Quickly share your music, podcasts, or any audio on YouTube, Instagram, or TIkTok."
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
            <ef-audio
                  id="sample-audio"
                  src="https://assets.editframe.com/card-joker.mp3"
            ></ef-audio>
            <ef-waveform
                  class="h-full w-full fill-green-600 stroke-athens-gray-500"
                  target="sample-audio"
            ></ef-waveform>
            <ef-captions
                  class="h-12 p-2 text-center text-2xl"
                  target="sample-audio"
            >
                  <ef-captions-active-word
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
Automate the process of converting audio content into shareable videos for social media platforms using Editframe's API. Ideal for developers building tools for musicians, podcasters, or audio content creators. Editframe provides the ability to generate visuals, add waveforms, and customize video output for platforms like TikTok, Facebook, YouTube, Instagram, Twitter, or Snapchat.
</p>
<p class="mb-4">
This capability enables innovative audio-to-video content strategies. Developers could build a platform that automatically turns short audio clips into engaging social media posts, or create tools for musicians to easily share snippets of new songs across multiple platforms.
  </p>     
                `}
    />
  );
};
export default IndexPage;
