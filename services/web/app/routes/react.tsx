import type { LoaderFunctionArgs, MetaFunction } from "react-router";

import { parseRequestSession } from "@/util/session";
import "~/styles/marketing.css";
import { useEffect, useState } from "react";
import { Layout } from "~/layouts";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = await parseRequestSession(args.request);

  return {
    isLogged: !!session,
  };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Editframe | Programmatically Make Videos",
      description: "Launch video features in days, not months",
    },
  ];
};

const features = [
  {
    icon: "🚀",
    title: "Simple to Use",
    description:
      "Everyone can use Editframe, even a junior developer can build complex video applications. ",
  },
  {
    icon: "⏱️",
    title: "Lightning Fast",
    description: "Render long 15+ minute 4K MP4 videos in seconds. ",
  },
  {
    icon: "🎨",
    title: "Rich Videos",
    description:
      "Out-of-the-box support for all web frameworks including React, Tailwind, Framer Motion, Next JS, CSS and more.",
  },
];

const IndexPage = () => {
  const [isDarkMode, setIsDarkMode] = useState<boolean | null>(null);

  useEffect(() => {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      document.documentElement.classList.add("dark");
      localStorage.theme = "dark";
      setIsDarkMode(true);
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
      setIsDarkMode(false);
    }

    return () => {};
  }, []);
  if (isDarkMode === null) {
    return null;
  }
  return (
    <Layout
      features={features}
      description="Create videos using React"
      playground={{
        jsx: `<Timegroup
  mode="sequence"
  class="w-[400px] h-[400px] bg-black relative overflow-hidden"
>
  <Timegroup
    mode="contain"
    className="text-center modern-bg py-8 flex items-center flex-col gap-8 justify-center"
  >
    <h1 className="text-2xl font-bold text-white mb-4">Editframe</h1>
    <p className="text-xl text-white">Create stunning videos with code</p>
    <Video
      src="assets/video.mp4"
      sourcein="1s"
      sourceout="8s"
      style="
                animation: 1s fade-in 0s, 1s zoom-in 2s, 1s spin-up 3s;
                border-radius: 15px;
                box-shadow: 0 0 20px rgba(255,255,255,0.2);
              "
    ></Video>
    <Image
      src="assets/logo.png"
      className="w-[60px] h-[60px] absolute top-4 right-4"
    ></Image>
  </Timegroup>
</Timegroup>;
`,
        css: `.modern-bg {
            background: linear-gradient(135deg, #2c3e50, #3498db);
          }
          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slide-up {
            from { transform: translateY(30px); }
            to { transform: translateY(0); }
          }
          @keyframes zoom-in {
            from { transform: scale(0.95); }
            to { transform: scale(1); }
          }
          @keyframes rotate-bg {
            0% {
              background: linear-gradient(135deg, #2c3e50, #3498db);
            }
            25% {
              background: linear-gradient(70deg, #2c3e50, #3498db);
            }
            50% {
              background: linear-gradient(90deg, #2c3e50, #3498db);
            }
            75% {
              background: linear-gradient(180deg, #2c3e50, #3498db);
            }
            100% {
              background: linear-gradient(360deg, #2c3e50, #3498db);
            }
          }
          @keyframes spin-up {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }`,
        presetCode: "{{code}}",
      }}
    />
  );
};
export default IndexPage;
