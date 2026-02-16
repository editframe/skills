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
      title: "Animate Objects in Video  | Editframe",
      description:
        "Animate any object in your video and give it life. Apply movement to text or images or stickers.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Animate Objects in Video"
      description="Animate any object in your video and give it life. Apply movement to text or images or stickers. "
      playground={{
        code: `<ef-timegroup
   mode="sequence"
   class="w-[400px] h-[400px] bg-black relative overflow-hidden"
   >
   <ef-timegroup
      mode="fixed"
      duration="3s"
      class="flex items-center flex-col justify-center relative"
      >
      <ef-image 
         src="https://assets.editframe.com/bridge.jpg" 
         class="w-full mt-4 h-[70%] object-contain object-center"
           style="
         animation:
         1s slide-up,
         2s flip 1s;
         "
         >
            </ef-image>
         <h2 class="text-white text-2xl text-center absolute top-4 left-1/2 -translate-x-1/2 " style="animation: 2s fade-in;">Animate Objects in Video</h2>
   </ef-timegroup>
</ef-timegroup>
<style>
   @keyframes slide-up {
        from {
          transform: translateY(100%);
        }
        to {
          transform: translateY(0);
        }
   }
    @keyframes flip {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
    }
    @keyframes fade-in {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
    }
</style>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Automate the process of adding animated elements to videos using Editframe's API. Editframe enables you to programmatically animate text, images, or other objects within a video. Ideal for developers building tools for creating dynamic video content, explanatory videos, or interactive video experiences.
</p>
<p class="mb-4">
This functionality enables the creation of engaging, dynamic video content. Developers could create systems for automatically generating animated infographic videos from data sources, or build tools for easily producing interactive, clickable video content for e-learning platforms.
        </p>
                `}
    />
  );
};
export default IndexPage;
