export function DogfoodCallout() {
  return (
    <div className="relative py-8 bg-[var(--poster-blue)] text-white border-t-4 border-b-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
      {/* Geometric accent */}
      <div className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1/2 w-32 h-32 bg-[var(--poster-gold)] opacity-20" />
      
      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <div className="flex items-center justify-center gap-4 mb-3">
          <div className="w-12 h-1 bg-white" />
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
          <div className="w-12 h-1 bg-white" />
        </div>
        <p className="text-xl md:text-2xl font-black tracking-tight uppercase">
          Every demo on this page is built with Editframe
        </p>
      </div>
    </div>
  );
}
