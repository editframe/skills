import clsx from "clsx";

function ArrowIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m11.5 6.5 3 3.5m0 0-3 3.5m3-3.5h-9"
      />
    </svg>
  );
}

const variantStyles = {
  primary:
    "rounded-full bg-zinc-900 py-1 px-3 text-white hover:bg-zinc-700 dark:bg-martinique-400/10 dark:text-martinique-400 dark:ring-1 dark:ring-inset dark:ring-martinique-400/20 dark:hover:bg-martinique-400/10 dark:hover:text-martinique-300 dark:hover:ring-martinique-300",
  secondary:
    "rounded-full bg-zinc-100 py-1 px-3 text-zinc-900 hover:bg-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400 dark:ring-1 dark:ring-inset dark:ring-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-300",
  filled:
    "rounded-full bg-zinc-900 py-1 px-3 text-white hover:bg-zinc-700 dark:bg-martinique-500 dark:text-white dark:hover:bg-martinique-400",
  outline:
    "rounded-full py-1 px-3 text-zinc-700 ring-1 ring-inset ring-zinc-900/10 hover:bg-zinc-900/2.5 hover:text-zinc-900 dark:text-zinc-400 dark:ring-white/10 dark:hover:bg-white/5 dark:hover:text-white",
  text: "text-martinique-500 hover:text-martinique-600 dark:text-martinique-400 dark:hover:text-martinique-500",
};

export function Button({
  arrow = "right",
  children,
  className,
  variant = "primary",
  renderAs = "button",
  ...props
}: {
  arrow?: "left" | "right";
  children: React.ReactNode;
  className?: string;
  variant?: keyof typeof variantStyles;
  renderAs: "button" | "a";
} & React.ComponentProps<"button"> &
  React.ComponentProps<"a">) {
  const Component = renderAs;

  className = clsx(
    "inline-flex justify-center gap-0.5 overflow-hidden text-sm font-medium transition text-decoration-none",
    variantStyles[variant],
    className,
  );

  const arrowIcon = (
    <ArrowIcon
      className={clsx(
        "mt-0.5 h-5 w-5",
        variant === "text" && "relative top-px",
        arrow === "left" && "-ml-1 rotate-180",
        arrow === "right" && "-mr-1",
      )}
    />
  );

  return (
    <Component className={className} {...props}>
      {arrow === "left" && arrowIcon}
      {children}
      {arrow === "right" && arrowIcon}
    </Component>
  );
}
