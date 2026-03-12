import { useEffect, useLayoutEffect, useState } from "react";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import "@editframe/elements";
import "@editframe/elements/styles.css";
import "prismjs/themes/prism-tomorrow.css";
import { TimelineControls } from "~/components/shared/TimelineControls";
import { Navigation } from "~/components/landing-v5/Navigation";
import { FooterSection } from "~/components/landing-v5/sections/FooterSection";
import { useTheme } from "~/hooks/useTheme";
import "~/styles/landing.css";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "ef-timegroup": any;
    }
  }
}

import type { Route } from "./+types/svg";

export const loader = async (_: Route.LoaderArgs) => {
  return {};
};

export const meta: MetaFunction = () => {
  return [
    { title: "SVG SMIL | Editframe" },
    {
      name: "description",
      content:
        "Scrubable, frame-accurate SVG SMIL animations with Editframe — no JavaScript library required.",
    },
  ];
};

export default function SVGPage() {
  useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    const loadPrism = async () => {
      const Prism = (await import("prismjs")).default;
      Prism.highlightAll();
    };
    loadPrism();
  }, [mounted]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] text-[var(--ink-black)]">
        <Navigation />
        <div className="min-h-screen" />
        <FooterSection />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] text-[var(--ink-black)]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 border-b-4 border-[var(--ink-black)] dark:border-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="max-w-4xl">
            <p className="text-sm font-bold uppercase tracking-widest text-[var(--poster-red)] mb-4">
              Integration
            </p>
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter uppercase leading-none mb-6">
              SVG SMIL
            </h1>
            <p className="text-2xl font-black tracking-tighter uppercase text-[var(--warm-gray)] mb-8">
              + Editframe
            </p>
            <p className="text-lg text-[var(--warm-gray)] max-w-2xl">
              Declarative SVG animations — no JavaScript library required. Place
              any animated SVG inside{" "}
              <code className="font-mono bg-[var(--ink-black)]/10 dark:bg-white/10 px-1">
                ef-timegroup
              </code>{" "}
              and get scrubable, frame-accurate rendering for free.
            </p>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          {/* Getting Started */}
          <div className="border-4 border-[var(--ink-black)] dark:border-white p-8 mb-8 relative">
            <div className="absolute -top-4 left-6 bg-[var(--poster-red)] px-3 py-1">
              <span className="text-white text-xs font-bold uppercase tracking-widest">
                Get Started
              </span>
            </div>
            <p className="text-[var(--warm-gray)] mb-4">
              Scaffold a new project with the SVG SMIL template:
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="bg-[var(--ink-black)] dark:bg-[#1a1a1a] px-5 py-3 font-mono text-sm flex items-center gap-3 border-2 border-[var(--ink-black)] dark:border-white/20">
                <span>
                  <span className="text-[var(--poster-gold)]">$</span>
                  <span className="text-white ml-2">
                    npm create @editframe@latest
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() =>
                    navigator.clipboard?.writeText(
                      "npm create @editframe@latest",
                    )
                  }
                  className="text-white/40 hover:text-white transition-colors flex-shrink-0"
                  aria-label="Copy npm create @editframe@latest command"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                </button>
              </div>
              <Link
                to="/skills"
                className="inline-flex items-center justify-center px-6 py-3 border-2 border-[var(--ink-black)] dark:border-white font-bold text-sm uppercase tracking-wider hover:bg-[var(--ink-black)] hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors whitespace-nowrap"
              >
                Docs
              </Link>
            </div>
          </div>

          {/* How it works */}
          <div className="border-4 border-[var(--ink-black)] dark:border-white p-8 mb-20 relative">
            <div className="absolute -top-4 left-6 bg-[var(--poster-red)] px-3 py-1">
              <span className="text-white text-xs font-bold uppercase tracking-widest">
                How it works
              </span>
            </div>
            <p className="text-[var(--warm-gray)] mb-4">
              SVG SMIL has its own internal clock that runs independently.{" "}
              <code className="font-mono bg-[var(--ink-black)]/10 dark:bg-white/10 px-1">
                ef-timegroup
              </code>{" "}
              takes it over automatically on every frame —{" "}
              <code className="font-mono bg-[var(--ink-black)]/10 dark:bg-white/10 px-1">
                setCurrentTime
              </code>{" "}
              positions the SVG and{" "}
              <code className="font-mono bg-[var(--ink-black)]/10 dark:bg-white/10 px-1">
                pauseAnimations
              </code>{" "}
              prevents it from running ahead. No JavaScript wiring required.
            </p>
            <pre className="!mt-0 bg-[var(--card-dark-bg)] text-white px-4 py-3 overflow-x-auto border-2 border-[var(--ink-black)] dark:border-white">
              <code className="language-xml">{`<ef-timegroup duration="4s" loop autoplay>
  <svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
    <rect x="110" y="300" width="60" height="20" fill="#3B82F6">
      <animate attributeName="height" values="20;260;20" dur="4s" repeatCount="indefinite"/>
      <animate attributeName="y" values="300;60;300" dur="4s" repeatCount="indefinite"/>
    </rect>
  </svg>
</ef-timegroup>`}</code>
            </pre>
          </div>

          {/* Section 1: <animate> — Wave bars */}
          <div className="mb-20 pb-20 border-b-2 border-[var(--ink-black)]/10 dark:border-white/10">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase mb-2">
              {"<animate>"}
            </h2>
            <p className="text-[var(--warm-gray)] text-sm uppercase tracking-widest font-bold mb-6">
              Attribute Animation
            </p>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="w-full aspect-[16/9] overflow-hidden relative border-4 border-[var(--ink-black)] dark:border-white shadow-poster-hard">
                  <ef-timegroup
                    id="svg-section1"
                    mode="fixed"
                    duration="4s"
                    loop
                    autoplay
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <svg
                      viewBox="0 0 640 360"
                      width="100%"
                      height="100%"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ display: "block" }}
                    >
                      <rect width="640" height="360" fill="#0f0f1a" />

                      {/* 5 bars: x positions 110,200,290,380,470 width=60 gap=30 */}
                      {/* Each anchored at y=320, max height 260 → top at y=60 */}

                      <rect
                        x="110"
                        y="300"
                        width="60"
                        height="20"
                        fill="#3B82F6"
                        rx="3"
                      >
                        <animate
                          attributeName="height"
                          values="20;260;20"
                          dur="4s"
                          begin="0s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                        <animate
                          attributeName="y"
                          values="300;60;300"
                          dur="4s"
                          begin="0s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                      </rect>

                      <rect
                        x="200"
                        y="300"
                        width="60"
                        height="20"
                        fill="#6366F1"
                        rx="3"
                      >
                        <animate
                          attributeName="height"
                          values="20;260;20"
                          dur="4s"
                          begin="0.5s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                        <animate
                          attributeName="y"
                          values="300;60;300"
                          dur="4s"
                          begin="0.5s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                      </rect>

                      <rect
                        x="290"
                        y="300"
                        width="60"
                        height="20"
                        fill="#8B5CF6"
                        rx="3"
                      >
                        <animate
                          attributeName="height"
                          values="20;260;20"
                          dur="4s"
                          begin="1.0s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                        <animate
                          attributeName="y"
                          values="300;60;300"
                          dur="4s"
                          begin="1.0s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                      </rect>

                      <rect
                        x="380"
                        y="300"
                        width="60"
                        height="20"
                        fill="#6366F1"
                        rx="3"
                      >
                        <animate
                          attributeName="height"
                          values="20;260;20"
                          dur="4s"
                          begin="1.5s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                        <animate
                          attributeName="y"
                          values="300;60;300"
                          dur="4s"
                          begin="1.5s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                      </rect>

                      <rect
                        x="470"
                        y="300"
                        width="60"
                        height="20"
                        fill="#3B82F6"
                        rx="3"
                      >
                        <animate
                          attributeName="height"
                          values="20;260;20"
                          dur="4s"
                          begin="2.0s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                        <animate
                          attributeName="y"
                          values="300;60;300"
                          dur="4s"
                          begin="2.0s"
                          repeatCount="indefinite"
                          calcMode="spline"
                          keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
                          keyTimes="0;0.5;1"
                        />
                      </rect>
                    </svg>
                  </ef-timegroup>
                </div>
                <TimelineControls target="svg-section1" />
              </div>

              <div className="flex-1">
                <pre className="!mt-0 overflow-hidden bg-[var(--card-dark-bg)] border-2 border-[var(--ink-black)] dark:border-white">
                  <code className="language-xml">{`<rect x="110" y="300" width="60" height="20">
  <animate
    attributeName="height"
    values="20;260;20"
    dur="4s"
    begin="0s"
    repeatCount="indefinite"
    calcMode="spline"
    keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
    keyTimes="0;0.5;1"
  />
  <animate
    attributeName="y"
    values="300;60;300"
    dur="4s"
    begin="0s"
    repeatCount="indefinite"
    calcMode="spline"
    keySplines="0.4 0 0.6 1;0.4 0 0.6 1"
    keyTimes="0;0.5;1"
  />
</rect>

<!-- Stagger: each bar shifts begin by +0.5s -->`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Section 2: <animateTransform> — Orbital system */}
          <div className="mb-20 pb-20 border-b-2 border-[var(--ink-black)]/10 dark:border-white/10">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase mb-2">
              {"<animateTransform>"}
            </h2>
            <p className="text-[var(--warm-gray)] text-sm uppercase tracking-widest font-bold mb-6">
              Transform Animation
            </p>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="w-full aspect-[16/9] overflow-hidden relative border-4 border-[var(--ink-black)] dark:border-white shadow-poster-hard">
                  <ef-timegroup
                    id="svg-section2"
                    mode="fixed"
                    duration="6s"
                    loop
                    autoplay
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                    }}
                  >
                    <svg
                      viewBox="0 0 640 360"
                      width="100%"
                      height="100%"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ display: "block" }}
                    >
                      <rect width="640" height="360" fill="#0f0f1a" />

                      {/* Static star field */}
                      {[
                        [60, 40],
                        [180, 25],
                        [540, 50],
                        [590, 130],
                        [420, 20],
                        [80, 300],
                        [560, 310],
                        [150, 180],
                        [500, 80],
                        [320, 30],
                      ].map(([x, y], i) => (
                        <circle
                          key={i}
                          cx={x}
                          cy={y}
                          r="1.5"
                          fill="white"
                          opacity="0.5"
                        />
                      ))}

                      {/* Orbit rings */}
                      <circle
                        cx="320"
                        cy="180"
                        r="90"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        opacity="0.15"
                        strokeDasharray="4 8"
                      />
                      <circle
                        cx="320"
                        cy="180"
                        r="150"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        opacity="0.12"
                        strokeDasharray="4 8"
                      />

                      {/* Sun glow */}
                      <circle
                        cx="320"
                        cy="180"
                        r="40"
                        fill="#FBBF24"
                        opacity="0.15"
                      />
                      {/* Sun */}
                      <circle cx="320" cy="180" r="28" fill="#FBBF24" />

                      {/* Inner planet — 3s orbit (cx=410 is 90px right of center) */}
                      <g>
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="0 320 180"
                          to="360 320 180"
                          dur="3s"
                          begin="0s"
                          repeatCount="indefinite"
                        />
                        <circle cx="410" cy="180" r="13" fill="#60A5FA" />
                      </g>

                      {/* Outer planet — 6s orbit, start at 120° offset (cx=470 is 150px right) */}
                      <g>
                        <animateTransform
                          attributeName="transform"
                          type="rotate"
                          from="120 320 180"
                          to="480 320 180"
                          dur="6s"
                          begin="0s"
                          repeatCount="indefinite"
                        />
                        <circle cx="470" cy="180" r="20" fill="#F87171" />
                      </g>
                    </svg>
                  </ef-timegroup>
                </div>
                <TimelineControls target="svg-section2" />
              </div>

              <div className="flex-1">
                <pre className="!mt-0 overflow-hidden bg-[var(--card-dark-bg)] border-2 border-[var(--ink-black)] dark:border-white">
                  <code className="language-xml">{`<!-- Inner planet: 3s orbit -->
<g>
  <animateTransform
    attributeName="transform"
    type="rotate"
    from="0 320 180"
    to="360 320 180"
    dur="3s"
    repeatCount="indefinite"
  />
  <circle cx="410" cy="180" r="13" fill="#60A5FA"/>
</g>

<!-- Outer planet: 6s orbit, 120° offset -->
<g>
  <animateTransform
    attributeName="transform"
    type="rotate"
    from="120 320 180"
    to="480 320 180"
    dur="6s"
    repeatCount="indefinite"
  />
  <circle cx="470" cy="180" r="20" fill="#F87171"/>
</g>`}</code>
                </pre>
              </div>
            </div>
          </div>

          {/* Section 3: <animateMotion> — Path following */}
          <div className="mb-20">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase mb-2">
              {"<animateMotion>"}
            </h2>
            <p className="text-[var(--warm-gray)] text-sm uppercase tracking-widest font-bold mb-6">
              Motion Path
            </p>

            <div className="flex flex-col lg:flex-row gap-6">
              <div className="flex-1">
                <div className="w-full aspect-[16/9] overflow-hidden relative border-4 border-[var(--ink-black)] dark:border-white shadow-poster-hard">
                  <ef-timegroup
                    id="svg-section3"
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
                    <svg
                      viewBox="0 0 640 360"
                      width="100%"
                      height="100%"
                      xmlns="http://www.w3.org/2000/svg"
                      style={{ display: "block" }}
                    >
                      <defs>
                        {/* Smooth oval: rx=200, ry=120, center=(320,180) */}
                        <path
                          id="orbit-path"
                          d="M 520 180 C 520 114 431 60 320 60 C 209 60 120 114 120 180 C 120 246 209 300 320 300 C 431 300 520 246 520 180 Z"
                        />
                      </defs>

                      <rect width="640" height="360" fill="#0f0f1a" />

                      {/* Path guide */}
                      <use
                        href="#orbit-path"
                        fill="none"
                        stroke="white"
                        strokeWidth="1"
                        opacity="0.2"
                        strokeDasharray="6 10"
                      />

                      {/* 3 particles equally spaced (1/3 period = 1.667s) */}

                      {/* Particle 1 — red, leading */}
                      <circle r="14" fill="#E63946">
                        <animateMotion
                          dur="5s"
                          begin="0s"
                          repeatCount="indefinite"
                        >
                          <mpath href="#orbit-path" />
                        </animateMotion>
                      </circle>

                      {/* Particle 2 — blue, 1/3 behind */}
                      <circle r="10" fill="#3B82F6">
                        <animateMotion
                          dur="5s"
                          begin="-1.667s"
                          repeatCount="indefinite"
                        >
                          <mpath href="#orbit-path" />
                        </animateMotion>
                      </circle>

                      {/* Particle 3 — amber, 2/3 behind */}
                      <circle r="8" fill="#FBBF24">
                        <animateMotion
                          dur="5s"
                          begin="-3.333s"
                          repeatCount="indefinite"
                        >
                          <mpath href="#orbit-path" />
                        </animateMotion>
                      </circle>
                    </svg>
                  </ef-timegroup>
                </div>
                <TimelineControls target="svg-section3" />
              </div>

              <div className="flex-1">
                <pre className="!mt-0 overflow-hidden bg-[var(--card-dark-bg)] border-2 border-[var(--ink-black)] dark:border-white">
                  <code className="language-xml">{`<defs>
  <path id="orbit-path" d="M 520 180 C 520 114 ..." />
</defs>

<!-- 3 particles, equally spaced (5s ÷ 3 = 1.667s apart) -->

<circle r="14" fill="#E63946">
  <animateMotion dur="5s" begin="0s" repeatCount="indefinite">
    <mpath href="#orbit-path"/>
  </animateMotion>
</circle>

<circle r="10" fill="#3B82F6">
  <animateMotion dur="5s" begin="-1.667s" repeatCount="indefinite">
    <mpath href="#orbit-path"/>
  </animateMotion>
</circle>

<circle r="8" fill="#FBBF24">
  <animateMotion dur="5s" begin="-3.333s" repeatCount="indefinite">
    <mpath href="#orbit-path"/>
  </animateMotion>
</circle>`}</code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
