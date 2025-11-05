import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { parseRequestSession } from "@/util/session";
import "~/styles/marketing.css";
import { Footer } from "~/components/marketing/Footer";
import { Header } from "~/components/marketing/Header";
import { useEffect, useState } from "react";
import { EditorPreview } from "~/components/marketing/EditorPreview";
import { Hero } from "~/components/marketing/Hero";

const navigation = [
  { name: "Get Started", href: "/welcome", primary: true },
  { name: "Documentation", href: "/docs" },
];
const title = "Online Video Editor";
const description = "Quickly edit and create amazing programatically.";

export const loader = async (args: LoaderFunctionArgs) => {
  const session = await parseRequestSession(args.request);

  return {
    isLogged: !!session,
  };
};

export const meta: MetaFunction = () => {
  return [
    {
      title: "Online Video Editor | Editframe",
      description: "Quickly edit and create amazing programmatically.",
    },
  ];
};
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
    <div className="dark:bg-[#1b1b1f] bg-white">
      <Header />
      <div className="lg:px-[5.5rem] max-w-6xl mx-auto">
        <div className="px-6 pt-28 pb-8 -mt-14">
          <div className="mb-8">
            <Hero
              navigation={navigation}
              description={description}
              header={title}
            />
          </div>
          <div className="lg:mt-14">
            <EditorPreview
              code={`import type { EFPreview } from "@editframe/elements";
import { Preview, Timegroup, Video } from "@editframe/react";
import React, { useState, useEffect } from "react";
import { useRef } from "react";

export const Editor = () => {
  const previewRef = useRef<EFPreview>(null);
  const [videoChunks, setVideoChunks] = useState([
    { src: "/assets/bars-n-tone.mp4", sourceIn: "0s", sourceOut: "5s" },
  ]);
  const [currentTime, setCurrentTime] = useState(0);

  const handleSplit = () => {
    const newChunks = [
      { src: "/assets/bars-n-tone.mp4", sourceIn: "2.5s", sourceOut: "3s" },
      { src: "/assets/bars-n-tone.mp4", sourceIn: "4s", sourceOut: "5s" },
    ];
    setVideoChunks(newChunks);
  };
  const togglePlay = () => {
    console.log("toggle play", previewRef.current);
    if (previewRef.current?.playing) {
      previewRef.current?.pause();
    } else {
      previewRef.current?.play();
    }
  };

  useEffect(() => {
    const handleTimeUpdate = (event: CustomEvent) => {
      setCurrentTime(event.detail.currentTimeMs);
    };

    previewRef.current?.addEventListener(
      "timeupdate",
      handleTimeUpdate as EventListener,
    );

    return () => {
      previewRef.current?.removeEventListener(
        "timeupdate",
        handleTimeUpdate as EventListener,
      );
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 text-white">
      <Preview ref={previewRef}>
        <Timegroup
          className="w-[500px] h-[500px] bg-slate-200 flex items-center justify-center relative overflow-hidden"
          mode="sequence"
        >
          {videoChunks.map((chunk, index) => (
            <Timegroup
                className="w-full h-full flex items-center justify-center"
            >
                <Video
                    src={chunk.src}
                    className="w-full"
                    sourcein={chunk.sourceIn}
                    sourceout={chunk.sourceOut}
                />
            </Timegroup>
          ))}
        </Timegroup>
      </Preview >
      <button type="button" onClick={togglePlay}>
       <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24" class="text-white"><path d="M8 5v14l11-7z"></path></svg>
      </button>
      <button type="button" onClick={handleSplit}>
        Split Video
      </button>
      <div>Current Time: {currentTime}ms</div>
    </div >
  );
};
`}
              presetCode={"{{code}}"}
            />
            <div className="mt-4">
              <div
                dangerouslySetInnerHTML={{
                  __html: `
                  <p class="mb-4" >
                      Integrate professional - grade video editing capabilities directly into your software with Editframe's comprehensive API. Programmatically cut, clip, trim, add text, or resize videos, making it perfect for building scalable content creation platforms or social media tools. Implement complex video editing workflows, including transitions, special effects, and text overlays, all through our robust API.
                              </ >
                  <p class="mb-4">
                      With this powerful functionality, developers can create custom video editing solutions tailored to specific industries or use cases. For example, you could build an automated highlight reel generator for sports events, or develop a tool that creates personalized video ads by dynamically editing and combining pre-existing footage.
                  </p>
              `,
                }}
                className="text-xl  text-[#3C3C43] leading-[1.4] text-opacity-[78%] mt-3 ml-1 text-left  dark:text-gray-400 mb-6"
              />
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
export default IndexPage;
