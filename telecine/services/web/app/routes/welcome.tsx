import { requireSession } from "@/util/requireSession.server";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Button } from "~/components/Button";
import clsx from "clsx";
import type { Route } from "./+types/welcome";

export const loader = async ({ request }: Route.LoaderArgs) => {
  await requireSession(request);
  return {};
};

export const meta: MetaFunction = () => {
  return [{ title: "Welcome | Editframe" }];
};

export default function Page() {
  return (
    <section className={clsx(
      "relative overflow-hidden transition-colors",
      "bg-white dark:bg-slate-900"
    )}>
      <div className={clsx(
        "absolute inset-0 -z-10 transition-colors",
        "bg-gradient-to-tr from-blue-50/15 via-blue-50/5 to-transparent",
        "dark:from-blue-950/12 dark:via-blue-950/5 dark:to-transparent"
      )} aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
          {/* Left: Headline & CTAs */}
          <div className="flex flex-col gap-4">
            <h1 className={clsx(
              "text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight transition-colors",
              "text-slate-900 dark:text-white"
            )}>
              Welcome
            </h1>
            <p className={clsx(
              "max-w-2xl text-base sm:text-lg transition-colors",
              "text-slate-600 dark:text-slate-300"
            )}>
              Build technical, production-grade video features with confident, sober defaults.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link to="/docs">
                <Button mode="primary">
                  View Docs
                </Button>
              </Link>
              <Link to="/resource/renders/new">
                <Button mode="secondary">
                  Try the Demo
                </Button>
              </Link>
            </div>
          </div>

          {/* Right: Visual placeholder */}
          <div className={clsx(
            "relative rounded-lg p-2 sm:p-3 transition-all backdrop-blur-sm",
            "bg-white/95 dark:bg-slate-900/95",
            "border border-slate-300/75 dark:border-slate-700/75",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(0_0_0_/_0.12)]",
            "dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(0_0_0_/_0.5)]",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/25 before:via-transparent before:to-transparent",
            "dark:before:from-blue-950/18 dark:before:via-transparent dark:before:to-transparent",
            "before:pointer-events-none before:rounded-lg"
          )}>
            <div className={clsx(
              "aspect-video w-full rounded-md grid place-items-center text-xs sm:text-sm transition-colors",
              "bg-slate-100/60 dark:bg-slate-800/60",
              "ring-1 ring-inset ring-slate-300/60 dark:ring-slate-700/60",
              "text-slate-500 dark:text-slate-400",
              "animate-pulse"
            )}>
              Product Preview Placeholder
            </div>
            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between">
              <div className="flex gap-1">
                <span className={clsx(
                  "h-2 w-2 rounded-full transition-colors",
                  "bg-slate-400/40 dark:bg-slate-500/40"
                )} />
                <span className={clsx(
                  "h-2 w-2 rounded-full transition-colors",
                  "bg-slate-400/40 dark:bg-slate-500/40"
                )} />
                <span className={clsx(
                  "h-2 w-2 rounded-full transition-colors",
                  "bg-slate-400/40 dark:bg-slate-500/40"
                )} />
              </div>
              <div className={clsx(
                "h-2 w-16 rounded transition-colors",
                "bg-slate-400/20 dark:bg-slate-500/20"
              )} />
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/docs"
            className={clsx(
              "group rounded-lg p-4 transition-all duration-150 relative backdrop-blur-sm",
              "bg-white/95 dark:bg-slate-900/95",
              "border border-slate-300/75 dark:border-slate-700/75",
              "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(0_0_0_/_0.12)]",
              "dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(0_0_0_/_0.5)]",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/25 before:via-transparent before:to-transparent",
              "dark:before:from-blue-950/18 dark:before:via-transparent dark:before:to-transparent",
              "before:pointer-events-none before:rounded-lg",
              "hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_6px_16px_0_rgb(0_0_0_/_0.15)]",
              "dark:hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_6px_16px_0_rgb(0_0_0_/_0.6)]",
              "hover:border-slate-300/85 dark:hover:border-slate-700/85"
            )}
          >
            <div className={clsx(
              "text-sm font-medium transition-colors relative z-10",
              "text-slate-900 dark:text-white"
            )}>
              Explore the Docs
            </div>
            <div className={clsx(
              "mt-1 text-xs transition-colors relative z-10",
              "text-slate-600 dark:text-slate-400"
            )}>
              APIs, elements, and examples
            </div>
          </Link>
          <Link
            to="/resource/renders/new"
            className={clsx(
              "group rounded-lg p-4 transition-all duration-150 relative backdrop-blur-sm",
              "bg-white/95 dark:bg-slate-900/95",
              "border border-slate-300/75 dark:border-slate-700/75",
              "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(0_0_0_/_0.12)]",
              "dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(0_0_0_/_0.5)]",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/25 before:via-transparent before:to-transparent",
              "dark:before:from-blue-950/18 dark:before:via-transparent dark:before:to-transparent",
              "before:pointer-events-none before:rounded-lg",
              "hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_6px_16px_0_rgb(0_0_0_/_0.15)]",
              "dark:hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_6px_16px_0_rgb(0_0_0_/_0.6)]",
              "hover:border-slate-300/85 dark:hover:border-slate-700/85"
            )}
          >
            <div className={clsx(
              "text-sm font-medium transition-colors relative z-10",
              "text-slate-900 dark:text-white"
            )}>
              Create a Render
            </div>
            <div className={clsx(
              "mt-1 text-xs transition-colors relative z-10",
              "text-slate-600 dark:text-slate-400"
            )}>
              Kick off a new video job
            </div>
          </Link>
          <Link
            to="/resource/unprocessed_files/new"
            className={clsx(
              "group rounded-lg p-4 transition-all duration-150 relative backdrop-blur-sm",
              "bg-white/95 dark:bg-slate-900/95",
              "border border-slate-300/75 dark:border-slate-700/75",
              "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(0_0_0_/_0.12)]",
              "dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(0_0_0_/_0.5)]",
              "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/25 before:via-transparent before:to-transparent",
              "dark:before:from-blue-950/18 dark:before:via-transparent dark:before:to-transparent",
              "before:pointer-events-none before:rounded-lg",
              "hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_6px_16px_0_rgb(0_0_0_/_0.15)]",
              "dark:hover:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_6px_16px_0_rgb(0_0_0_/_0.6)]",
              "hover:border-slate-300/85 dark:hover:border-slate-700/85"
            )}
          >
            <div className={clsx(
              "text-sm font-medium transition-colors relative z-10",
              "text-slate-900 dark:text-white"
            )}>
              Upload an Asset
            </div>
            <div className={clsx(
              "mt-1 text-xs transition-colors relative z-10",
              "text-slate-600 dark:text-slate-400"
            )}>
              Add media for use in projects
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}
