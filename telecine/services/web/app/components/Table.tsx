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
      <tr className="border-y text-xs border-gray-300 bg-gray-100">
        {props.children}
      </tr>
    </thead>
  );
};

export const ColumnHead = (
  props: React.PropsWithChildren & { className?: string },
) => {
  return (
    <th className={clsx("p-1 font-medium text-left", props.className)}>
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
        "border-b text-xs border-gray-300 bg-white",
        !props.noHighlight && !props.selected && "hover:bg-gray-100",
        props.selected && "bg-blue-100",
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
      className={clsx("p-1 font-light align-baseline", props.className)}
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
    <table className="w-full border-collapse">
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
          const customClassName = rowClassName ? rowClassName(row) : undefined;

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
              className={clsx(
                "border-b text-xs border-gray-300 bg-white",
                !url && "hover:bg-gray-100",
                url && "cursor-pointer hover:bg-gray-100",
                customClassName,
              )}
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
            <td colSpan={columns.length}>{footerContent}</td>
          </tr>
        </tfoot>
      )}
    </table>
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
