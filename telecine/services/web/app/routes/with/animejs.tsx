import { useEffect, useLayoutEffect, useState, useRef } from "react";
import type { MetaFunction } from "react-router";
import { useLoaderData } from "react-router";
import "@editframe/elements";
import "@editframe/elements/styles.css";
import "prismjs/themes/prism-tomorrow.css";
import { TimelineControls } from "~/components/shared/TimelineControls";
import { Header } from "~/components/marketing/Header";
import { Footer } from "~/components/marketing/Footer";
import { maybeIdentityContext } from "~/middleware/context";
import { useTheme } from "~/hooks/useTheme";
import "~/styles/marketing.css";

// Declare custom elements for TypeScript
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "ef-timegroup": any;
    }
  }
}

import type { Route } from "./+types/animejs";

export const loader = async ({ context }: Route.LoaderArgs) => {
  const session = context.get(maybeIdentityContext);

  return {
    isLoggedIn: !!session,
  };
};

export const meta: MetaFunction = () => {
  return [
    { title: "AnimeJS Integration | Editframe" },
    {
      name: "description",
      content: "Interactive examples of AnimeJS animations with Editframe",
    },
  ];
};

export default function AnimeJSPage() {
  useTheme(); // Initialize theme before rendering
  const { isLoggedIn } = useLoaderData<typeof loader>();
  const [text1, setText1] = useState("Editframe ❤️ AnimeJS");
  const [text3, setText3] = useState("HELLO WAAPI");
  const [themeColor, setThemeColor] = useState("#4F46E5");
  const [mounted, setMounted] = useState(false);

  const section1Ref = useRef<HTMLDivElement>(null);
  const section2Ref = useRef<HTMLDivElement>(null);
  const section3Ref = useRef<HTMLDivElement>(null);
  const section4Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;

    const loadAnimeJS = async () => {
      const { animate, splitText, stagger } = (await import(
        "animejs" as any
      )) as any;

      if (section1Ref.current) {
        const h2 = section1Ref.current.querySelector("h2");
        const timegroup = section1Ref.current.querySelector(
          "ef-timegroup",
        ) as any;
        if (h2 && timegroup) {
          timegroup.clearFrameTasks?.();

          h2.textContent = text1;
          const { chars } = splitText(h2, { words: false, chars: true });

          const textAnimation = animate(chars, {
            y: [
              { to: "-2.75rem", ease: "outExpo", duration: 600 },
              { to: 0, ease: "outBounce", duration: 800, delay: 100 },
            ],
            rotate: {
              from: "-1turn",
              delay: 0,
            },
            delay: stagger(50),
            ease: "inOutCirc",
            autoplay: false,
          });

          const currentTime = timegroup.ownCurrentTimeMs || 0;
          textAnimation.currentTime = currentTime;

          timegroup.addFrameTask(({ ownCurrentTimeMs }: any) => {
            textAnimation.currentTime = ownCurrentTimeMs;
          });
        }
      }
    };

    loadAnimeJS();
  }, [mounted, text1]);

  useLayoutEffect(() => {
    if (!mounted) return;

    const loadAnimeJS = async () => {
      const { animate, createTimeline } = (await import(
        "animejs" as any
      )) as any;

      if (section2Ref.current) {
        const square = section2Ref.current.querySelector(".square");
        const circle = section2Ref.current.querySelector(".circle");
        const triangle = section2Ref.current.querySelector(".triangle");
        const timegroup = section2Ref.current.querySelector(
          "ef-timegroup",
        ) as any;

        if (square && circle && triangle && timegroup) {
          timegroup.clearFrameTasks?.();

          const timeline = createTimeline({
            defaults: { duration: 750 },
            autoplay: false,
          });

          timeline
            .label("start")
            .add(square, { x: "15rem" }, 500)
            .add(circle, { x: "15rem" }, "start")
            .add(triangle, { x: "15rem", rotate: "1turn" }, "<-=500");

          const currentTime = timegroup.ownCurrentTimeMs || 0;
          timeline.currentTime = currentTime;

          timegroup.addFrameTask(({ ownCurrentTimeMs }: any) => {
            timeline.currentTime = ownCurrentTimeMs;
          });
        }
      }
    };

    loadAnimeJS();
  }, [mounted]);

  useLayoutEffect(() => {
    if (!mounted) return;

    const loadAnimeJS = async () => {
      const { waapi, splitText, stagger } = (await import(
        "animejs" as any
      )) as any;

      if (section3Ref.current) {
        const h2 = section3Ref.current.querySelector("h2");
        const timegroup = section3Ref.current.querySelector(
          "ef-timegroup",
        ) as any;
        if (h2 && timegroup) {
          timegroup.clearFrameTasks?.();

          h2.textContent = text3;
          const { chars } = splitText(h2, { words: false, chars: true });

          const waapiAnimation = waapi.animate(chars, {
            translate: `0 -2rem`,
            delay: stagger(100),
            duration: 600,
            alternate: true,
            loop: true,
            ease: "inOut(2)",
            autoplay: false,
          });

          const currentTime = timegroup.ownCurrentTimeMs || 0;
          waapiAnimation.currentTime = currentTime;

          timegroup.addFrameTask(({ ownCurrentTimeMs }: any) => {
            waapiAnimation.currentTime = ownCurrentTimeMs;
          });
        }
      }
    };

    loadAnimeJS();
  }, [mounted, text3]);

  useLayoutEffect(() => {
    if (!mounted) return;

    const loadAnimeJS = async () => {
      const { animate, svg } = (await import("animejs" as any)) as any;

      if (section4Ref.current) {
        const car = section4Ref.current.querySelector(".car");
        const suzukaPath = section4Ref.current.querySelector("#suzuka");
        const timegroup = section4Ref.current.querySelector(
          "ef-timegroup",
        ) as any;

        if (car && suzukaPath && timegroup) {
          timegroup.clearFrameTasks?.();

          const carAnimation = animate(car, {
            ease: "linear",
            duration: 5000,
            autoplay: false,
            ...svg.createMotionPath(suzukaPath),
          });

          const lineAnimation = animate(svg.createDrawable(suzukaPath), {
            draw: "0 1",
            ease: "linear",
            duration: 5000,
            autoplay: false,
          });

          const currentTime = timegroup.ownCurrentTimeMs || 0;
          carAnimation.currentTime = currentTime;
          lineAnimation.currentTime = currentTime;

          timegroup.addFrameTask(({ ownCurrentTimeMs }: any) => {
            carAnimation.currentTime = ownCurrentTimeMs;
            lineAnimation.currentTime = ownCurrentTimeMs;
          });
        }
      }
    };

    loadAnimeJS();
  }, [mounted]);

  useLayoutEffect(() => {
    if (!mounted) return;

    const loadPrism = async () => {
      const Prism = (await import("prismjs")).default;
      await import("prismjs/components/prism-javascript" as any);
      await import("prismjs/components/prism-bash" as any);
      Prism.highlightAll();
    };

    loadPrism();
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
        <Header isLoggedIn={isLoggedIn} />
        <div className="min-h-screen" />
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">
      <Header isLoggedIn={isLoggedIn} />

      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-b from-white to-gray-50 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6">
              AnimeJS + Editframe
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 max-w-3xl mx-auto leading-relaxed">
              Create stunning animations in your videos with AnimeJS
              integration. Edit the text and colors below to see the changes in
              real-time.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="relative py-20 bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-800">
        <div className="container mx-auto px-6">
          <div className="max-w-6xl mx-auto">
            {/* Getting Started */}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-100 dark:border-blue-900/50 rounded-xl p-8 mb-16">
              <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-3">
                Get Started
              </h2>
              <p className="text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
                Create a new project with the AnimeJS template using our
                developer sandbox:
              </p>
              <pre className="!mt-0 bg-slate-900 dark:bg-slate-900/50 text-gray-100 dark:text-slate-100 px-4 py-3 rounded-lg overflow-x-auto border border-slate-800 dark:border-slate-800 shadow-lg dark:ring-1 dark:ring-slate-300/10">
                <code className="language-bash">
                  npm create @editframe@beta -- animejs
                </code>
              </pre>
            </div>

            {/* Section 1: SplitText + Stagger */}
            <div ref={section1Ref} className="mb-16">
              <h3 className="text-3xl font-semibold text-slate-900 dark:text-white mb-4">
                SplitText + Stagger Animation
              </h3>

              {/* Section 1 Controls */}
              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Text
                  </label>
                  <input
                    type="text"
                    value={text1}
                    onChange={(e) => setText1(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300/75 dark:border-slate-700/75 rounded-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/85 transition-all duration-150"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-full h-10 rounded border border-slate-300/75 dark:border-slate-700/75 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <div className="w-full aspect-[16/9] rounded-lg overflow-hidden shadow-lg relative">
                    <ef-timegroup
                      id="section1-timegroup"
                      mode="fixed"
                      duration="2s"
                      loop
                      autoplay
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: themeColor,
                          color: "white",
                        }}
                      >
                        <h2 className="text-4xl font-bold"></h2>
                      </div>
                    </ef-timegroup>
                  </div>
                  <TimelineControls target="section1-timegroup" />
                </div>
                <div className="flex-1">
                  <pre className="!mt-0 rounded-lg overflow-hidden bg-slate-900 dark:bg-slate-900/50 border border-slate-800 dark:border-slate-800 shadow-lg dark:ring-1 dark:ring-slate-300/10">
                    <code className="language-javascript">{`const { chars } = splitText("h2", { chars: true });

const textAnimation = animate(chars, {
  y: [
    { to: "-2.75rem", ease: "outExpo" },
    { to: 0, ease: "outBounce" }
  ],
  rotate: { from: "-1turn" },
  delay: stagger(50),
  autoplay: false
});

timegroup.addFrameTask(({ ownCurrentTimeMs }) => {
  textAnimation.currentTime = ownCurrentTimeMs;
});`}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Section 2: Timeline with Pyramid */}
            <div ref={section2Ref} className="mb-16">
              <h3 className="text-3xl font-semibold text-slate-900 dark:text-white mb-4">
                Timeline with Labels & Relative Positioning
              </h3>

              {/* Section 2 Controls */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Background Color
                </label>
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-48 h-10 rounded border border-slate-300/75 dark:border-slate-700/75 cursor-pointer"
                />
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <div className="w-full aspect-[16/9] rounded-lg overflow-hidden shadow-lg relative">
                    <ef-timegroup
                      id="section2-timegroup"
                      mode="fixed"
                      duration="2.5s"
                      loop
                      autoplay
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-start",
                          paddingLeft: "4rem",
                          backgroundColor: themeColor,
                          color: "white",
                        }}
                      >
                        <div className="flex flex-col gap-4 items-center">
                          <div
                            className="triangle"
                            style={{
                              width: 0,
                              height: 0,
                              borderLeft: "2rem solid transparent",
                              borderRight: "2rem solid transparent",
                              borderBottom: "3.5rem solid #93c5fd",
                            }}
                          ></div>
                          <div
                            className="square"
                            style={{
                              width: "4rem",
                              height: "4rem",
                              background: "#93c5fd",
                            }}
                          ></div>
                          <div
                            className="circle"
                            style={{
                              width: "4rem",
                              height: "4rem",
                              background: "#93c5fd",
                              borderRadius: "50%",
                            }}
                          ></div>
                        </div>
                      </div>
                    </ef-timegroup>
                  </div>
                  <TimelineControls target="section2-timegroup" />
                </div>
                <div className="flex-1">
                  <pre className="!mt-0 rounded-lg overflow-hidden bg-slate-900 dark:bg-slate-900/50 border border-slate-800 dark:border-slate-800 shadow-lg dark:ring-1 dark:ring-slate-300/10">
                    <code className="language-javascript">{`const timeline = createTimeline({ 
  defaults: { duration: 750 },
  autoplay: false
});

timeline
  .label("start")
  .add(".square", { x: "15rem" }, 500)
  .add(".circle", { x: "15rem" }, "start")
  .add(".triangle", { x: "15rem", rotate: "1turn" }, "<-=500");

timegroup.addFrameTask(({ ownCurrentTimeMs }) => {
  timeline.currentTime = ownCurrentTimeMs;
});`}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Section 3: WAAPI Demo */}
            <div ref={section3Ref} className="mb-16">
              <h3 className="text-3xl font-semibold text-slate-900 dark:text-white mb-4">
                Web Animations API (WAAPI)
              </h3>

              {/* Section 3 Controls */}
              <div className="mb-4 flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Text
                  </label>
                  <input
                    type="text"
                    value={text3}
                    onChange={(e) => setText3(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300/75 dark:border-slate-700/75 rounded-md bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/85 transition-all duration-150"
                  />
                </div>
                <div className="w-48">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={themeColor}
                    onChange={(e) => setThemeColor(e.target.value)}
                    className="w-full h-10 rounded border border-slate-300/75 dark:border-slate-700/75 cursor-pointer"
                  />
                </div>
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <div className="w-full aspect-[16/9] rounded-lg overflow-hidden shadow-lg relative">
                    <ef-timegroup
                      id="section3-timegroup"
                      mode="fixed"
                      duration="2.4s"
                      loop
                      autoplay
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: themeColor,
                          color: "white",
                        }}
                      >
                        <h2 className="text-4xl font-bold"></h2>
                      </div>
                    </ef-timegroup>
                  </div>
                  <TimelineControls target="section3-timegroup" />
                </div>
                <div className="flex-1">
                  <pre className="!mt-0 rounded-lg overflow-hidden bg-slate-900 dark:bg-slate-900/50 border border-slate-800 dark:border-slate-800 shadow-lg dark:ring-1 dark:ring-slate-300/10">
                    <code className="language-javascript">{`const { chars } = splitText("h2", { chars: true });

waapi.animate(chars, {
  translate: "0 -2rem",
  delay: stagger(100),
  duration: 600,
  alternate: true,
  loop: true,
  ease: "inOut(2)",
  autoplay: false
});`}</code>
                  </pre>
                </div>
              </div>
            </div>

            {/* Section 4: Motion Path + SVG */}
            <div ref={section4Ref} className="mb-16">
              <h3 className="text-3xl font-semibold text-slate-900 dark:text-white mb-4">
                SVG Motion Path + Line Drawing
              </h3>

              {/* Section 4 Controls */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Background Color
                </label>
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => setThemeColor(e.target.value)}
                  className="w-48 h-10 rounded border border-slate-300/75 dark:border-slate-700/75 cursor-pointer"
                />
              </div>

              <div className="flex flex-col lg:flex-row gap-6">
                <div className="flex-1 space-y-2">
                  <div className="w-full aspect-[16/9] rounded-lg overflow-hidden shadow-lg relative">
                    <ef-timegroup
                      id="section4-timegroup"
                      mode="fixed"
                      duration="5s"
                      loop
                      autoplay
                      style={{
                        position: "absolute",
                        inset: 0,
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: themeColor,
                          color: "white",
                        }}
                      >
                        <div
                          className="relative"
                          style={{ width: "304px", height: "112px" }}
                        >
                          <svg
                            id="motion-path"
                            viewBox="0 0 304 112"
                            width="304"
                            height="112"
                          >
                            <title>Suzuka</title>
                            <g stroke="none" fill="none" fillRule="evenodd">
                              <path
                                d="M189.142857,4 C227.456875,4 248.420457,4.00974888 256.864191,4.00974888 C263.817211,4.00974888 271.61219,3.69583517 274.986231,6.63061513 C276.382736,7.84531176 279.193529,11.3814152 280.479499,13.4815847 C281.719344,15.5064248 284.841964,20.3571626 275.608629,20.3571626 C265.817756,20.3571626 247.262478,19.9013915 243.955117,19.9013915 C239.27946,19.9013915 235.350655,24.7304885 228.6344,24.7304885 C224.377263,24.7304885 219.472178,21.0304113 214.535324,21.0304113 C207.18393,21.0304113 200.882842,30.4798911 194.124187,30.4798911 C186.992968,30.4798911 182.652552,23.6245972 173.457298,23.6245972 C164.83277,23.6245972 157.191045,31.5424105 157.191045,39.1815359 C157.191045,48.466779 167.088672,63.6623005 166.666679,66.9065088 C166.378668,69.1206889 155.842137,79.2568633 151.508744,77.8570506 C145.044576,75.7689355 109.126667,61.6405346 98.7556561,52.9785141 C96.4766876,51.0750861 89.3680347,39.5769094 83.4195005,38.5221785 C80.6048001,38.0231057 73.0179337,38.7426555 74.4158694,42.6956376 C76.7088819,49.1796531 86.3280337,64.1214904 87.1781062,66.9065088 C88.191957,70.2280995 86.4690152,77.0567847 82.2060607,79.2503488 C79.2489435,80.7719756 73.1324132,82.8858479 64.7015706,83.0708761 C55.1604808,83.2802705 44.4254811,80.401884 39.1722168,80.401884 C25.7762119,80.401884 24.3280517,89.1260466 22.476679,94.4501705 C21.637667,96.8629767 20.4337535,108 33.2301959,108 C37.8976087,108 45.0757044,107.252595 53.4789069,103.876424 C61.8821095,100.500252 122.090049,78.119656 128.36127,75.3523302 C141.413669,69.5926477 151.190142,68.4987755 147.018529,52.0784879 C143.007818,36.291544 143.396957,23.4057975 145.221196,19.6589263 C146.450194,17.1346449 148.420955,14.8552817 153.206723,15.7880203 C155.175319,16.1716965 155.097637,15.0525421 156.757598,11.3860986 C158.417558,7.71965506 161.842736,4.00974888 167.736963,4.00974888 C177.205308,4.00974888 184.938832,4 189.142857,4 Z"
                                stroke="currentColor"
                                strokeWidth="2"
                                opacity="0.35"
                              ></path>
                              <path
                                d="M189.142857,4 C227.456875,4 248.420457,4.00974888 256.864191,4.00974888 C263.817211,4.00974888 271.61219,3.69583517 274.986231,6.63061513 C276.382736,7.84531176 279.193529,11.3814152 280.479499,13.4815847 C281.719344,15.5064248 284.841964,20.3571626 275.608629,20.3571626 C265.817756,20.3571626 247.262478,19.9013915 243.955117,19.9013915 C239.27946,19.9013915 235.350655,24.7304885 228.6344,24.7304885 C224.377263,24.7304885 219.472178,21.0304113 214.535324,21.0304113 C207.18393,21.0304113 200.882842,30.4798911 194.124187,30.4798911 C186.992968,30.4798911 182.652552,23.6245972 173.457298,23.6245972 C164.83277,23.6245972 157.191045,31.5424105 157.191045,39.1815359 C157.191045,48.466779 167.088672,63.6623005 166.666679,66.9065088 C166.378668,69.1206889 155.842137,79.2568633 151.508744,77.8570506 C145.044576,75.7689355 109.126667,61.6405346 98.7556561,52.9785141 C96.4766876,51.0750861 89.3680347,39.5769094 83.4195005,38.5221785 C80.6048001,38.0231057 73.0179337,38.7426555 74.4158694,42.6956376 C76.7088819,49.1796531 86.3280337,64.1214904 87.1781062,66.9065088 C88.191957,70.2280995 86.4690152,77.0567847 82.2060607,79.2503488 C79.2489435,80.7719756 73.1324132,82.8858479 64.7015706,83.0708761 C55.1604808,83.2802705 44.4254811,80.401884 39.1722168,80.401884 C25.7762119,80.401884 24.3280517,89.1260466 22.476679,94.4501705 C21.637667,96.8629767 20.4337535,108 33.2301959,108 C37.8976087,108 45.0757044,107.252595 53.4789069,103.876424 C61.8821095,100.500252 122.090049,78.119656 128.36127,75.3523302 C141.413669,69.5926477 151.190142,68.4987755 147.018529,52.0784879 C143.007818,36.291544 143.396957,23.4057975 145.221196,19.6589263 C146.450194,17.1346449 148.420955,14.8552817 153.206723,15.7880203 C155.175319,16.1716965 155.097637,15.0525421 156.757598,11.3860986 C158.417558,7.71965506 161.842736,4.00974888 167.736963,4.00974888 C177.205308,4.00974888 184.938832,4 189.142857,4 Z"
                                id="suzuka"
                                stroke="currentColor"
                                strokeWidth="2"
                              ></path>
                            </g>
                          </svg>
                          <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                            <div
                              className="car absolute w-4 h-2 bg-blue-100 rounded"
                              style={{
                                marginLeft: "-8px",
                                marginTop: "-4px",
                                transformOrigin: "50% 50%",
                              }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </ef-timegroup>
                  </div>
                  <TimelineControls target="section4-timegroup" />
                </div>
                <div className="flex-1">
                  <pre className="!mt-0 rounded-lg overflow-hidden bg-slate-900 dark:bg-slate-900/50 border border-slate-800 dark:border-slate-800 shadow-lg dark:ring-1 dark:ring-slate-300/10">
                    <code className="language-javascript">{`const carAnimation = animate(".car", {
  ...svg.createMotionPath("#suzuka"),
  ease: "linear",
  duration: 5000,
  autoplay: false
});

const lineAnimation = animate(svg.createDrawable("#suzuka"), {
  draw: "0 1",
  ease: "linear",
  duration: 5000,
  autoplay: false
});

timegroup.addFrameTask(({ ownCurrentTimeMs }) => {
  carAnimation.currentTime = ownCurrentTimeMs;
  lineAnimation.currentTime = ownCurrentTimeMs;
});`}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
