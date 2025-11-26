import { useState } from "react";
import { EFPlayer } from "../EFPlayer";
import { Timegroup, useTimingInfo } from "@editframe/react";

export const PreviewVideo = () => {
  const [text, setText] = useState("Welcome to Editframe");
  const [color, setColor] = useState("#ffffff");
  const [font, setFont] = useState("sans-serif");

  const { percentComplete, durationMs, ownCurrentTimeMs, ref } =
    useTimingInfo();

  return (
    <div
      className="grid lg:grid-cols-2 grid-cols-1 gap-4 w-full justify-center items-center"
      style={{
        minHeight: "400px",
      }}
    >
      <div className="w-full">
        <h2 className="text-md mb-4 text-gray-900 dark:text-white font-semibold">
          Preview
        </h2>
        <label
          htmlFor="username"
          className="block text-md font-medium leading-6 text-gray-900 dark:text-white"
        >
          Your text
        </label>
        <div className="mt-2 w-full">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            id="text"
            name="text"
            type="text"
            placeholder="Your Text"
            className="block w-full rounded-md border-0 py-1.5 text-gray-900 dark:text-white bg-white dark:bg-athens-gray-950 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-700 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:ring-2 focus:ring-inset focus:ring-[#646CFF] dark:focus:ring--[#646CFF]  sm:text-sm sm:leading-6"
          />
        </div>
        <label
          htmlFor="color"
          className="block text-md font-medium leading-6 text-gray-900 dark:text-white"
        >
          Text color
        </label>
        <div className="mt-2 w-full">
          <input
            id="color"
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
          />
        </div>

        <label
          htmlFor="font"
          className="block text-md font-medium leading-6 text-gray-900 dark:text-white"
        >
          Font
        </label>
        <div className="mt-2 w-full">
          <select
            id="font"
            value={font}
            onChange={(e) => setFont(e.target.value)}
          >
            <option value="sans-serif">Sans-serif</option>
            <option value="serif">Serif</option>
            <option value="monospace">Monospace</option>
            <option value="cursive">Cursive</option>
          </select>
        </div>
      </div>

      <EFPlayer>
        <Timegroup
          ref={ref}
          mode="fixed"
          duration="5s"
          className="w-[400px] h-[400px] bg-black relative overflow-hidden"
        >
          <p
            className="text-white text-2xl font-bold"
            style={{ color: color, fontFamily: font }}
          >
            {text}
          </p>
          <p>{ownCurrentTimeMs}</p>
          <p>{durationMs}</p>
          <p>{percentComplete}</p>
        </Timegroup>
      </EFPlayer>
    </div>
  );
};
