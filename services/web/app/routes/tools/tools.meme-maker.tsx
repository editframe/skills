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
      title: "Meme Maker | Editframe",
      description:
        "Generate memes easily online.Simply add text, an image or a video to make a meme programmatically.",
    },
  ];
};
const IndexPage = () => {
  return (
    <Layout
      title="Meme Maker"
      description="Generate memes easily online.Simply add text, an image or a video to make a meme programmatically."
      playground={{
        code: `<ef-timegroup
   mode="sequence"
   class="w-[400px] h-[400px] bg-black relative overflow-hidden"
   >
   <ef-timegroup
      mode="fixed"
      duration="3s"
      >
      <ef-image 
         src="https://assets.editframe.com/meme.jpg" 
         class="w-full h-full"
         >
         </ef-image>
         <div class="absolute pl-4 py-12 h-full mx-auto text-center w-1/2 flex flex-col top-0 right-0 z-1000 justify-between">
<h2 class="text-black text-xl font-semibold">React.js to create memes</h2>
<h2 class="text-black text-xl font-semibold">HTML and CSS to create memes</h2>
</div>
   </ef-timegroup>
</ef-timegroup>
`,
        presetCode: "{{code}}",
      }}
      content={`
                <p class="mb-4">
Build a powerful meme generation tool with Editframe's API. Programmatically create video memes from videos, images, or GIFs. Editframe provides functions to overlay text, manipulate timing, and apply effects, allowing you to automate meme creation at scale or integrate meme-making capabilities into your applications.

</p>
<p class="mb-4">
With this feature, developers can tap into the viral nature of meme culture. You could create a meme generator that automatically pulls trending topics and images, or build a tool for brands to quickly create meme-style content for their social media campaigns.
         </p>
                `}
    />
  );
};
export default IndexPage;
