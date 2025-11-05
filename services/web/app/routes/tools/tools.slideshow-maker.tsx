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
      title: "Slideshow Maker | Editframe",
      description:
        "Create a slideshow video using images, music, videos, or text.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Slideshow Maker"
      description="Create a slideshow video using images, music, videos, or text. "
      playground={{
        code: `<ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>
      <ef-timegroup
            mode="fixed"
            duration="1s"
            class="flex items-center flex-col justify-center"
      >
            <ef-image src="assets/art.jpg" class="w-full h-full object-contain object-center" />
      </ef-timegroup>
      <ef-timegroup
            mode="fixed"
            duration="1s"
            class="flex items-center flex-col justify-center"
      >
            <ef-image src="https://assets.editframe.com/dog.jpg" class="w-full h-full object-contain object-center"  />
      </ef-timegroup>
      <ef-timegroup
            mode="fixed"
            duration="1s"
            class="flex items-center flex-col justify-center"
      >
            <ef-image src="https://assets.editframe.com/bridge.jpg" class="w-full h-full object-contain object-center"  />
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Automate the creation of photo or video slideshows using Editframe's API. Editframe offers functions to combine multiple media elements, add transitions, and synchronize with audio. Perfect for developers building tools for creating montages, presentations, or storytelling applications.
</p>
<p class="mb-4">
This capability allows for efficient creation of complex visual narratives. Developers could build systems that automatically generate video recaps of events from uploaded photos, or create tools for easily producing video-based storytelling content from multiple media sources.
</p>
`}
    />
  );
};
export default IndexPage;
