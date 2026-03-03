import { ThumbnailPicker } from "../tools/ThumbnailPicker";
import { TextOverlayTool } from "../tools/TextOverlayTool";

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
            <h2 className="text-4xl md:text-5xl font-black tracking-tighter uppercase text-[var(--ink-black)] dark:text-white">
              Built from prompts
            </h2>
          </div>
          <p className="text-lg text-[var(--warm-gray)] max-w-xl">
            Real tools generated with agent skills. Interactive, production-ready.
          </p>
        </div>

        {/* Tools Grid - 2 tools */}
        <div className="grid md:grid-cols-2 gap-8">
          {/* Thumbnail Picker */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-1 bg-[var(--poster-blue)]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)]">
                Thumbnail Picker
              </span>
            </div>
            <ThumbnailPicker />
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
        </div>
      </div>
    </section>
  );
}
