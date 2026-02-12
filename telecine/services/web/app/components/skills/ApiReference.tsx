import type { ApiMetadata, ApiAttribute } from "~/utils/skills.server";

function AttributeCard({ attr }: { attr: ApiAttribute }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded p-3 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-baseline gap-2 flex-1 min-w-0">
          <code className="text-sm font-bold text-gray-900 dark:text-white">
            {attr.name}
          </code>
          {attr.required && (
            <span className="text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400">
              Required
            </span>
          )}
        </div>
        <code className="text-xs font-mono text-blue-800 dark:text-blue-400 flex-shrink-0">
          {attr.type}
        </code>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
        {attr.description}
      </p>

      {/* Metadata row */}
      {(attr.default !== undefined || (attr.values && attr.values.length > 0)) && (
        <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs">
          {/* Default value */}
          {attr.default !== undefined && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400 dark:text-gray-500 font-medium">
                Default:
              </span>
              <code className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-900 dark:text-gray-300 font-mono">
                {String(attr.default)}
              </code>
            </div>
          )}

          {/* Possible values */}
          {attr.values && attr.values.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-gray-400 dark:text-gray-500 font-medium">
                Values:
              </span>
              {attr.values.map((value) => (
                <code
                  key={value}
                  className="px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-gray-900 dark:text-gray-300 font-mono"
                >
                  {value}
                </code>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ApiReference({ api }: { api: ApiMetadata }) {
  const hasAttributes = api.attributes && api.attributes.length > 0;
  const hasProperties = api.properties && api.properties.length > 0;
  const hasMethods = api.methods && api.methods.length > 0;
  const hasFunctions = api.functions && api.functions.length > 0;

  if (!hasAttributes && !hasProperties && !hasMethods && !hasFunctions) {
    return null;
  }

  return (
    <div className="not-prose my-8">
      {/* Attributes */}
      {hasAttributes && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            Attributes
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {api.attributes!.map((attr) => (
              <AttributeCard key={attr.name} attr={attr} />
            ))}
          </div>
        </div>
      )}

      {/* Properties */}
      {hasProperties && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            Properties
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {api.properties!.map((prop) => (
              <AttributeCard key={prop.name} attr={prop} />
            ))}
          </div>
        </div>
      )}

      {/* Methods */}
      {hasMethods && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            Methods
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {api.methods!.map((method) => (
              <div
                key={method.name}
                className="border border-gray-200 dark:border-gray-700 rounded p-3"
              >
                <code className="text-sm font-mono text-blue-800 dark:text-blue-400 block mb-1.5">
                  {method.signature}
                </code>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {method.description}
                </p>
                {method.returns && (
                  <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-xs text-gray-400 dark:text-gray-500">
                    <span className="font-medium">Returns:</span>{" "}
                    <code className="font-mono">{method.returns}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Functions */}
      {hasFunctions && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4 pb-2 border-b border-gray-200 dark:border-gray-700">
            Functions
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {api.functions!.map((func) => (
              <div
                key={func.name}
                className="border border-gray-200 dark:border-gray-700 rounded p-3"
              >
                <code className="text-sm font-mono text-blue-800 dark:text-blue-400 block mb-1.5">
                  {func.signature}
                </code>
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {func.description}
                </p>
                {func.returns && (
                  <div className="mt-2 pt-2 border-t border-black/5 dark:border-white/5 text-xs text-gray-400 dark:text-gray-500">
                    <span className="font-medium">Returns:</span>{" "}
                    <code className="font-mono">{func.returns}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
