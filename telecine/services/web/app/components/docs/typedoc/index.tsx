import React from "react";
import { Link } from "react-router";
import type { JSONOutput } from "typedoc";

enum ReflectionKind {
  Project = 0x1,
  Module = 0x2,
  Namespace = 0x4,
  Enum = 0x8,
  EnumMember = 0x10,
  Variable = 0x20,
  Function = 0x40,
  Class = 0x80,
  Interface = 0x100,
  Constructor = 0x200,
  Property = 0x400,
  Method = 0x800,
  CallSignature = 0x1000,
  IndexSignature = 0x2000,
  ConstructorSignature = 0x4000,
  Parameter = 0x8000,
  TypeLiteral = 0x10000,
  TypeParameter = 0x20000,
  Accessor = 0x40000,
  GetSignature = 0x80000,
  SetSignature = 0x100000,
  TypeAlias = 0x200000,
  Reference = 0x400000,
  /**
   * Generic non-ts content to be included in the generated docs as its own page.
   */
  Document = 0x800000,
}

const apiDocs = (
  await import("@editframe/api/types.json", {
    with: { type: "json" },
  })
).default as unknown as JSONOutput.ProjectReflection;

const reactDocs = (
  await import("@editframe/react/types.json", {
    with: { type: "json" },
  })
).default as unknown as JSONOutput.ProjectReflection;

const elementsDocs = (
  await import("@editframe/elements/types.json", {
    with: { type: "json" },
  })
).default as unknown as JSONOutput.ProjectReflection;

const assetsDocs = (
  await import("@editframe/assets/types.json", {
    with: { type: "json" },
  })
).default as unknown as JSONOutput.ProjectReflection;

export const getDocItem = (name: string) => {
  return (
    apiDocs.children?.find((child) => child.name === name) ||
    reactDocs.children?.find((child) => child.name === name) ||
    elementsDocs.children?.find((child) => child.name === name) ||
    assetsDocs.children?.find((child) => child.name === name)
  );
};

const filterChildren = (
  children:
    | (JSONOutput.DeclarationReflection | JSONOutput.ReferenceReflection)[]
    | undefined,
  ids?: JSONOutput.ReflectionGroup["children"],
) => {
  if (!ids) {
    return;
  }
  const idSet = new Set(ids);
  return children?.filter((child) => child.id && idSet.has(child.id as any));
};

const getChildIdsForGroup = (
  group: string,
  groups?: JSONOutput.ReflectionGroup[],
): JSONOutput.ReflectionGroup["children"] => {
  if (!groups) return [];
  return groups.find((g) => g.title === group)?.children ?? [];
};

const ShowClass = ({
  declaration,
}: {
  declaration: JSONOutput.DeclarationReflection;
}) => {
  const constructors = filterChildren(
    declaration.children,
    getChildIdsForGroup("Constructors", declaration.groups),
  );
  const properties = filterChildren(
    declaration.children,
    getChildIdsForGroup("Properties", declaration.groups),
  );
  const methods = filterChildren(
    declaration.children,
    getChildIdsForGroup("Methods", declaration.groups),
  );
  const accessors = filterChildren(
    declaration.children,
    getChildIdsForGroup("Accessors", declaration.groups),
  );
  return (
    <div>
      Class {declaration.name}
      <div>
        {constructors?.map((c) => (
          <ShowDeclaration declaration={c} />
        ))}
        {properties?.map((p) => (
          <ShowDeclaration declaration={p} />
        ))}
        {methods?.map((m) => (
          <ShowDeclaration declaration={m} />
        ))}
        {accessors?.map((a) => (
          <ShowDeclaration declaration={a} />
        ))}
      </div>
    </div>
  );
};

