import clsx from "clsx";

export function Prose({
  Component = "div",
  children,
  className,
  ...props
}: React.ComponentProps<"div" | "a"> & { Component?: React.ElementType }) {
  return (
    <Component
      className={clsx(
        className,
        "prose prose-invert prose-slate max-w-none text-slate-200",
        // Base typography using centralized system
        "prose-base prose-slate",
        // Paragraphs
        "prose-p:text-slate-200 prose-p:leading-loose",
        "prose-p:mb-6",
        // headings
        "prose-headings:font-display prose-headings:scroll-mt-28 prose-headings:font-normal prose-headings:text-slate-100 lg:prose-headings:scroll-mt-[8.5rem]",
        "prose-headings:tracking-tight",
        // lead
        "prose-lead:text-slate-200 prose-lead:leading-loose",
        "prose-strong:text-slate-100",
        // links
        "prose-a:font-semibold prose-a:text-martinique-400",
        // link underline
        "inset_0_calc(-1*(var(--tw-prose-underline-size,4px)+2px))_0_0_var(--tw-prose-underline,theme(colors.martinique.300))] [--tw-prose-background:theme(colors.slate.900)]  prose-a:no-underline prose-a:shadow-[inset_0_calc(-1*var(--tw-prose-underline-size,2px))_0_0_var(--tw-prose-underline,theme(colors.martinique.800))] hover:prose-a:[--tw-prose-underline-size:6px]",
        // pre
        "prose-pre:rounded-xl prose-pre:bg-editframe-900 prose-pre:shadow-none prose-pre:ring-1 prose-pre:ring-slate-300/10",
        // hr
        "prose-hr:border-slate-800",
        "prose-code:text-slate-300",
      )}
      {...props}
    />
  );
}
