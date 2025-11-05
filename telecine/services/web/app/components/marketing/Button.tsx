import clsx from "clsx";
import { Link } from "react-router";

const styles = {
  primary:
    "rounded-full bg-martinique-300 py-2 px-4 text-sm font-semibold text-slate-900 hover:bg-martinique-200 active:bg-martinique-500 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-martinique-300/50",
  secondary:
    "rounded-full bg-editframe-800 py-2 px-4 text-sm font-medium text-white hover:bg-editframe-700 active:text-slate-400 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/50",
};

export function Button( { className, variant = "primary", ...props }: React.ComponentProps<"button"> & { variant?: keyof typeof styles }) {
  return <button className={clsx(styles[variant], className)} {...props} />;
}

export function ButtonLink ({ className, variant = "primary", href, ...props }: React.ComponentProps<"a"> & { variant?: keyof typeof styles, href: string }) {
  return (
    <Link to={href}>
      <a className={clsx(styles[variant], className)} {...props} />
    </Link>
  );
}
