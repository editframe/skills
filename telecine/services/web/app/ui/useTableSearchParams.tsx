import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
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
    <div className="flex justify-start items-center bg-gray-50 gap-2 text-sm pl-2">
      <label className="flex items-center gap-2 ">
        Rows per page
        <select
          name="limit"
          className="h-6 min-w-[50px] rounded border border-gray-300 bg-white px-2 py-0.5 text-xs font-light leading-none hover:border-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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
      <div className="grid grid-cols-[2ch_auto_2ch_auto_3ch] gap-x-1">
        {count !== undefined ? (
          <>
            <span className="text-right">{page * limit}</span>
            <span>-</span>
            <span className="text-right">
              {Math.min((page + 1) * limit, count)}
            </span>
            <span>of</span>
            <span className="text-right">{count}</span>
          </>
        ) : (
          <>
            <span className="text-right">{page * limit}</span>
            <span>-</span>
            <span className="text-right">{(page + 1) * limit}</span>
          </>
        )}
      </div>
      <button
        className={clsx(
          "flex items-center justify-center h-8",
          page === 0 && "opacity-50",
        )}
        disabled={page === 0}
        title={page === 0 ? "No previous page" : "Go to previous page"}
        onClick={() => updateSearchParams({ page: (page - 1).toString() })}
      >
        <ChevronLeftIcon className="w-5 h-5" />
      </button>
      <button
        className={clsx(
          "flex items-center justify-center h-8",
          count !== undefined && page * limit + limit >= count && "opacity-50",
        )}
        disabled={count !== undefined && page * limit + limit >= count}
        title={
          count !== undefined && page * limit + limit >= count
            ? "No next page"
            : "Go to next page"
        }
        onClick={() => updateSearchParams({ page: (page + 1).toString() })}
      >
        <ChevronRightIcon className="w-5 h-5" />
      </button>
    </div>
  );
};
