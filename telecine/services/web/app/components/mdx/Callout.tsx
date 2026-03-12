import clsx from "clsx";
import type { ReactNode } from "react";

const variants = {
  info: {
    container: "bg-blue-950/40 border-blue-500/40 text-blue-100",
    icon: (
      <svg
        className="h-5 w-5 text-blue-400 shrink-0 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  tip: {
    container: "bg-emerald-950/40 border-emerald-500/40 text-emerald-100",
    icon: (
      <svg
        className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 2a.75.75 0 01.75.75v.258a33.186 33.186 0 016.668 2.878.75.75 0 11-.836 1.237A31.5 31.5 0 0010 4.51a31.5 31.5 0 00-6.582 2.613.75.75 0 01-.836-1.237A33.18 33.18 0 019.25 3.008V2.75A.75.75 0 0110 2zM5.25 7.5a.75.75 0 01.75.75v1.498l2.31-2.31a5 5 0 017.07 7.07l-2.31 2.31h1.498a.75.75 0 010 1.5H11a.75.75 0 01-.75-.75v-3.568A5 5 0 015.25 8.25v-1.5H3.75a.75.75 0 010-1.5h1.5zm5.25.25a.75.75 0 01.75.75v.01a.75.75 0 01-1.5 0V8.5a.75.75 0 01.75-.75z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  warning: {
    container: "bg-amber-950/40 border-amber-500/40 text-amber-100",
    icon: (
      <svg
        className="h-5 w-5 text-amber-400 shrink-0 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  danger: {
    container: "bg-red-950/40 border-red-500/40 text-red-100",
    icon: (
      <svg
        className="h-5 w-5 text-red-400 shrink-0 mt-0.5"
        viewBox="0 0 20 20"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
} as const;

type CalloutType = keyof typeof variants;

interface CalloutProps {
  type?: CalloutType;
  children: ReactNode;
}

export function Callout({ type = "info", children }: CalloutProps) {
  const { container, icon } = variants[type];
  return (
    <div
      className={clsx(
        "my-6 flex gap-3 rounded-lg border px-4 py-3 text-sm",
        container,
      )}
    >
      {icon}
      <div className="min-w-0 flex-1 [&>p]:mt-0 [&>p:last-child]:mb-0">
        {children}
      </div>
    </div>
  );
}
