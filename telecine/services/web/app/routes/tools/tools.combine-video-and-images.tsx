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
      title: "Combine Video and Images | Editframe",
      description:
        "Merge your videos and images online, and combine it all. Use any number of images and clips and combine them together.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Combine Video and Images"
      description="Merge your videos and images online, and combine it all. Use any number of images and clips and combine them together."
      playground={{
        code: ` <ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>
      <ef-timegroup
            mode="fixed"
            duration="1s"
            class="flex items-center flex-col justify-center"
      >
            <ef-image
                  src="https://assets.editframe.com/bridge.jpg"
                  class="w-full h-full object-contain object-center"
            ></ef-image>
      </ef-timegroup>

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
            mode="fixed"
            duration="1s"
            class="flex items-center flex-col justify-center"
      >
            <ef-image
                  src="https://assets.editframe.com/dog.jpg"
                  class="w-full h-full object-contain object-center"
            ></ef-image>
      </ef-timegroup>

      <ef-timegroup
            mode="contain"
            class="flex items-center flex-col justify-center"
      >
            <ef-video
                  src="assets/video.mp4"
                  sourcein="1s"
                  sourceout="2s"
                  class="w-full h-full object-contain object-center"
            ></ef-video>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                  <p class="mb-4">
Leverage Editframe's API to programmatically merge videos and images into seamless compositions. Simply integrate still images into video timelines, with control over duration, transitions, and effects. Perfect for developers creating tools for visual storytelling, product showcases, or dynamic slideshows.

</p>
<p class="mb-4">
This capability allows for creative mixing of different visual media types. Developers could build systems for automatically generating video product catalogs that combine product photos with demo videos, or create tools for easily producing dynamic photo-video hybrid content for social media.
</p>   
`}
    />
  );
};
export default IndexPage;
