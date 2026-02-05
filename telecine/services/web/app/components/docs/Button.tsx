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
    "bg-[var(--ink-black)] py-2 px-4 text-white font-semibold hover:bg-[var(--accent-blue)] dark:bg-white dark:text-[var(--ink-black)] dark:hover:bg-[var(--accent-blue)] dark:hover:text-white transition-colors",
  secondary:
    "bg-[var(--paper-white)] py-2 px-4 text-[var(--ink-black)] font-semibold border-2 border-[var(--ink-black)]/10 hover:border-[var(--ink-black)]/20 dark:bg-[#111] dark:text-white dark:border-white/10 dark:hover:border-white/20 transition-colors",
  filled:
    "bg-[var(--accent-blue)] py-2 px-4 text-white font-semibold hover:bg-[var(--ink-black)] dark:hover:bg-white dark:hover:text-[var(--ink-black)] transition-colors",
  outline:
    "py-2 px-4 text-[var(--ink-black)] font-semibold border-2 border-[var(--ink-black)] hover:bg-[var(--ink-black)] hover:text-white dark:text-white dark:border-white dark:hover:bg-white dark:hover:text-[var(--ink-black)] transition-colors",
  text: "text-[var(--accent-blue)] hover:text-[var(--accent-red)] dark:text-[var(--accent-blue)] dark:hover:text-[var(--accent-red)] font-medium",
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
