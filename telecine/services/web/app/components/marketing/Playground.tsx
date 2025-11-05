import { useState, useCallback } from "react";
import { Link } from "react-router";
import classNames from "classnames";
import { CodeEditor } from "../CodeEditor";
import { EFPlayer } from "../EFPlayer";

export const Playground = ({
  presetCode = "{{code}}",
  html,
  css,
  code,
  className,
  children,
}: {
  presetCode: string;
  html?: string;
  css?: string;
  code?: string;
  className?: string;
  children?: React.ReactNode;
}) => {
  const [currentLanguage, setCurrentLanguage] = useState<
    "html" | "css" | "javascript"
  >(children ? "javascript" : "html");
  const [htmlCode, setHtmlCode] = useState(code || html || "");
  const [cssCode, setCssCode] = useState(css || "");
  const [jsxCode, setJsxCode] = useState(children);

  const handleCodeChange = useCallback(
    (value: string | undefined) => {
      if (value) {
        switch (currentLanguage) {
          case "html":
            setHtmlCode(value);
            break;
          case "css":
            setCssCode(value);
            break;
          case "javascript":
            setJsxCode(value);
            break;
        }
      }
    },
    [currentLanguage],
  );

  const toggleLanguage = () => {
    setCurrentLanguage((prev) => {
      if (prev === "javascript") return "css";
      if (prev === "css" && children) return "javascript";
      if (prev === "html") return "css";
      return "html";
    });
  };

  return (
    <div className=" py-6">
      <div className="flex flex-col space-y-8">
        <div className="grid xl:grid-cols-4 grid-cols-1 gap-x-6 items-center justify-center md:min-h-[400px]">
          <div className="col-span-2">
            <p className="text-xl  text-[#3C3C43] leading-[1.4] text-opacity-[78%] mt-3 ml-1 text-left  dark:text-gray-400">
              Update the code using{" "}
              {html || code ? (
                <>
                  <span className="text-[#646cff] dark:text-[#646cff]">
                    HTML
                  </span>{" "}
                  and{" "}
                </>
              ) : (
                <>
                  <span className="text-[#646cff] dark:text-[#646cff]">
                    React
                  </span>{" "}
                  and{" "}
                </>
              )}
              <span className="text-[#646cff] dark:text-[#646cff]">CSS</span> to
              watch the video change.
            </p>

            <div className="w-full h-full relative">
              {css && (
                <div className="flex mb-2 justify-end mr-1">
                  <div className="p-1 text-black dark:text-white text-[10px] rounded-full border border-black dark:border-white flex gap-2">
                    {html || code ? (
                      <button
                        onClick={toggleLanguage}
                        className={classNames(
                          "px-2 rounded-full text-black dark:text-white border-black dark:border-white",
                          currentLanguage === "html" ? "border" : "",
                        )}
                      >
                        HTML
                      </button>
                    ) : (
                      <button
                        onClick={toggleLanguage}
                        className={classNames(
                          "px-2 rounded-full text-black dark:text-white border-black dark:border-white",
                          currentLanguage === "javascript" ? "border" : "",
                        )}
                      >
                        React
                      </button>
                    )}

                    <button
                      onClick={toggleLanguage}
                      className={classNames(
                        "px-2 rounded-full text-black dark:text-white border-black dark:border-white",
                        currentLanguage === "css" ? "border" : "",
                      )}
                    >
                      CSS
                    </button>
                  </div>
                </div>
              )}
              <CodeEditor
                code={
                  currentLanguage === "javascript" && jsxCode
                    ? (jsxCode as string)
                    : currentLanguage === "html"
                      ? htmlCode
                      : cssCode
                }
                onChange={handleCodeChange}
                language={currentLanguage}
              />
              <div className="w-full  mt-[4.8rem]">
                <Link
                  className="block w-full  mb-4 underline py-2 lg:mb-0 max-w-full mx-auto text-center  mt-8 px-5 text-sm font-semibold cursor-pointer m-1 transition-colors duration-250 text-white bg-[#646CFF]  hover:bg-[#646CFF]  dark:bg-[#646CFF]  dark:hover:bg-[#646cff]-700"
                  to="/playground"
                >
                  Edit this example in the Editframe Playground
                </Link>
              </div>
            </div>
          </div>
          <div className="col-span-2">
            {jsxCode ? (
              <EFPlayer className={classNames("h-full w-full", className)}>
                {jsxCode}
                <style>{cssCode}</style>
              </EFPlayer>
            ) : (
              <EFPlayer
                className="lg:w-full w-[90vw] lg:h-full mx-auto"
                code={`<style>${cssCode}</style>${htmlCode.replace("{{code}}", presetCode)}`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
