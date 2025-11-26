import type * as React from "react";
import { Link } from "react-router";

type QuickLinksProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLElement>,
  HTMLElement
>;

type QuickLinkProps = {
  title: string;
  description: string;
  href: string;
};

export const CustomLink = (
  props: React.DetailedHTMLProps<
    React.AnchorHTMLAttributes<HTMLAnchorElement>,
    HTMLAnchorElement
  >,
) => {
  const { href } = props;
  const isInternalLink = href && (href.startsWith("/") || href.startsWith("#"));
  return isInternalLink ? (
    <Link to={href} prefetch="intent" {...props} />
  ) : (
    <>
      <a
        {...props}
        className="font-semibold dark:text-lightBlue-500"
        target="_blank"
        rel="noopener noreferrer"
      />
      <span className="sr-only">(opens in a new tab)</span>
    </>
  );
};

export function QuickLinks({ children }: QuickLinksProps) {
  return (
    <div className="not-prose my-12 grid grid-cols-1 gap-6 sm:grid-cols-2">
      {children}
    </div>
  );
}

export function QuickLink({ title, description, href }: QuickLinkProps) {
  return (
    <div className="border-slate-200 group relative rounded-xl border ">
      <div className="absolute -inset-px rounded-xl border-2 border-transparent opacity-0 [background:linear-gradient(var(--quick-links-hover-bg,theme(colors.blue.50)),var(--quick-links-hover-bg,theme(colors.blue.50)))_padding-box,linear-gradient(to_top,theme(colors.editframe.400),theme(colors.cyan.400),theme(colors.blue.500))_border-box] group-hover:opacity-100 " />
      <div className="relative overflow-hidden rounded-xl p-6">
        <h2 className="text-slate-900 mt-4 font-display text-base dark:text-white">
          <CustomLink href={href}>
            <span className="absolute -inset-px rounded-xl" />
            {title}
          </CustomLink>
        </h2>
        <p className="text-slate-700 dark:text-slate-400 mt-1 text-sm">
          {description}
        </p>
      </div>
    </div>
  );
}

export function CustomCode({ children }: QuickLinksProps) {
  return (
    <code className="text-slate-900 dark:text-white dark:bg-editframe-900 rounded-md p-1">
      {children}
    </code>
  );
}

export function CodeSteps({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-slate-100 divide-y divide-slate-200 [counter-reset:step-counter]">
      {children}
    </div>
  );
}

export function CodeStep({ children }: { children: React.ReactNode }) {
  return (
    <div className="group">
      <div className="flex w-full transition-colors group-hover:bg-slate-200">
        {children}
      </div>
    </div>
  );
}

export function CodeStepLabel({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex-none w-56 p-2 text-slate-700">
      <p className="p-0 m-0 font-medium [counter-increment:step-counter] before:content-[counter(step-counter)] before:mr-2">
        {title}
      </p>
      {children}
    </div>
  );
}

export function CodeStepCode({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0 overflow-x-auto [&_pre]:group-hover:bg-slate-800">
      {children}
    </div>
  );
}
