export function Footer() {
  return (
    <div className="border-t-2 border-[var(--ink-black)]/10 dark:border-white/10 mt-16">
      <div className="flex max-w-6xl mx-auto w-full justify-between items-center gap-4 py-6 px-6 text-sm text-[var(--warm-gray)]">
        <div className="flex items-center gap-2">
          <span className="font-semibold">&copy; {new Date().getFullYear()}</span>
          <span className="text-[var(--ink-black)]/20 dark:text-white/20">|</span>
          <a className="hover:text-[var(--accent-blue)] transition-colors font-medium" href="https://editframe.com">
            Editframe Inc.
          </a>
        </div>
        {/* Color accent bar */}
        <div className="hidden sm:flex gap-1">
          <div className="w-4 h-1 bg-[var(--accent-red)]" />
          <div className="w-4 h-1 bg-[var(--accent-gold)]" />
          <div className="w-4 h-1 bg-[var(--accent-blue)]" />
        </div>
      </div>
    </div>
  );
}
