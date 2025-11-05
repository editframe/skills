import { Link } from "react-router";
import { CodeBlock } from "./CodeBlock";
import { useState } from "react";
import { Preview, TogglePlay } from "@editframe/react";
import { motion } from "framer-motion";

export const FlipHero = ({
  description = "Create videos using HTML and CSS",
  codeBlock,
}: {
  description?: string;
  codeBlock?: { code: string; language: string };
}) => {
  const [showVideo, setShowVideo] = useState(false);

  const toggleView = () => {
    setShowVideo(!showVideo);
  };

  return (
    <div className="my-0 mx-auto flex flex-col max-w-7xl text-center lg:flex-row lg:text-left px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
      <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-[#646CFF] dark:text-[#646cff]  font-bold tracking-tight leading-tight mb-2">
          Editframe
        </h1>
        <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight leading-tight text-gray-800 dark:text-gray-200 mb-4">
          Programmatically Make Videos
        </p>
        <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-athens-gray-500 mb-6 text-center lg:text-left pt-2 m-0 font-base leading-6 break-words scroll-auto dark:text-gray-400">
          {description}
        </p>
        <div className="flex flex-wrap justify-center lg:justify-start -m-2">
          <Link
            to="/welcome"
            className="m-2 inline-block px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-full text-white bg-[#646CFF]  hover:bg-[#646CFF] dark:bg-[#646CFF]  dark:hover:bg-[#646cff]-700 transition-colors duration-250"
          >
            Get Started
          </Link>
          <Link
            to="/docs/editor-ui"
            className="m-2 inline-block px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold bg-athens-gray-200 rounded-full border border-transparent border-solid focus:border--[#646CFF]  dark:focus:border--[#646CFF]  hover:bg-athens-gray-100 dark:bg-athens-gray-800 dark:hover:bg-athens-gray-700 text-[#646cff]  dark:text-white transition-colors duration-250"
          >
            Player
          </Link>
          <Link
            to="/docs/rendering"
            className="m-2 inline-block px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-full border border-transparent border-solid focus:border--[#646CFF]  dark:focus:border--[#646CFF]  bg-athens-gray-200 hover:bg-athens-gray-100 dark:bg-athens-gray-800 dark:hover:bg-athens-gray-700 text-[#646cff]  dark:text-white transition-colors duration-250"
          >
            Rendering
          </Link>
          <Link
            to="/docs/"
            className="m-2 inline-block px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-full border border-transparent border-solid focus:border--[#646CFF]  dark:focus:border--[#646CFF]  bg-athens-gray-200 hover:bg-athens-gray-100 dark:bg-athens-gray-800 dark:hover:bg-athens-gray-700 text-[#646cff]  dark:text-white transition-colors duration-250"
          >
            Docs
          </Link>
        </div>
      </div>
      {codeBlock && (
        <div className="w-full lg:w-1/2 mb-8 lg:mb-0">
          <div className="relative w-full max-w-[500px] h-[300px] sm:h-[400px] md:h-[500px] mx-auto">
            <motion.div
              initial={false}
              animate={{ rotateY: showVideo ? 180 : 0 }}
              transition={{ duration: 0.6 }}
              style={{ transformStyle: "preserve-3d" }}
              className="w-full h-full"
            >
              <motion.div
                style={{
                  backfaceVisibility: "hidden",
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                }}
              >
                <CodeBlock
                  language={codeBlock.language}
                  code={codeBlock.code}
                />
              </motion.div>
              <motion.div
                style={{
                  backfaceVisibility: "hidden",
                  position: "absolute",
                  width: "100%",
                  height: "100%",
                  rotateY: 180,
                }}
              >
                <Preview className="relative z-0 bg-black h-full w-full">
                  <div className="w-[500px] h-[300px] sm:h-[400px] md:h-[500px]">
                    <TogglePlay className="absolute z-10 bottom-2 left-1/2 transform -translate-x-1/2 w-8 h-8">
                      <div slot="pause">
                        <div className="flex justify-center items-center w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-200 cursor-pointer">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="24"
                            height="24"
                            className="text-white"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                      </div>
                      <div slot="play">
                        <div className="flex justify-center items-center w-8 h-8 rounded-full bg-gray-800 dark:bg-gray-200 cursor-pointer">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            width="24"
                            height="24"
                            className="text-white"
                          >
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          </svg>
                        </div>
                      </div>
                    </TogglePlay>
                    <div
                      className="h-full w-full"
                      dangerouslySetInnerHTML={{
                        __html: codeBlock.code,
                      }}
                    />
                  </div>
                </Preview>
              </motion.div>
            </motion.div>
            <button
              onClick={toggleView}
              className="mt-4 px-4 sm:px-5 py-2 sm:py-3 text-xs sm:text-sm font-semibold rounded-full text-white bg-[#646CFF]  hover:bg-[#646CFF] transition-colors duration-250 flex items-center justify-center"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M15.707 4.293a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 011.414-1.414L10 8.586l4.293-4.293a1 1 0 011.414 0zm0 6a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-5-5a1 1 0 111.414-1.414L10 14.586l4.293-4.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              {showVideo ? "Show Code" : "Show Video"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
