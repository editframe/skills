interface PropertyDocProps {
  name: string;
  children: React.ReactNode;
  type: string;
  defaultValue: string;
  domReadable?: boolean | string;
  domWritable?: boolean | string;
  htmlAttribute?: boolean | string;
}

export function PropertyDoc({
  name,
  children,
  type,
  defaultValue,
  domReadable,
  domWritable,
  htmlAttribute,
}: PropertyDocProps) {
  return (
    <div className="flex flex-col gap-3 sm:gap-4 py-2 text-xs sm:text-sm hover:bg-gray-50">
      <h3
        className="px-2 my-0 font-mono text-base sm:text-lg bg-blue-200 text-gray-900 break-words"
        id={`attr-${name}`}
      >
        {name}
      </h3>

      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
        <div className="w-full sm:w-48 sm:shrink-0 flex flex-col gap-1.5 sm:gap-2">
          <div className="px-2 flex flex-col gap-1 sm:gap-1.5 text-gray-600 text-xs sm:text-sm">
            {(domReadable || domWritable) && (
              <div>
                <span className="font-medium">DOM: </span>
                <span className="text-gray-500">
                  {domReadable &&
                    (typeof domReadable === "string"
                      ? `read (${domReadable})`
                      : "read")}
                  {domReadable && domWritable && (
                    <span className="text-gray-400"> / </span>
                  )}
                  {domWritable &&
                    (typeof domWritable === "string"
                      ? `write (${domWritable})`
                      : "write")}
                </span>
              </div>
            )}

            {htmlAttribute && (
              <>
                <div>
                  <span className="font-medium">HTML: </span>
                  <code className="not-prose font-mono bg-gray-50 px-1 rounded text-gray-500">
                    {typeof htmlAttribute === "string" ? htmlAttribute : name}
                  </code>
                </div>
                <div>
                  <span className="font-medium">JSX: </span>
                  <code className="not-prose font-mono bg-gray-50 px-1 rounded text-gray-500">
                    {name}
                  </code>
                </div>
              </>
            )}
          </div>
        </div>

        <div>
          <div className="flex flex-col gap-1.5">
            <div>
              <span className="font-medium">Type: </span>
              <code className="not-prose font-mono bg-gray-50 px-1 rounded">
                {type}
              </code>
            </div>

            {defaultValue && (
              <div>
                <span className="font-medium">Default: </span>
                {defaultValue ? (
                  <code className="not-prose font-mono bg-gray-50 px-1 rounded">
                    {defaultValue}
                  </code>
                ) : (
                  <span className="text-gray-500">—</span>
                )}
              </div>
            )}
          </div>

          {type === "timestring" && (
            <p className="text-gray-600 mb-0">
              A string representing time duration (e.g. "5s", "1.5s", "500ms")
            </p>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

interface PropertyDocListProps {
  children: React.ReactNode;
}

export function PropertyDocList({ children }: PropertyDocListProps) {
  return (
    <div className="[&>*:nth-child(odd)]:bg-white [&>*:nth-child(even)]:bg-gray-50">
      {children}
    </div>
  );
}