const ShowProperties = ({
  properties,
}: {
  properties: JSONOutput.DeclarationReflection[];
}) => {
  return properties.map((child) => {
    const isOptional = child.flags.isOptional;
    return (
      <div
        data-show-properties={true}
        key={child.name}
        className="flex flex-col gap-2 justify-between p-1 group hover:bg-slate-100"
      >
        <div className="pl-4 flex items-start gap-2">
          <span className="font-mono text-gray-600">
            {child.name}
            {isOptional ? "?" : ""}:{" "}
          </span>
          {child.type && <ShowType type={child.type} />}
        </div>
        {child.comment && (
          <div className="text-gray-500 pl-8 rounded-md">
            {child.comment.summary && (
              <ShowSummary summary={child.comment.summary} />
            )}
          </div>
        )}
      </div>
    );
  });
};

export const ShowDeclaration = ({
  declaration,
}: {
  declaration: JSONOutput.DeclarationReflection;
}) => {
  const kind = ReflectionKind[declaration.kind];
  const properties = filterChildren(
    declaration.children,
    getChildIdsForGroup("Properties", declaration.groups),
  );
  if (properties === undefined) {
    return null;
  }
  if (kind === "Interface") {
    return (
      <div>
        {/* <span className="font-mono text-purple-500">
          interface ({declaration.children?.length})
        </span>{" "} */}
        {/* <span className="text-blue-500">{declaration.name}</span>{" "} */}
        <span className="font-mono">{"{"}</span>
        <ShowProperties properties={properties} />

        <span className="font-mono">{"}"}</span>
      </div>
    );
  }

  if (kind === "TypeAlias" && declaration.type) {
    return <ShowType type={declaration.type} />;
  }

  if (kind === "Function" || kind === "Method" || kind === "Constructor") {
    return (
      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <div>
            {declaration.signatures?.map((signature) => (
              <div key={signature.id} className="font-mono">
                <span className="font-mono text-purple-500">function </span>
                <span className="text-blue-500">{declaration.name}</span>

                <span>(</span>
                <div className="flex flex-col">
                  {signature.parameters?.map((param) => (
                    <div key={param.id} className="flex items-start pl-4">
                      <span className="text-gray-600">{param.name}: </span>
                      {param.type && <ShowType type={param.type} />}
                    </div>
                  ))}
                </div>
                <span>)</span>
                <div className="flex items-center gap-2">
                  <span className="text-gray-400">{"returns "} </span>
                  {signature.type && <ShowType type={signature.type} />}
                </div>
              </div>
            ))}
          </div>
        </div>
        {declaration.comment?.summary && (
          <div className="pl-4 text-sm text-gray-600">
            <ShowSummary summary={declaration.comment.summary} />
          </div>
        )}
      </div>
    );
  }

  if (kind === "TypeLiteral") {
    const properties = filterChildren(
      declaration.children,
      getChildIdsForGroup("Properties", declaration.groups),
    );
    return (
      <>
        {declaration.signatures?.map((signature) => (
          <div key={signature.id} className="font-mono">
            <span>(</span>
            <div className="flex flex-col">
              {signature.parameters?.map((param) => (
                <div key={param.id} className="flex items-start pl-4">
                  <span className="text-gray-600">{param.name}: </span>
                  {param.type && <ShowType type={param.type} />}
                </div>
              ))}
            </div>
            <span>)</span>
            <div className="flex items-center gap-2">
              <span className="text-gray-400">{"returns "} </span>
              {signature.type && <ShowType type={signature.type} />}
            </div>
          </div>
        ))}
        {properties && (
          <div>
            <span className="font-mono">{"{"}</span>
            <ShowProperties properties={properties} />
            <span className="font-mono">{"}"}</span>
          </div>
        )}
      </>
    );
  }

  if (kind === "Property") {
    return (
      <div>
        <span className="font-mono text-purple-500">property </span>
        <span className="text-blue-500">{declaration.name}: </span>
        {declaration.type && <ShowType type={declaration.type} />}
      </div>
    );
  }

  if (kind === "Accessor") {
    console.log("Accessor", declaration);
    return (
      <div>
        <span className="font-mono text-purple-500">accessor </span>
        <span className="text-blue-500">{declaration.name}: </span>
        {declaration.getSignature && (
          <>
            {declaration.getSignature.type && (
              <ShowType type={declaration.getSignature.type} />
            )}
            {declaration.getSignature.comment && (
              <ShowSummary summary={declaration.getSignature.comment.summary} />
            )}
          </>
        )}
        {declaration.setSignature && (
          <>
            {declaration.setSignature.type && (
              <ShowType type={declaration.setSignature.type} />
            )}
            {declaration.setSignature.comment && (
              <ShowSummary summary={declaration.setSignature.comment.summary} />
            )}
          </>
        )}
      </div>
    );
  }

  if (kind === "Class") {
    return <ShowClass declaration={declaration} />;
  }

  if (kind === "Variable") {
    return null;
  }

  return (
    <>
      UNRECOGNIZED KIND: {kind}
      <pre className="text-xs text-red-500">
        {JSON.stringify(declaration, null, 2)}
      </pre>
    </>
  );
};

