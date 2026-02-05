interface PropertyDocProps {
  name: string;
  children: React.ReactNode;
  type: string;
  defaultValue: string;
  domReadable?: boolean | string;
  domWritable?: boolean | string;
  htmlAttribute?: boolean | string;
}

export function PropertyDoc({
  name,
  children,
  type,
  defaultValue,
  domReadable,
  domWritable,
  htmlAttribute,
}: PropertyDocProps) {
  return (
    <div className="border-b border-[var(--ink-black)]/10 dark:border-white/10 py-6 px-4 transition-colors hover:bg-[var(--accent-blue)]/[0.02]">
      <div className="flex justify-between items-start gap-4 mb-4">
        <h3
          className="font-mono text-lg font-bold text-[var(--ink-black)] dark:text-white not-prose break-words tracking-tight"
          id={`attr-${name}`}
        >
          {name}
        </h3>

        <div className="flex flex-wrap gap-2 text-xs shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-blue)]/10 border-l-2 border-[var(--accent-blue)]">
            <span className="text-[var(--accent-blue)] font-bold uppercase tracking-wider">
              type
            </span>
            <code className="not-prose font-mono text-[var(--ink-black)] dark:text-white font-semibold">
              {type}
            </code>
          </div>

          {defaultValue && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[var(--ink-black)]/5 dark:bg-white/5 border-l-2 border-[var(--warm-gray)]">
              <span className="text-[var(--warm-gray)] font-bold uppercase tracking-wider">
                default
              </span>
              <code className="not-prose font-mono text-[var(--ink-black)] dark:text-white font-semibold">
                {defaultValue}
              </code>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="lg:w-56 shrink-0 space-y-2.5 text-sm">
          {(domReadable || domWritable) && (
            <div className="bg-[var(--ink-black)]/[0.03] dark:bg-white/[0.03] px-3 py-2.5 border-l-2 border-[var(--accent-gold)]">
              <div className="text-xs font-bold text-[var(--warm-gray)] mb-1.5 uppercase tracking-wider">
                DOM
              </div>
              <div className="text-[var(--ink-black)] dark:text-white font-medium">
                {domReadable &&
                  (typeof domReadable === "string"
                    ? `read (${domReadable})`
                    : "read")}
                {domReadable && domWritable && (
                  <span className="text-[var(--warm-gray)] mx-1.5">
                    |
                  </span>
                )}
                {domWritable &&
                  (typeof domWritable === "string"
                    ? `write (${domWritable})`
                    : "write")}
              </div>
            </div>
          )}

          {htmlAttribute && (
            <div className="bg-[var(--ink-black)]/[0.03] dark:bg-white/[0.03] px-3 py-2.5 border-l-2 border-[var(--accent-red)] space-y-2.5">
              <div>
                <div className="text-xs font-bold text-[var(--warm-gray)] mb-1.5 uppercase tracking-wider">
                  HTML
                </div>
                <code className="block not-prose font-mono text-sm text-[var(--ink-black)] dark:text-white bg-white dark:bg-[#111] px-2 py-1 border border-[var(--ink-black)]/10 dark:border-white/10">
                  {typeof htmlAttribute === "string" ? htmlAttribute : name}
                </code>
              </div>
              <div>
                <div className="text-xs font-bold text-[var(--warm-gray)] mb-1.5 uppercase tracking-wider">
                  JSX
                </div>
                <code className="block not-prose font-mono text-sm text-[var(--ink-black)] dark:text-white bg-white dark:bg-[#111] px-2 py-1 border border-[var(--ink-black)]/10 dark:border-white/10">
                  {name}
                </code>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {type === "timestring" && (
            <div className="text-sm mb-4 bg-[var(--accent-gold)]/10 px-3.5 py-2.5 border-l-2 border-[var(--accent-gold)]">
              <p className="text-[var(--ink-black)] dark:text-white font-medium">
                <span className="inline-block mr-1.5">⏱️</span>A string
                representing time duration (e.g. "5s", "1.5s", "500ms")
              </p>
            </div>
          )}

          <div className="prose dark:prose-invert max-w-none prose-p:text-[var(--warm-gray)]">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

interface PropertyDocListProps {
  children: React.ReactNode;
}

export function PropertyDocList({ children }: PropertyDocListProps) {
  return (
    <div className="border-2 border-[var(--ink-black)]/10 dark:border-white/10 overflow-hidden divide-y divide-[var(--ink-black)]/10 dark:divide-white/10 bg-white dark:bg-[#111]">
      {children}
    </div>
  );
}
