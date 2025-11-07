import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import clsx from "clsx";
import { useSearchParams } from "react-router";

export const extractServerTableSearchParams = (
  searchParams: URLSearchParams,
) => {
  return {
    page: Number.parseInt(searchParams.get("page") ?? "0", 10),
    limit: Number.parseInt(searchParams.get("limit") ?? "10", 10),
  };
};

export const useTableSearchParams = () => {
  const [searchParams, setSearchParams] = useSearchParams({
    page: "0",
    limit: "10",
  });
  const page = Number.parseInt(searchParams.get("page") ?? "0", 10);
  const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10);

  const updateSearchParams = (
    update: Partial<{
      page?: string;
      limit?: string;
    }>,
  ) => {
    setSearchParams({
      ...Object.fromEntries(searchParams.entries()),
      ...update,
    });
  };

  return { page, limit, searchParams, updateSearchParams };
};

interface TablePaginationProps {
  count?: number;
  limit: number;
  page: number;
  updateSearchParams: (
    update: Partial<{ page?: string; limit?: string }>,
  ) => void;
}

export const TablePagination = ({
  count,
  limit,
  page,
  updateSearchParams,
}: TablePaginationProps) => {
  return (
    <div className={clsx(
      "flex flex-wrap justify-between items-center gap-3 px-3 py-2 text-xs transition-colors",
      "bg-slate-50/50 dark:bg-slate-800/30",
      "border-t border-slate-200/80 dark:border-slate-800/80",
      "w-full"
    )}>
      <label className={clsx(
        "flex items-center gap-2 transition-colors",
        "text-slate-600 dark:text-slate-400"
      )}>
        <span>Rows per page</span>
        <select
          name="limit"
          className={clsx(
            "h-7 min-w-[55px] rounded-lg border px-2 py-0.5 text-xs leading-snug transition-all duration-150 relative",
            "bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm",
            "text-slate-900 dark:text-slate-100",
            "border-slate-300/75 dark:border-slate-700/75",
            "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
            "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/18 before:via-transparent before:to-transparent",
            "dark:before:from-blue-950/15 before:via-transparent dark:before:to-transparent",
            "before:pointer-events-none before:rounded-lg",
            "hover:border-slate-400/85 dark:hover:border-slate-600/85",
            "focus:border-blue-500/85 dark:focus:border-blue-400/85 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:focus:ring-blue-400/20",
            "focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(59_130_246_/_0.22)] dark:focus:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(59_130_246_/_0.35)]",
            "focus:before:from-blue-50/30 focus:before:via-transparent focus:before:to-transparent",
            "dark:focus:before:from-blue-950/22 dark:focus:before:via-transparent dark:focus:before:to-transparent"
          )}
          value={limit.toString()}
          onChange={(event) => {
            updateSearchParams({
              limit: event.currentTarget.value,
              page: "0",
            });
          }}
        >
          <option value="1">1</option>
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </label>
      <div className={clsx(
        "flex items-center gap-2.5 transition-colors",
        "text-slate-600 dark:text-slate-400"
      )}>
        <span className="text-xs">
          {count !== undefined ? (
            <>
              {page * limit + 1} - {Math.min((page + 1) * limit, count)} of {count}
            </>
          ) : (
            <>
              {page * limit + 1} - {(page + 1) * limit}
            </>
          )}
        </span>
        <div className="flex items-center gap-0.5">
          <button
            className={clsx(
              "flex items-center justify-center h-7 w-7 rounded-lg transition-all duration-150",
              "text-slate-600 dark:text-slate-400",
              "hover:bg-slate-100 dark:hover:bg-slate-700/50",
              "hover:text-slate-900 dark:hover:text-slate-100",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
              page === 0 && "opacity-40 cursor-not-allowed"
            )}
            disabled={page === 0}
            title={page === 0 ? "No previous page" : "Go to previous page"}
            onClick={() => updateSearchParams({ page: (page - 1).toString() })}
          >
            <CaretLeft className="w-4 h-4" weight="bold" />
          </button>
          <button
            className={clsx(
              "flex items-center justify-center h-7 w-7 rounded-lg transition-all duration-150",
              "text-slate-600 dark:text-slate-400",
              "hover:bg-slate-100 dark:hover:bg-slate-700/50",
              "hover:text-slate-900 dark:hover:text-slate-100",
              "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent",
              count !== undefined && page * limit + limit >= count && "opacity-40 cursor-not-allowed"
            )}
            disabled={count !== undefined && page * limit + limit >= count}
            title={
              count !== undefined && page * limit + limit >= count
                ? "No next page"
                : "Go to next page"
            }
            onClick={() => updateSearchParams({ page: (page + 1).toString() })}
          >
            <CaretRight className="w-4 h-4" weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
};
