import { TrimTool, TextOverlayTool, ThumbnailPicker, CaptionEditor } from "../index";
import { LazySection } from "../LazySection";

export function ToolsGridSection() {
  return (
    <section className="relative py-24 bg-[var(--paper-cream)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
      {/* Grid pattern - modular, component-based */}
      <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.02]">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--poster-green)" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-[var(--poster-green)] flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase">
              Built from prompts
            </h2>
          </div>
          <p className="text-lg text-[var(--warm-gray)] max-w-xl">
            Real tools generated with agent skills. Interactive, production-ready.
          </p>
        </div>

        {/* Tools Grid - 2x2 */}
        <LazySection>
          <div className="grid md:grid-cols-2 gap-8">
          {/* Trim Tool */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-1 bg-[var(--poster-blue)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                Video Trimmer
              </span>
            </div>
            <TrimTool />
          </div>

          {/* Text Overlay */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-1 bg-[var(--poster-gold)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                Text Overlay
              </span>
            </div>
            <TextOverlayTool />
          </div>

          {/* Thumbnail Picker */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-1 bg-[var(--poster-red)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                Thumbnail Picker
              </span>
            </div>
            <ThumbnailPicker />
          </div>

          {/* Caption Editor */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-1 bg-[var(--poster-green)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                Caption Editor
              </span>
            </div>
            <CaptionEditor />
          </div>
          </div>
        </LazySection>

        {/* Prominent callout */}
        <div className="mt-16 relative">
          <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-green)]" />
          <div className="relative bg-[var(--card-bg)] border-4 border-[var(--ink-black)] dark:border-white p-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <svg className="w-8 h-8 text-[var(--poster-green)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-2xl md:text-3xl font-black tracking-tighter uppercase">AI-Generated</h3>
            </div>
            <p className="text-lg font-bold text-[var(--warm-gray)] max-w-2xl mx-auto">
              Each tool above was generated from a single prompt using Editframe agent skills.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
