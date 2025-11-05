import { useState, useEffect } from "react";
import {
  Preview,
  Timegroup,
  useTimingInfo,
  TogglePlay,
} from "@editframe/react";
import { Framer } from "./GithubFramer";
import { useRef } from "react";
import type { EFPreview } from "@editframe/elements";
import { useCallback } from "react";
import { formatTime } from "~/lib/formatTime";

export const GithubWrapped = () => {
  const { percentComplete, durationMs, ownCurrentTimeMs, ref } =
    useTimingInfo();
  const [repoUrl, setRepoUrl] = useState(
    "https://github.com/freeCodeCamp/freeCodeCamp",
  );
  const [repoData, setRepoData] = useState<{
    stars: number;
    forks: number;
    owner: string;
    description: string;
    id: string;
    open_issues_count: number;
  } | null>(null);
  const previewRef = useRef<EFPreview>(null);

  useEffect(() => {
    const storedData = localStorage.getItem(repoUrl);
    if (storedData) {
      setRepoData(JSON.parse(storedData));
    } else {
      const fetchRepoData = async () => {
        try {
          const urlParts = repoUrl.split("/");
          const repoOwner = urlParts[urlParts.length - 2];
          const repoName = urlParts[urlParts.length - 1];
          const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}`;
          const response = await fetch(apiUrl);
          if (response.ok && response.status === 200) {
            const data = await response.json();
            const newRepoData = {
              stars: data.stargazers_count,
              forks: data.forks_count,
              owner: data.owner.login,
              description: data.description,
              open_issues_count: data.open_issues_count,
              id: `${repoOwner}/${repoName}`,
            };
            setRepoData(newRepoData);
            localStorage.setItem(repoUrl, JSON.stringify(newRepoData));
            if (previewRef.current) {
              previewRef.current.pause();
              previewRef.current.currentTimeMs = 0;
            }
          } else {
            console.error("Error fetching repo data: Response not OK");
          }
        } catch (error) {
          console.error("Error fetching repo data:", error);
        }
      };

      fetchRepoData();
    }
  }, [repoUrl]);

  const handleTimelineChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (ref.current) {
        const newTime = (Number.parseFloat(e.target.value) / 100) * durationMs;
        ref.current.currentTime = newTime / 1000; // Convert ms to seconds
      }
    },
    [ref, durationMs],
  );
  return (
    <div className="w-full">
      <div className="px-2 w-full">
        <div className="flow-root w-full">
          <div className="flex flex-col w-full">
            <div className="w-full">
              <div
                className="grid lg:grid-cols-6 grid-cols-1 gap-4 w-full justify-center"
                style={{
                  minHeight: "500px",
                }}
              >
                <div className="col-span-3 w-full">
                  <div className="w-full mb-8">
                    <h3 className="my-0 mx-auto text-2xl lg:text-5xl font-bold tracking-tight leading-10 text-gray-900 dark:text-white whitespace-pre-wrap break-words lg:m-0">
                      Build
                      <span className="text-[#646CFF] dark:text-[#646cff] ">
                        {" "}
                        Interactive
                      </span>{" "}
                      Applications
                    </h3>
                    <p className="pt-4 text-[#3C3C43] dark:text-gray-300 my-0 mx-auto text-md leading-7 text-left whitespace-pre-wrap break-words sm:pt-3 sm:text-lg sm:leading-8 lg:m-0 lg:text-xl lg:leading-9 scroll-auto">
                      The video will update in real-time as data changes.
                    </p>
                  </div>
                  <label
                    htmlFor="repoUrl"
                    className="block text-md font-medium leading-6 text-gray-900 dark:text-white"
                  >
                    Your Github Repo URL
                  </label>
                  <div className="mt-2 w-full">
                    <input
                      defaultValue={repoUrl}
                      value={repoUrl}
                      onChange={(e) => setRepoUrl(e.target.value)}
                      id="repoUrl"
                      name="repoUrl"
                      type="text"
                      placeholder="https://github.com/username/repo"
                      className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white bg-white dark:bg-athens-gray-950 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#646CFF] dark:focus:ring--[#646CFF]  sm:text-sm sm:leading-6"
                    />
                  </div>
                </div>
                <div className="relative col-span-3 ">
                  <Preview
                    ref={previewRef}
                    className="mx-auto z-0 bg-transparent w-full h-full"
                    style={{
                      minHeight: "500px",
                    }}
                  >
                    <div className="w-[500px] h-[500px]">
                      <TogglePlay className="absolute z-1000  bottom-5 left-1 w-2 h-2">
                        <div slot="pause">
                          <div className="flex justify-center items-center w-8 h-8 rounded-full bg-transparent cursor-pointer">
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
                          <div className="flex justify-center items-center w-8 h-8 rounded-full bg-transparent cursor-pointer">
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
                      <Timegroup
                        ref={ref}
                        mode="sequence"
                        className="w-full h-full absolute top-0 left-0 right-0"
                      >
                        <Timegroup
                          className="bg-white w-full h-full"
                          mode="fixed"
                          duration="5s"
                          ref={ref}
                        >
                          {repoData && (
                            <Framer
                              percentComplete={percentComplete}
                              ownCurrentTimeMs={ownCurrentTimeMs}
                              durationMs={durationMs}
                              repoData={repoData}
                            />
                          )}
                        </Timegroup>
                      </Timegroup>
                    </div>
                  </Preview>
                  <div className="mt-6 px- absolute bottom-0 left-0 right-0">
                    <div className="flex w-max z-[100] absolute bottom-4 left-10 justify-between text-xs font-medium text-white my-2">
                      <span>
                        {formatTime(ownCurrentTimeMs)} /{" "}
                        {formatTime(durationMs)}{" "}
                      </span>
                    </div>
                    <div className="relative  z-1000 mb-2 w-full h-[5px] overflow-hidden">
                      <div className="absolute rounded-full top-0 mx-2 right-2 left-2 w-[95%] h-full  bg-white/25  ease-in-out" />
                      <div className="absolute rounded-full top-0 mx-2 right-2 left-2 w-[95%] h-full  ease-in-out">
                        <div
                          className="w-full rounded-full h-full bg-white"
                          style={{ width: `calc(${percentComplete * 100}%)` }}
                        />
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        step="0.1"
                        value={percentComplete * 100}
                        onChange={handleTimelineChange}
                        className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
