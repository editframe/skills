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
      title: "Split Screen Video Maker | Editframe",
      description:
        "Create clever split-screen videos and add music or text. Quickly create a side by side video on one screen. ",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Split Screen Video Maker"
      description="Create clever split-screen videos and add music or text. Quickly create a side by side video on one screen. "
      playground={{
        code: `<ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>
      <ef-timegroup
            mode="contain"
            class="flex items-center gap-2  justify-center"
      >
            <div class="flex flex-col gap-2">
                  <ef-video
                        src="assets/video.mp4"
                        class="w-[220px] h-full object-contain object-center"
                        sourcein="0s"
                        sourceout="3s"
                        id="video"
                  ></ef-video>

                  <h1 class="text-white text-md font-base">Video.mp4</h1>
            </div>
            <div class="flex flex-col gap-2">
                  <ef-video
                        src="assets/coffee.mp4"
                        class="w-[220px] h-full object-contain object-center"
                        sourceout="3s"
                        id="video"
                  ></ef-video>
                  <h1 class="text-white text-md font-base">Coffee.mp4</h1>
            </div>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Programmatically create split-screen videos using Editframe's API. Editframe provides functions to combine multiple video streams into a single frame, with customizable layouts and synchronization. Ideal for developers building comparison tools, reaction video generators, or multi-angle video editors.
</p>
<p class="mb-4">
This capability opens up possibilities for creating rich, multi-source video content. Developers could create platforms for automatically generating split-screen sports analysis videos.
</p>
`}
    />
  );
};
export default IndexPage;
