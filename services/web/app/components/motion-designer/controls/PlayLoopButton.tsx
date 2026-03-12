import React, { useState, useEffect } from "react";
import { ArrowClockwise } from "@phosphor-icons/react";

interface PlayLoopButtonProps {
  targetId: string;
  className?: string;
  activeClassName?: string;
  iconSize?: number;
}

function useLoopState(timegroupId: string | null) {
  const [isLoopEnabled, setIsLoopEnabled] = useState(false);

  useEffect(() => {
    if (!timegroupId) {
      setIsLoopEnabled(false);
      return;
    }

    const checkLoopState = () => {
      const timegroupElement = document.getElementById(timegroupId) as any;
      if (timegroupElement) {
        const loopAttr = timegroupElement.getAttribute("loop");
        const loopProp = timegroupElement.loop;

        if (loopAttr !== null) {
          setIsLoopEnabled(loopAttr === "true" || loopAttr === "");
        } else {
          setIsLoopEnabled(loopProp === true);
        }
      } else {
        setIsLoopEnabled(false);
      }
    };

    checkLoopState();

    const timegroupElement = document.getElementById(timegroupId);
    if (timegroupElement) {
      const observer = new MutationObserver(checkLoopState);
      observer.observe(timegroupElement, {
        attributes: true,
        attributeFilter: ["loop"],
      });

      const intervalId = setInterval(checkLoopState, 100);

      return () => {
        observer.disconnect();
        clearInterval(intervalId);
      };
    }
  }, [timegroupId]);

  return isLoopEnabled;
}

export function PlayLoopButton({
  targetId,
  className = "",
  activeClassName = "",
  iconSize = 14,
}: PlayLoopButtonProps) {
  const isLoopEnabled = useLoopState(targetId);

  const handleClick = () => {
    const timegroupElement = document.getElementById(targetId) as any;
    if (!timegroupElement) return;

    // Toggle loop state only - don't touch play/pause
    // Loop is independent: it just controls whether playback loops when it reaches the end
    const currentLoop = timegroupElement.getAttribute("loop");
    const newLoopState =
      currentLoop === "true" || currentLoop === "" ? "false" : "true";
    timegroupElement.setAttribute("loop", newLoopState);

    // Also set property for immediate effect
    timegroupElement.loop = newLoopState === "true" || newLoopState === "";
  };

  const finalClassName =
    isLoopEnabled && activeClassName
      ? `${className} ${activeClassName}`.trim()
      : className;

  return (
    <>
      <button
        onClick={handleClick}
        className={finalClassName}
        aria-label="Toggle loop"
        aria-pressed={isLoopEnabled}
      >
        <ArrowClockwise size={iconSize} weight="fill" />
      </button>
    </>
  );
}