export const ShowDocItem = ({
  docItem,
}: {
  docItem: ReturnType<typeof getDocItem>;
}) => {
  if (!docItem) {
    return null;
  }
  const kind = ReflectionKind[docItem.kind];
  return (
    <div className="font-mono border-b border-gray-200 pb-4">
      <div>
        {docItem.name}: {kind} {docItem.variant}
      </div>
      {docItem.comment?.summary && (
        <ShowSummary summary={docItem.comment.summary} />
      )}
      <ShowDeclaration declaration={docItem} />
    </div>
  );
};

export const ShowDocItemByName = ({ name }: { name: string }) => {
  const docItem = getDocItem(name);
  if (!docItem) {
    return null;
  }
  return <ShowDocItem docItem={docItem} />;
};

// const ShowLitElement = ({
//   element,
// }: { element: ReturnType<typeof getElementsDocItem> }) => {
//   return <ShowDocItem docItem={element} />;
// };

const ShowSummary = ({
  summary,
}: {
  summary: JSONOutput.CommentDisplayPart[];
}) => {
  return (
    <>
      {summary.map((s) => {
        if (s.kind === "text") {
          return <span className="italic whitespace-pre-wrap">{s.text}</span>;
        }
        if (s.kind === "code") {
          return (
            <span className="font-mono whitespace-pre-wrap">{s.text}</span>
          );
        }
        return <span>Unrecognized summary kind: {s.kind}</span>;
      })}
    </>
  );
};

const ShowType = ({ type }: { type: JSONOutput.SomeType }) => {
  if (!type) {
    return null;
  }
  if (type.type === "intrinsic") {
    return <span className="font-mono text-blue-500">{type.name}</span>;
  }
  if (type.type === "reference") {
    return (
      <span className="font-mono text-blue-500">
        {type.package?.startsWith("@editframe") ? (
          <>
            <Link
              to={`/reference/${type.package}/${type.name}`}
              className="text-blue-500"
            >
              {type.name} 🔗
            </Link>
          </>
        ) : (
          type.name
        )}
        {type.typeArguments && (
          <span className="text-gray-400">
            {"<"}
            {type.typeArguments.map((arg, index) => (
              <React.Fragment key={index}>
                <ShowType type={arg} />
                {index < (type.typeArguments?.length ?? 0) - 1 && ", "}
              </React.Fragment>
            ))}
            {">"}
          </span>
        )}
      </span>
    );
  }
  if (type.type === "union") {
    return (
      <span className="font-mono text-blue-500">
        {type.types?.map((t, index) => (
          <React.Fragment key={index}>
            <ShowType type={t} />
            {index < type.types.length - 1 && " | "}
          </React.Fragment>
        ))}
      </span>
    );
  }
  if (type.type === "literal") {
    return (
      <span className="font-mono text-green-500">
        {type.value === null ? "null" : JSON.stringify(type.value)}
      </span>
    );
  }
  if (type.type === "array") {
    return (
      <span className="font-mono text-blue-500">
        Array&lt;
        <ShowType type={type.elementType} />
        &gt;
      </span>
    );
  }
  if (type.type === "reflection") {
    return <ShowDeclaration declaration={type.declaration} />;
  }
  return (
    <pre className="text-xs text-red-500">{JSON.stringify(type, null, 2)}</pre>
  );
};
