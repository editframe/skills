import clsx from "clsx";

interface InfoRowProps {
  label: string;
  value: React.ReactNode;
  className?: string;
  vertical?: boolean;
  noHighlight?: boolean;
}

export function InfoRow({
  label,
  value,
  className = "",
  vertical = false,
  noHighlight = false,
}: InfoRowProps) {
  return (
    <div
      className={clsx(
        "border-b last:border-b-0 py-2 transition-colors",
        "border-slate-300 dark:border-slate-700",
        noHighlight === true ? "" : "hover:bg-slate-50 dark:hover:bg-slate-800",
        className,
      )}
    >
      <div className={clsx(vertical ? "flex flex-col gap-1" : "flex")}>
        <span
          className={clsx(
            "text-xs font-medium transition-colors",
            "text-slate-700 dark:text-slate-300",
            vertical ? "" : "w-1/3 lg:w-1/4 xl:w-1/5",
          )}
        >
          {label}
        </span>
        <span
          className={clsx(
            "text-xs font-light transition-colors",
            "text-slate-900 dark:text-white",
            vertical ? "pl-4" : "w-2/3 lg:w-3/4 xl:w-4/5",
          )}
        >
          {value}
        </span>
      </div>
    </div>
  );
}
