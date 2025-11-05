import { useAnimate, type AnimationScope } from "framer-motion";
import { useEffect, useMemo, useRef } from "react";

export const Framer: React.FC<{
  percentComplete: number;
  durationMs: number;
  ownCurrentTimeMs: number;
  repoData: {
    stars: number;
    forks: number;
    owner: string;
    description: string;
    id: string;
    open_issues_count: number;
  };
}> = ({ durationMs, ownCurrentTimeMs, repoData, percentComplete }) => {
  const [scope, animate] = useAnimate();
  const contentRef = useRef<HTMLDivElement>(null);

  const currentSlide = useMemo(() => {
    const totalSlides = 5;
    const slideTime = durationMs / totalSlides;
    return Math.min(Math.floor(ownCurrentTimeMs / slideTime), totalSlides - 1);
  }, [ownCurrentTimeMs, durationMs]);

  useEffect(() => {
    animate(
      "#progress-bar-fill",
      { scaleX: [0, percentComplete] },
      { duration: 0.5, ease: "linear" }
    );
    animate(
      "#background",
      { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] },
      { duration: durationMs / 1000 }
    )
  }, [animate, scope, durationMs, percentComplete]);

  useEffect(() => {
    (scope as AnimationScope).animations.forEach(animation => {
      animation.time = percentComplete * (durationMs / 1000);
    });
  }, [(scope as AnimationScope).animations, percentComplete, durationMs]);

  useEffect(() => {
    if (contentRef.current) {
      animate(
        "#content",
        { y: [20, 0], opacity: [0, 1], scale: [0.9, 1] },
        { duration: 0.5, delay: 0.2 }
      )
    }
    return () => { };
  }, [currentSlide, animate]);
  useEffect(() => {
    animate;
  });
  return (
    <div
      ref={scope}
      className="w-full h-full"
    >
      <div id="background"
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #646CFF 0%, #191414 100%)",
          backgroundSize: "400% 400%",
          overflow: "hidden",
          position: "relative",
          padding: "40px 0",
          fontFamily: "'Circular Std', sans-serif",
        }}>
        <div
          id="progress-bar"
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: "4px",
            width: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.3)",
          }}
        >
          <div
            id="progress-bar-fill"
            style={{
              height: "100%",
              width: "100%",
              backgroundColor: "rgba(255, 255, 255, 0.9)",
              transformOrigin: "left",
            }}
          />
        </div>
        {Number.isNaN(currentSlide) && (
          <div
            style={{
              width: "80%",
              textAlign: "center",
              color: "white",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: "3em", fontWeight: "bold", marginBottom: "20px", }}>
                Your GitHub Year in Review
              </div>
              <div style={{ fontSize: "2em", marginTop: "20px" }}>
                {repoData.owner}
              </div>
            </div>
          </div>
        )}
        <div
          id="content"
          ref={contentRef}
          style={{
            width: "80%",
            textAlign: "center",
            color: "white",
          }}
        >
          {currentSlide === 0 && (
            <div>
              <h2 style={{ fontSize: "2.5em", marginBottom: "20px", }}>
                You've earned
              </h2>
              <p
                style={{
                  fontSize: "6em",
                  fontWeight: "bold",
                  margin: "20px 0",
                }}
              >
                {repoData.stars}
              </p>
              <h2 style={{ fontSize: "2.5em", }}>stars this year!</h2>
            </div>
          )}
          {currentSlide === 1 && (
            <div>
              <h2 style={{ fontSize: "2.5em", marginBottom: "20px", }}>
                Your projects were forked
              </h2>
              <p
                style={{
                  fontSize: "6em",
                  fontWeight: "bold",
                  margin: "20px 0",
                }}
              >
                {repoData.forks}
              </p>
              <h2 style={{ fontSize: "2.5em", }}>times!</h2>
            </div>
          )}
          {currentSlide === 2 && (
            <div>
              <h2 style={{ fontSize: "2.5em", marginBottom: "20px", }}>
                You've tackled
              </h2>
              <p
                style={{
                  fontSize: "6em",
                  fontWeight: "bold",
                  margin: "20px 0",
                }}
              >
                {repoData.open_issues_count}
              </p>
              <h2 style={{ fontSize: "2.5em", }}>open issues!</h2>
            </div>
          )}
          {currentSlide === 3 && (
            <div>
              <h2 style={{ fontSize: "2.5em", marginBottom: "20px", }}>
                Congratulations,
              </h2>
              <p
                style={{
                  fontSize: "4em",
                  fontWeight: "bold",
                  margin: "20px 0",
                }}
              >
                {repoData.owner}!
              </p>
              <h2 style={{ fontSize: "2.5em", }}>You're a GitHub superstar!</h2>
            </div>
          )}
          {currentSlide === 4 && (
            <div>
              <h2 style={{ fontSize: "2.5em", marginBottom: "20px", }}>
                This video was made using
              </h2>
              <p
                style={{
                  fontSize: "4em",
                  fontWeight: "bold",
                  margin: "20px 0",
                }}
              >
                Editframe
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
