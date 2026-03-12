import { useRef, useCallback, useState, useEffect } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from "monaco-editor";
import { ClientOnly } from "remix-utils/client-only";
import { createTailwindcss } from "@mhsdesign/jit-browser-tailwindcss";
import { useTheme } from "~/hooks/useTheme";

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
  const { resolvedTheme } = useTheme();
  const monacoTheme = resolvedTheme === "dark" ? "vs-dark" : "vs";

  // Update Monaco editor theme when app theme changes
  useEffect(() => {
    const updateEditorTheme = (themeToUse?: string) => {
      const editor = editorRef.current;
      const monaco = monacoRef.current;
      if (editor && monaco) {
        // If theme is not provided, determine it from DOM
        const theme =
          themeToUse ||
          (document.documentElement.classList.contains("dark")
            ? "vs-dark"
            : "vs");
        monaco.editor.setTheme(theme);
      }
    };

    // Update immediately if refs are available
    updateEditorTheme(monacoTheme);

    // Listen for theme change events and read directly from DOM
    const handleThemeChange = () => {
      // Read theme directly from DOM to avoid React state lag
      const isDark = document.documentElement.classList.contains("dark");
      const theme = isDark ? "vs-dark" : "vs";
      updateEditorTheme(theme);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("theme", handleThemeChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("theme", handleThemeChange);
      }
    };
  }, [monacoTheme]);

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
              theme={monacoTheme}
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
