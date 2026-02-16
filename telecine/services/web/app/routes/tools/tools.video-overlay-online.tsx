import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { maybeIdentityContext } from "~/middleware/context";
import "~/styles/marketing.css";
import { Layout } from "~/layouts/tools";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = args.context.get(maybeIdentityContext);

  return {
    islogged: !session,
  };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Stack Videos on Top of Each Other | Editframe",
      description:
        "Overlay video on top of one another easily while also adding effects. Simply stack or combine two videos or more.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title=" Stack Videos on Top of Each Other"
      description="Overlay video on top of one another easily while also adding effects. Simply stack or combine two videos or more."
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
                  sourcein="0s"
                  sourceout="3s"
                  id="video"
            ></ef-video>
            <ef-video
                  src="assets/coffee.mp4"
                  class="w-[300px] h-full object-contain object-center absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
                  sourceout="3s"
                  id="video"
            ></ef-video>
      </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Implement video overlaying and compositing with Editframe's API. Editframe lets you stack multiple video layers, control opacity, and manage timing. Perfect for developers creating tools for visual effects, picture-in-picture videos, or complex video compositions.
</p>
<p class="mb-4">
This feature allows for the creation of sophisticated, multi-layered video content. Developers could build systems for automatically generating news-style videos with multiple information overlays, or create tools for easily producing complex visual effects sequences.
</p> 
`}
    />
  );
};
export default IndexPage;
