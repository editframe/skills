import { useRef, useCallback, useState } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { ClientOnly } from "remix-utils/client-only";
import { createTailwindcss } from "@mhsdesign/jit-browser-tailwindcss";

const tailwindCss = createTailwindcss({});

export const CodeEditor = ({
  className,
  code,
  language,
  onChange,
  readOnly = false,
  height,
}: {
  code: string;
  className?: string;
  language: string;
  onChange: (newCode: string | undefined) => void;
  readOnly?: boolean;
  height?: string | number;
}) => {
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [css, setCss] = useState("");
  const updateHeight = useCallback(() => {
    const editor = editorRef.current;
    const container = containerRef.current;
    if (!editor || !container) {
      return;
    }

    if (height) {
      container.style.height =
        typeof height === "number" ? `${height}px` : height;
      editor.layout({
        width: container.clientWidth,
        height: container.clientHeight,
      });
      return;
    }

    const contentHeight = Math.min(1000, editor.getContentHeight());
    container.style.height = `${contentHeight}px`;
    editor.layout({ width: container.clientWidth, height: contentHeight });
  }, [height]);

  return (
    <div ref={containerRef} className={className}>
      <ClientOnly>
        {() => (
          <>
            <style>{css}</style>
            <Editor
              language={language}
              theme="vs"
              value={code}
              onMount={(editor, monaco) => {
                editorRef.current = editor;
                monacoRef.current = monaco;
                editor.onDidContentSizeChange(updateHeight);
                updateHeight();
              }}
              onChange={(value) => {
                tailwindCss
                  .generateStylesFromContent(
                    `
              @tailwind base;
              @tailwind components;
              @tailwind utilities;
              `,
                    [value as string],
                  )
                  .then(setCss);
                onChange(value);
              }}
              options={{
                readOnly,
                padding: {},
                fontFamily: "iaw-mono-var",
                fontSize: 14,
                wordWrap: "on",
                cursorStyle: "line",
                folding: false,
                tabSize: 2,
                minimap: {
                  enabled: false,
                },
                smoothScrolling: true,
                cursorSmoothCaretAnimation: "off",
                contextmenu: false,
                automaticLayout: true,
                disableLayerHinting: true,
                lineNumbers: "off",
                scrollBeyondLastLine: false,
                overviewRulerBorder: false,
                scrollbar: {
                  vertical: "visible",
                  horizontal: "hidden",
                  alwaysConsumeMouseWheel: false,
                },
              }}
            />
          </>
        )}
      </ClientOnly>
    </div>
  );
};
