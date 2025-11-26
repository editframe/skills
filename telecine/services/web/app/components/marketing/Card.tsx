import { Link } from "react-router";
import clsx from "clsx";

function ChevronRightIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M6.75 5.75 9.25 8l-2.5 2.25"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Card({
  href,
  Component = "div",
  children,
  className,
}: React.ComponentProps<"div" | "a"> & { Component?: React.ElementType } & {
  href: string;
}) {
  return (
    <Component
      className={clsx(className, "group relative flex flex-col items-start")}
    >
      <Link to={href}>
        <div className="absolute -inset-x-4 -inset-y-6 z-0 bg-zinc-100 dark:bg-zinc-900 opacity-0 transition scale-95 group-hover:opacity-100 group-hover:scale-100 sm:-inset-x-6 sm:rounded-2xl" />
        <span className="relative z-10">{children}</span>
      </Link>
    </Component>
  );
}

Card.Title = function CardTitle({
  as: Component = "h3",
  children,
}: {
  as?: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <Component className="text-base font-semibold tracking-tight text-zinc-800 dark:text-zinc-200">
      {children}
    </Component>
  );
};

Card.Description = function CardDescription({
  children,
}: {
  children: React.ReactNode;
  href?: string;
}) {
  return (
    <p className="relative z-10 mt-2 text-sm text-zinc-600 dark:text-zinc-300">
      {children}
    </p>
  );
};

Card.Cta = function CardCta({ children }: { children: React.ReactNode }) {
  return (
    <div
      aria-hidden="true"
      className="relative z-10 mt-4 flex items-center text-sm font-medium text-[#646CFF] dark:text-[#646cff] "
    >
      {children}
      <ChevronRightIcon className="ml-1 h-4 w-4 stroke-current" />
    </div>
  );
};

Card.Eyebrow = function CardEyebrow({
  as: Component = "p",
  children,
  className,
  decorate = false,
  ...props
}: {
  as?: React.ElementType;
  children: React.ReactNode;
  className?: string;
  decorate?: boolean;
}) {
  return (
    <Component
      className={clsx(
        className,
        "relative z-10 order-first mb-3 flex items-center text-sm text-zinc-500 dark:text-zinc-300",
        decorate && "pl-3.5",
      )}
      {...props}
    >
      {decorate && (
        <span
          className="absolute inset-y-0 left-0 flex items-center"
          aria-hidden="true"
        >
          <span className="h-4 w-0.5 rounded-full bg-zinc-400 dark:bg-zinc-200" />
        </span>
      )}
      {children}
    </Component>
  );
};
