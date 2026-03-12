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
      title: "Collage Maker | Editframe",
      description: "Make a collage with a few images, videos, or GIFs.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Collage Maker"
      description="Make a collage with a few images, videos, or GIFs."
      playground={{
        code: `<ef-timegroup
      mode="sequence"
      class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>
      <ef-timegroup
            mode="contain"
            class="w-full h-full p-2"
      >
            <div  class="grid gap-x-6  w-full h-full  grid-cols-4">

                  <ef-video
                        src="assets/video.mp4"
class="w-full h-full overflow-hidden rounded-lg object-contain object-center"                       
 sourcein="0s"
                        sourceout="3s"
                  ></ef-video>
                  
                  <ef-image
                        src="https://assets.editframe.com/bridge.jpg"
class="w-full h-full overflow-hidden rounded-lg object-contain object-center"                       
                  ></ef-image>
                        
                  <ef-image
                        src="https://assets.editframe.com/dog.jpg"
class="w-full h-full overflow-hidden rounded-lg object-contain object-center"                       
                  ></ef-image>

                  <ef-video
                        src="assets/coffee.mp4"
class="w-full h-full overflow-hidden rounded-lg object-contain object-center"                       
                  ></ef-video>

                  <ef-image
                        src="assets/art.jpg"
class="w-full h-full overflow-hidden rounded-lg object-contain object-center"                       
                  ></ef-image>

                  <ef-image
                        src="assets/metro.jpg"
class="w-full h-full overflow-hidden rounded-lg object-contain object-center"                       
                  ></ef-image>
            </div>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Implement programmatic creation of video and image collages with Editframe's API. Editframe provides functions to combine multiple media elements into a single composition. Ideal for developers building tools for creating comparison videos, visual stories, or dynamic photo collections.
</p>
<p class="mb-4">
This feature enables innovative ways of presenting multiple pieces of visual content. Developers could create systems for automatically generating before-and-after comparisons, or build tools for easily producing multi-camera video collages for events or performances.
</p> 
`}
    />
  );
};
export default IndexPage;
