import clsx from "clsx";
import { getDocItem, ShowDeclaration } from "../typedoc";

const HTTPMethod = ({ method }: { method: string }) => {
  return (
    <span
      className={clsx("px-2 text-sm font-mono font-medium text-white", {
        "bg-green-500": method === "GET",
        "bg-blue-500": method === "POST",
        "bg-gray-500": method === "GET" || method === "POST",
      })}
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
    <div>
      <div className="text-sm font-mono font-medium text-gray-700">
        <HTTPMethod method={method} /> {path}
      </div>
      {children}
    </div>
  );
};

export const HTTPPayload = ({ docName }: { docName: string }) => {
  const docItem = getDocItem(docName);
  if (!docItem) return <p>No doc item found for {docName}</p>;
  return (
    <div className="text-sm font-mono font-medium text-gray-700">
      <span className="font-mono text-purple-500">Request payload data</span>
      <ShowDeclaration declaration={docItem} />
    </div>
  );
};

export const HTTPResponse = ({ docName }: { docName: string }) => {
  const docItem = getDocItem(docName);
  if (!docItem) return <p>No doc item found for {docName}</p>;
  return (
    <div className="text-sm font-mono font-medium text-gray-700">
      <span className="font-mono text-purple-500">Response payload data</span>
      <ShowDeclaration declaration={docItem} />
    </div>
  );
};
