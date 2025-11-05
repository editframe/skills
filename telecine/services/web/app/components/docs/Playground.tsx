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
    <div className="px-4 py-6">
      <div className="flex flex-col space-y-8">
        <div className="grid lg:grid-cols-2 gap-6 h-[600px]">
          <div className="relative">
            <h2 className="text-xl font-semibold mb-4">Preview</h2>
            <div className="h-full flex flex-col">
              <div className="flex-grow relative">
                <EFPlayer
                  className="absolute inset-0 w-full"
                  code={presetCode.replace("{{code}}", changedCode)}
                />
              </div>
            </div>
          </div>

          <div className="relative">
            {typeof window !== "undefined" && (
              <div className="h-full flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">Playground</h2>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={copyToClipboard}
                    className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    {copied ? "Copied!" : "Copy Code"}
                  </motion.button>
                </div>
                <div className="flex-grow relative h-full">
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
