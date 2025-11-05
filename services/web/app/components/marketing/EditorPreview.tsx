import { useState, useRef, useEffect } from "react";
import Editor, { type Monaco } from "@monaco-editor/react";
import type { editor as MonacoEditor } from 'monaco-editor';
import { Preview, Timegroup, Video } from "@editframe/react";
import type { EFPreview } from "@editframe/elements";
import { Link } from "react-router";

export const EditorPreview = ({
  code,
}: {
  code: string;
  presetCode: string
}) => {
  const editor = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const previewRef = useRef<EFPreview | null>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [isThemeLoaded, setIsThemeLoaded] = useState(false);

  const setEditorTheme = (monaco: Monaco) => {
    monaco.editor.defineTheme("tokyo-night", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "#565f89", fontStyle: "italic" },
        { token: "keyword", foreground: "#bb9af7" },
        { token: "string", foreground: "#9ece6a" },
        { token: "number", foreground: "#ff9e64" },
        { token: "regexp", foreground: "#b4f9f8" },
        { token: "operator", foreground: "#73daca" },
        { token: "namespace", foreground: "#7dcfff" },
        { token: "type", foreground: "#7aa2f7" },
        { token: "struct", foreground: "#7dcfff" },
        { token: "class", foreground: "#7dcfff" },
        { token: "interface", foreground: "#7dcfff" },
        { token: "enum", foreground: "#7dcfff" },
        { token: "typeParameter", foreground: "#7dcfff" },
        { token: "function", foreground: "#7aa2f7" },
        { token: "method", foreground: "#7aa2f7" },
        { token: "decorator", foreground: "#7aa2f7" },
        { token: "macro", foreground: "#7aa2f7" },
        { token: "variable", foreground: "#c0caf5" },
        { token: "parameter", foreground: "#c0caf5" },
        { token: "property", foreground: "#c0caf5" },
        { token: "enumMember", foreground: "#ff9e64" },
      ],
      colors: {
        "editor.background": "#1a1b26",
        "editor.foreground": "#c0caf5",
        "editorLineNumber.foreground": "#3b4261",
        "editorCursor.foreground": "#c0caf5",
        "editor.selectionBackground": "#515c7e",
        "editor.inactiveSelectionBackground": "#3b4261",
      },
    });
    setIsThemeLoaded(true);
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: true,
    });
    updateTheme();
  };

  const updateTheme = () => {
    const isDarkMode = localStorage.theme === 'dark';
    setDarkMode(isDarkMode);

    if (editor.current && monacoRef.current) {
      editor.current.updateOptions({
        theme: isDarkMode ? 'tokyo-night' : 'vs-light'
      });
    }
  };

  useEffect(() => {
    const themeChangeHandler = () => {
      updateTheme();
    };

    window.addEventListener('theme', themeChangeHandler);

    return () => {
      window.removeEventListener('theme', themeChangeHandler);
    };
  }, []);

  useEffect(() => {
    if (editor.current) {
      editor.current.onDidChangeModelDecorations(() => {
        updateEditorHeight()
        requestAnimationFrame(updateEditorHeight)
      })
      let prevHeight = 0

      const updateEditorHeight = () => {
        if (!editor.current) {
          return
        }
        const editorElement = editor.current.getDomNode()

        if (!editorElement) {
          return
        }

        const lineHeight = 10;
        const lineCount = editor.current.getModel()?.getLineCount() || 1
        const height = editor.current.getTopForLineNumber(lineCount + 1) + lineHeight

        if (prevHeight !== height) {
          prevHeight = height
          editorElement.style.height = `${height}px`
          editor.current.layout()
        }
      }
    }

    return () => { };
  }, [])
  const [videoChunks, setVideoChunks] = useState([
    { src: "assets/video.mp4", sourceIn: "0s", sourceOut: "5s" },
  ]);
  const [currentTime, setCurrentTime] = useState(0);

  const handleSplit = () => {
    const newChunks = [
      { src: "assets/video.mp4", sourceIn: "2.5s", sourceOut: "3s" },
      { src: "assets/video.mp4", sourceIn: "4s", sourceOut: "5s" },
    ];
    setVideoChunks(newChunks);
  };
  const togglePlay = () => {
    if (previewRef.current?.playing) {
      previewRef.current?.pause();
    } else {
      previewRef.current?.play();
    }
  };

  useEffect(() => {
    const handleTimeUpdate = (event: CustomEvent) => {
      setCurrentTime(event.detail.currentTimeMs);
    };

    previewRef.current?.addEventListener(
      "timeupdate",
      handleTimeUpdate as EventListener,
    );

    return () => {
      previewRef.current?.removeEventListener(
        "timeupdate",
        handleTimeUpdate as EventListener,
      );
    };
  }, []);

  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="xl:max-w-none w-full">
      <div className="px-2 w-full">
        <div className="lg:w-1/2">
          <p className="pt-4 text-[#67676C] dark:text-gray-300 my-0 mx-auto text-md leading-7 text-left whitespace-pre-wrap break-words sm:pt-3 sm:text-lg sm:leading-8 lg:m-0 lg:text-xl lg:leading-9 scroll-auto w-full">
            Update the code using <span className="text-[#646cff]  dark:text-[#646cff] ">HTML</span> and <span className="text-[#646cff]  dark:text-[#646cff] ">CSS</span> watch the video change.
          </p>
        </div>
        <div className="flow-root mt-8 w-full">
          <div className="flex flex-col w-full">
            <div className="w-full">
              <div className="grid lg:grid-cols-2 grid-cols-1 gap-x-4 gap-y-4 w-full"
                style={{
                  minHeight: "500px",
                  width: "100%",
                }}>
                <div className="w-full h-full min-h-[500px]">
                  {typeof window !== "undefined" && (
                    <div ref={ref} className="w-full h-full">
                      <Editor
                        height="100%"
                        language="typescript"
                        theme={isThemeLoaded ? (darkMode ? "tokyo-night" : "light") : "vs-dark"}
                        value={code}
                        beforeMount={setEditorTheme}
                        onMount={(_editor, monaco) => {
                          if (!isThemeLoaded) {
                            setEditorTheme(monaco);
                            monacoRef.current = monaco;
                          }
                        }}
                        keepCurrentModel={true}
                        options={{
                          fontFamily: 'iaw-mono-var',
                          fontSize: 14,
                          wordWrap: 'on',
                          tabSize: 2,
                          minimap: {
                            enabled: false,
                          },
                          smoothScrolling: true,
                          cursorSmoothCaretAnimation: 'on',
                          contextmenu: false,
                          automaticLayout: true,
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="w-full h-full min-h-[500px]">
                  <div className="flex flex-col items-center gap-4 text-black">
                    <Preview ref={previewRef}>
                      <Timegroup
                        className="w-[500px] h-[500px] bg-slate-900 flex items-center justify-center relative overflow-hidden"
                        mode="sequence"
                      >
                        {videoChunks.map((chunk) => (
                          <Timegroup
                            className="w-full h-full flex items-center justify-center"
                          >
                            <Video
                              src={chunk.src}
                              className="w-full"
                              sourcein={chunk.sourceIn}
                              sourceout={chunk.sourceOut}
                            />
                          </Timegroup>
                        ))}
                      </Timegroup>
                    </Preview >
                    <button type="button" onClick={togglePlay}>
                      {

                        previewRef.current?.playing ?

                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="text-black"
                          ><path d="M8 5v14l11-7z" />
                          </svg> :
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="24" height="24" className="text-black">
                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                          </svg>
                      }

                    </button>
                    <button type="button" onClick={handleSplit}>
                      Split Video
                    </button>
                    <div>Current Time: {currentTime}ms</div>
                  </div >
                </div>
              </div>
              <div className="w-full lg:w-1/2">
                <Link
                  className="block mb-4 py-2 lg:mb-0 max-w-full w-max  mx-auto text-center rounded-sm mt-8 px-5 text-sm font-semibold cursor-pointer m-1 transition-colors duration-250 text-white bg-[#646CFF]  hover:bg-[#646CFF]  dark:bg-[#646CFF]  dark:hover:bg-[#646cff]-700"
                  to="/docs">
                  Edit this example in the Editframe Playground
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
