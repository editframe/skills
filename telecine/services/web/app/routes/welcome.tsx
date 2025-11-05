import { requireSession } from "@/util/requireSession.server";
import type { MetaFunction } from "react-router";
import { Link } from "react-router";
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
    <section className="relative overflow-hidden border-b border-border bg-background">
      <div className="absolute inset-0 -z-10 bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent" aria-hidden="true" />

      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:items-center">
          {/* Left: Headline & CTAs */}
          <div className="flex flex-col gap-4">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-semibold tracking-tight text-foreground">
              Welcome
            </h1>
            <p className="max-w-2xl text-base sm:text-lg text-muted-foreground">
              Build technical, production-grade video features with confident, sober defaults.
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-3">
              <Link
                to="/docs"
                className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-e1 transition-shadow duration-200 hover:shadow-e2 focus:outline-none focus:ring-2 ring-ring"
              >
                View Docs
              </Link>
              <Link
                to="/"
                className="inline-flex items-center rounded-lg border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80"
              >
                Try the Demo
              </Link>
            </div>
          </div>

          {/* Right: Visual placeholder */}
          <div className="relative rounded-xl border border-border bg-card/60 p-2 sm:p-3 shadow-e2">
            <div className="aspect-video w-full rounded-md bg-muted/60 ring-1 ring-inset ring-border/60 grid place-items-center text-xs sm:text-sm text-muted-foreground animate-pulse">
              Product Preview Placeholder
            </div>
            <div className="pointer-events-none absolute inset-x-3 top-3 flex items-center justify-between">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" />
              </div>
              <div className="h-2 w-16 rounded bg-muted-foreground/20" />
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link to="/docs" className="group rounded-lg border border-border bg-card p-4 shadow-e1 transition hover:shadow-e2">
            <div className="text-sm font-medium text-card-foreground">Explore the Docs</div>
            <div className="mt-1 text-xs text-muted-foreground">APIs, elements, and examples</div>
          </Link>
          <Link to="/" className="group rounded-lg border border-border bg-card p-4 shadow-e1 transition hover:shadow-e2">
            <div className="text-sm font-medium text-card-foreground">Create a Render</div>
            <div className="mt-1 text-xs text-muted-foreground">Kick off a new video job</div>
          </Link>
          <Link to="/" className="group rounded-lg border border-border bg-card p-4 shadow-e1 transition hover:shadow-e2">
            <div className="text-sm font-medium text-card-foreground">Upload an Asset</div>
            <div className="mt-1 text-xs text-muted-foreground">Add media for use in projects</div>
          </Link>
        </div>
      </div>
    </section>
  );
}
