import { Link } from "react-router";

export function CustomLink(props: React.ComponentProps<typeof Link>) {
  const href = props.href || "";
  
  if (href.startsWith("http")) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-600 dark:text-blue-400 hover:underline"
      >
        {props.children}
      </a>
    );
  }
  
  return (
    <Link
      to={href}
      className="text-blue-600 dark:text-blue-400 hover:underline"
    >
      {props.children}
    </Link>
  );
}

export function CustomCode(props: React.ComponentProps<"code">) {
  return (
    <code
      className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-sm font-mono"
      {...props}
    />
  );
}
