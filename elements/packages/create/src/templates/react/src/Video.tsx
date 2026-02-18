import React from "react";
import { Timegroup, Text } from "@editframe/react";

export const Video = () => {
  return (
    <Timegroup
      workbench
      className="w-[1920px] h-[1080px] bg-black flex items-center justify-center relative overflow-hidden"
      mode="sequence"
    >
      {/* Add your composition here */}
      <Timegroup
        mode="fixed"
        duration="5s"
        className="absolute w-full h-full flex items-center justify-center"
      >
        <Text duration="5s" className="text-white text-4xl">
          Your video starts here
        </Text>
      </Timegroup>
    </Timegroup>
  );
};
