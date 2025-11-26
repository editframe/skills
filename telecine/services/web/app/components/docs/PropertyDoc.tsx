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
    <div className="border-b border-slate-200 dark:border-slate-700 py-5 px-1 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
      <div className="flex justify-between items-start gap-4 mb-4">
        <h3
          className="font-mono text-lg font-semibold text-slate-900 dark:text-slate-100 not-prose break-words tracking-tight"
          id={`attr-${name}`}
        >
          {name}
        </h3>

        <div className="flex flex-wrap gap-2 text-xs shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 dark:bg-blue-950/50 border border-blue-200/60 dark:border-blue-800/60 shadow-sm">
            <span className="text-blue-700 dark:text-blue-300 font-medium uppercase tracking-wider">
              type
            </span>
            <code className="not-prose font-mono text-blue-900 dark:text-blue-100 font-semibold">
              {type}
            </code>
          </div>

          {defaultValue && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-600/60 shadow-sm">
              <span className="text-slate-700 dark:text-slate-300 font-medium uppercase tracking-wider">
                default
              </span>
              <code className="not-prose font-mono text-slate-900 dark:text-slate-100 font-semibold">
                {defaultValue}
              </code>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-5">
        <div className="lg:w-56 shrink-0 space-y-2.5 text-sm">
          {(domReadable || domWritable) && (
            <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-sm">
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                DOM
              </div>
              <div className="text-slate-800 dark:text-slate-200 font-medium">
                {domReadable &&
                  (typeof domReadable === "string"
                    ? `read (${domReadable})`
                    : "read")}
                {domReadable && domWritable && (
                  <span className="text-slate-400 dark:text-slate-500 mx-1.5">
                    •
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
            <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700/80 shadow-sm space-y-2.5">
              <div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  HTML
                </div>
                <code className="block not-prose font-mono text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-700/50">
                  {typeof htmlAttribute === "string" ? htmlAttribute : name}
                </code>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                  JSX
                </div>
                <code className="block not-prose font-mono text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900/50 px-2 py-1 rounded border border-slate-200/50 dark:border-slate-700/50">
                  {name}
                </code>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {type === "timestring" && (
            <div className="text-sm mb-4 bg-gradient-to-r from-amber-50 to-amber-50/50 dark:from-amber-950/30 dark:to-amber-950/10 px-3.5 py-2.5 rounded-lg border border-amber-200/70 dark:border-amber-800/50 shadow-sm">
              <p className="text-amber-900 dark:text-amber-100 font-medium">
                <span className="inline-block mr-1.5">⏱️</span>A string
                representing time duration (e.g. "5s", "1.5s", "500ms")
              </p>
            </div>
          )}

          <div className="prose dark:prose-invert max-w-none prose-p:text-slate-700 dark:prose-p:text-slate-300">
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
    <div className="border border-slate-200/80 dark:border-slate-700/80 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-700 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-black/20">
      {children}
    </div>
  );
}
