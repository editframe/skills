import clsx from "clsx";
import { getDocItem, ShowDeclaration } from "../typedoc";

const HTTPMethod = ({ method }: { method: string }) => {
  const styles =
    {
      GET: "bg-emerald-500 dark:bg-emerald-600",
      POST: "bg-blue-500 dark:bg-blue-600",
      PUT: "bg-amber-500 dark:bg-amber-600",
      DELETE: "bg-red-500 dark:bg-red-600",
      PATCH: "bg-purple-500 dark:bg-purple-600",
    }[method] || "bg-gray-500 dark:bg-gray-600";

  return (
    <span
      className={clsx(
        "px-2.5 py-1 text-xs font-mono font-bold text-white rounded uppercase tracking-wider",
        styles,
      )}
    >
      {method}
    </span>
  );
};

export const HTTPEndpoint = ({
  method,
  path,
  children,
}: {
  method: string;
  path: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="my-6">
      <div className="flex items-center gap-3 mb-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <HTTPMethod method={method} />
        <code className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100 break-all">
          {path}
        </code>
      </div>
      <div className="pl-4">{children}</div>
    </div>
  );
};

export const HTTPPayload = ({ docName }: { docName: string }) => {
  const docItem = getDocItem(docName);
  if (!docItem)
    return (
      <p className="text-red-600 dark:text-red-400">
        No doc item found for {docName}
      </p>
    );
  return (
    <div className="my-4">
      <div className="inline-flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Request Body
        </span>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <ShowDeclaration declaration={docItem} />
      </div>
    </div>
  );
};

export const HTTPResponse = ({ docName }: { docName: string }) => {
  const docItem = getDocItem(docName);
  if (!docItem)
    return (
      <p className="text-red-600 dark:text-red-400">
        No doc item found for {docName}
      </p>
    );
  return (
    <div className="my-4">
      <div className="inline-flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
          Response
        </span>
      </div>
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <ShowDeclaration declaration={docItem} />
      </div>
    </div>
  );
};
