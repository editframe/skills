import { useAnimate } from "framer-motion";
import type React from "react";
import { useEffect } from "react";

export const Framer: React.FC<{
  percentComplete: number;
  durationMs: number;
  text: string;
  ownCurrentTimeMs: number;
  color: string;
  font: string;
}> = ({ percentComplete, durationMs, text, ownCurrentTimeMs, color, font }) => {
  const [scope, animate] = useAnimate();

  useEffect(() => {
    animate(
      "#spinner",
      {
        rotate: [-10, 0],
        scale: [0.8, 1],
      },
      { duration: durationMs / 1000 / 2 },
    ).pause();

    animate(
      "h1",
      {
        opacity: [0, 1],
        y: [10, 0],
        rotate: [20, 0],
      },
      { duration: durationMs / 1000 / 2 },
    ).pause();

    animate(
      "#percent-complete",
      {
        scale: [1, 1.1, 1],
      },
      { duration: 0.2, repeat: Math.floor(8 + (durationMs / 1000) * 10) },
    ).pause();
    [...Array(10)].forEach((_, index) => {
      animate(
        `#circle-${index}`,
        {
          scale: [1, 1.5, 1],
          x: [0, Math.sin(index) * 100, 0],
          y: [0, Math.cos(index) * 100, 0],
          rotate: [0, 360, 720],
          opacity: [0.2, 1, 0.2],
        },
        {
          duration: durationMs / 1000,
          ease: "easeInOut",
          repeatType: "reverse",
        },
      ).pause();
    });

    [...Array(50)].forEach((_, index) => {
      const randomX = durationMs * 200 - 100;
      const randomY = durationMs * 200 - 100;
      animate(
        `#star-${index}`,
        {
          opacity: [0, 1, 0],
          scale: [0.5, 1, 0.5],
          x: [0, randomX, 0],
          y: [0, randomY, 0],
          rotate: [0, 360, 0],
        },
        {
          duration: (durationMs / 1000) * (1 + durationMs),
          ease: "easeInOut",
          repeatType: "reverse",
        },
      ).pause();
    });
  }, [animate, scope.current, durationMs]);

  useEffect(() => {
    for (const animation of scope.animations) {
      animation.time = percentComplete * (durationMs / 1000);
    }
  }, [scope.animations, percentComplete, durationMs]);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        background:
          "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
        overflow: "hidden",
        position: "relative",
        padding: "40px 0",
      }}
      ref={scope}
    >
      {[...Array(10)].map((_, index) => {
        const progress = ownCurrentTimeMs / durationMs;
        return (
          <div
            id={`circle-${index}`}
            key={`circle-${index}`}
            style={{
              position: "absolute",
              width: `${20 + progress * 10}px`,
              height: `${20 + progress * 10}px`,
              borderRadius: "50%",
              background: `rgba(255, 255, 255, ${0.05 + index * 0.01})`,
              filter: "blur(2px)",
            }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
        }}
      >
        {[...Array(50)].map((_, index) => {
          const progress = ownCurrentTimeMs / durationMs;
          return (
            <div
              id={`star-${index}`}
              key={`star-${index}`}
              style={{
                position: "absolute",
                width: "2px",
                height: "2px",
                borderRadius: "50%",
                backgroundColor: "white",
                left: `${progress * 100}%`,
                top: `${progress * 100}%`,
              }}
            />
          );
        })}
      </div>
      <div
        id="spinner"
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          borderRadius: "20px",
          padding: "30px",
          boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.37)",
          backdropFilter: "blur(8px)",
          border: "1px solid rgba(255, 255, 255, 0.18)",
          zIndex: 1,
          maxWidth: "80%",
          marginBottom: "60px",
        }}
      >
        <h1
          style={{
            color: color,
            fontFamily: font ?? "sans-serif",
            fontSize: "2.5em",
            fontWeight: "bold",
            textAlign: "center",
            margin: 0,
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          {text}
        </h1>
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <div
          style={{
            width: "80%",
            height: "20px",
            background: "rgba(255, 255, 255, 0.2)",
            borderRadius: "10px",
            overflow: "hidden",
            zIndex: 1,
            boxShadow: "0 0 10px rgba(0,0,0,0.3) inset",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${percentComplete * 100}%`,
              background: "linear-gradient(90deg, #4facfe 0%, #00f2fe 100%)",
              borderRadius: "10px",
            }}
          />
        </div>

        <p
          id="percent-complete"
          style={{
            color: "white",
            marginTop: "15px",
            fontSize: "1.5em",
            fontWeight: "bold",
            zIndex: 1,
            textShadow: "2px 2px 4px rgba(0,0,0,0.5)",
          }}
        >
          {Math.round(percentComplete * 100)}%
        </p>
      </div>
    </div>
  );
};
