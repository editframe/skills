import type { ReactNode } from "react";

interface CodeBlockProps {
  language?: string;
  filename?: string;
  children: ReactNode;
}

export function CodeBlock({ language, filename, children }: CodeBlockProps) {
  return (
    <div className="my-6 overflow-hidden rounded-xl border border-white/10 bg-slate-900 shadow-lg">
      {(filename || language) && (
        <div className="flex items-center gap-2 border-b border-white/10 bg-white/5 px-4 py-2">
          {filename && (
            <span className="font-mono text-xs text-slate-300">{filename}</span>
          )}
          {!filename && language && (
            <span className="font-mono text-xs text-slate-500 uppercase tracking-wide">
              {language}
            </span>
          )}
        </div>
      )}
      <div className="overflow-x-auto p-4 text-sm">{children}</div>
    </div>
  );
}
