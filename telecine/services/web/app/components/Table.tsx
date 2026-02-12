import clsx from "clsx";
import {
  TablePagination,
  useTableSearchParams,
} from "~/ui/useTableSearchParams";
import { EmptyResult } from "./EmptyResult";
import { useNavigateWithSearch } from "~/ui/navigateWithSearch";

export const TableHead = (
  props: React.PropsWithChildren & { className?: string },
) => {
  return (
    <thead className={props.className}>
      <tr
        className={clsx(
          "border-b transition-colors relative",
          "border-slate-300/75 dark:border-slate-700/75",
          "bg-gradient-to-br from-slate-50/95 via-slate-50/85 to-slate-50/95",
          "dark:from-slate-800/95 dark:via-slate-800/85 dark:to-slate-800/95",
        )}
      >
        {props.children}
      </tr>
    </thead>
  );
};

export const ColumnHead = (
  props: React.PropsWithChildren & { className?: string },
) => {
  return (
    <th
      className={clsx(
        "px-3 py-2.5 text-xs font-semibold text-left tracking-wider transition-colors align-middle whitespace-nowrap",
        "text-slate-700 dark:text-slate-300",
        props.className,
      )}
    >
      {props.children}
    </th>
  );
};

export const TableRow = (
  props: React.PropsWithChildren & {
    className?: string;
    noHighlight?: boolean;
    selected?: boolean;
    onClick?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
  },
) => {
  return (
    <tr
      className={clsx(
        "border-b transition-all duration-150 relative",
        "border-slate-200/60 dark:border-slate-800/60",
        "bg-white dark:bg-slate-900",
        !props.noHighlight &&
          !props.selected &&
          "hover:bg-slate-50/60 dark:hover:bg-slate-800/40",
        props.selected && [
          "bg-blue-50/80 dark:bg-blue-950/50",
          "border-blue-300/70 dark:border-blue-900/70",
          "before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-50/40 before:via-transparent before:to-transparent",
          "dark:before:from-blue-950/30 dark:before:via-transparent dark:before:to-transparent",
          "before:pointer-events-none",
        ],
        props.className,
      )}
      onClick={props.onClick}
    >
      {props.children}
    </tr>
  );
};

export const TableCell = (
  props: React.PropsWithChildren & { className?: string; colSpan?: number },
) => {
  return (
    <td
      className={clsx(
        "px-3 py-2.5 text-sm align-middle transition-colors",
        "text-slate-900 dark:text-slate-100",
        "leading-snug",
        props.className,
      )}
      colSpan={props.colSpan}
    >
      {props.children}
    </td>
  );
};

interface TableProps<
  RowType extends { [RowKey: string]: unknown },
  RowKey extends keyof RowType = "id",
> {
  rows: RowType[];
  rowKey?: RowKey;
  buildRowURL?: (row: RowType) => string;
  emptyResultMessage: string;
  emptyResultContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  columns: {
    name: string;
    content: React.ComponentType<RowType>;
  }[];
  rowClassName?: (row: RowType) => string | undefined;
}

interface PaginatedTableProps<
  RowType extends { [RowKey: string]: unknown },
  RowKey extends keyof RowType = "id",
> extends TableProps<RowType, RowKey> {
  count?: number;
}

export const Table = <
  RowType extends { [RowKey: string]: unknown },
  RowKey extends keyof RowType = "id",
>({
  rows,
  rowKey,
  buildRowURL,
  emptyResultMessage,
  emptyResultContent,
  columns,
  footerContent,
  rowClassName,
}: TableProps<RowType, RowKey>) => {
  const navigate = useNavigateWithSearch();

  return (
    <div
      className={clsx(
        "overflow-hidden rounded-lg border backdrop-blur-sm transition-all relative w-full",
        "bg-white/95 dark:bg-slate-900/95",
        "border-slate-300/75 dark:border-slate-700/75",
        "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08),0_4px_12px_0_rgb(0_0_0_/_0.12)]",
        "dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4),0_4px_12px_0_rgb(0_0_0_/_0.5)]",
        "before:absolute before:inset-0 before:bg-gradient-to-br before:from-amber-50/25 before:via-transparent before:to-transparent",
        "dark:before:from-blue-950/18 dark:before:via-transparent dark:before:to-transparent",
        "before:pointer-events-none before:rounded-lg",
      )}
    >
      <table className="w-full border-collapse table-fixed">
        <TableHead>
          {columns.map((column) => (
            <ColumnHead key={column.name}>{column.name}</ColumnHead>
          ))}
        </TableHead>
        <tbody>
          {rows.length === 0 && (
            <TableRow noHighlight>
              <TableCell colSpan={columns.length}>
                <EmptyResult resourceLabel={emptyResultMessage}>
                  {emptyResultContent}
                </EmptyResult>
              </TableCell>
            </TableRow>
          )}
          {rows.map((row) => {
            const url = buildRowURL?.(row);
            const customClassName = rowClassName
              ? rowClassName(row)
              : undefined;

            return (
              <TableRow
                key={rowKey ? String(row[rowKey]) : String(row.id)}
                onClick={
                  url
                    ? (event) => {
                        // Check if the click is on a link or other interactive element
                        if (event.target instanceof HTMLElement) {
                          const isInteractive = event.target.closest(
                            "a, button, input, select, textarea",
                          );
                          if (isInteractive) {
                            return; // Don't navigate if clicking on an interactive element
                          }
                        }
                        event.preventDefault();
                        navigate(url);
                      }
                    : undefined
                }
                className={clsx(url && "cursor-pointer", customClassName)}
              >
                {columns.map((column) => (
                  <TableCell key={column.name}>
                    <column.content {...row} />
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </tbody>
        {footerContent && (
          <tfoot>
            <tr>
              <td
                className="p-0 w-full"
                colSpan={columns.length}
                style={{ width: "100%" }}
              >
                {footerContent}
              </td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
};

export const PaginatedTable = <RowType extends { id: string }>({
  rows,
  count,
  emptyResultMessage,
  emptyResultContent,
  columns,
  buildRowURL,
}: PaginatedTableProps<RowType>) => {
  const { limit, page, updateSearchParams } = useTableSearchParams();

  return (
    <Table
      rows={rows}
      buildRowURL={buildRowURL}
      emptyResultMessage={emptyResultMessage}
      emptyResultContent={emptyResultContent}
      columns={columns}
      footerContent={
        <TablePagination
          count={count}
          limit={limit}
          page={page}
          updateSearchParams={updateSearchParams}
        />
      }
    />
  );
};
