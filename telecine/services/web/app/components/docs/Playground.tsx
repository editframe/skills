import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { CodeEditor } from "../CodeEditor";
import { EFPlayer } from "../EFPlayer";

export const Playground = ({
  code,
  presetCode = "{{code}}",
}: {
  code: string;
  presetCode: string;
}) => {
  const [changedCode, setChangedCode] = useState(code);
  const [copied, setCopied] = useState(false);
  const handleCodeChange = useCallback((value: string | undefined) => {
    if (value) {
      setChangedCode(value);
    }
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(changedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="px-2 sm:px-4 py-4 sm:py-6">
      <div className="flex flex-col space-y-4 sm:space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-auto lg:h-[600px]">
          <div className="relative min-h-[300px] lg:min-h-0">
            <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">
              Preview
            </h2>
            <div className="h-full flex flex-col">
              <div className="flex-grow relative min-h-[250px] sm:min-h-[300px]">
                <EFPlayer
                  className="absolute inset-0 w-full"
                  code={presetCode.replace("{{code}}", changedCode)}
                />
              </div>
            </div>
          </div>

          <div className="relative min-h-[300px] lg:min-h-0">
            {typeof window !== "undefined" && (
              <div className="h-full flex flex-col">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3 sm:mb-4">
                  <h2 className="text-lg sm:text-xl font-semibold">
                    Playground
                  </h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={copyToClipboard}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-md text-xs sm:text-sm font-medium touch-manipulation"
                  >
                    {copied ? "Copied!" : "Copy Code"}
                  </motion.button>
                </div>
                <div className="flex-grow relative h-full min-h-[250px] sm:min-h-[300px]">
                  <CodeEditor
                    code={changedCode}
                    onChange={handleCodeChange}
                    language="html"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
