import { Filmstrip, FitScale, FocusOverlay, Preview } from "@editframe/react";
import React, { useMemo, useState } from "react";
import { CodeEditor } from "../../CodeEditor";
import clsx from "clsx";
import { convertToWebComponents } from "./convertToWebComponents";
import { convertToJsx } from "./convertToJsx";
import {
  CheckCircle,
  ClipboardText,
} from "@phosphor-icons/react";
import { PersistentTab } from "../PersistentTabGroup";
import { PersistentTabGroup } from "../PersistentTabGroup";
import { useTheme } from "~/hooks/useTheme";



interface DemonstrationProps {
  children: React.ReactNode;
  showSource?: boolean;
  id?: string;
  defaultSourceVisible?: boolean;
  layout?: "horizontal" | "vertical";
  alwaysShowSource?: boolean;
  hideSource?: boolean;
  hideFilmstrip?: boolean;
  filmstripHide?: string;
  filmstripShow?: string;
  hideFocusOverlay?: boolean;
  loop?: boolean;
  wrapInPreview?: boolean;
}

interface CopyButtonProps {
  text: string;
}

// @ts-expect-error CopyButton is not currently used, but should be re-instated into the design
function CopyButton({ text }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard", error);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="absolute top-2 right-2 px-2 py-1 text-xs font-medium rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 transition-colors"
    >
      {copied ? (
        <span className="flex items-center gap-1">
          Copied!{" "}
          <CheckCircle className="w-4 h-4 fill-mantis-300 text-mantis-500" />
        </span>
      ) : (
        <span className="flex items-center gap-1">
          Copy{" "}
          <ClipboardText className="w-4 h-4 fill-mantis-300 text-mantis-500" />
        </span>
      )}
    </button>
  );
}

export function Demonstration({
  children,
  id,
  defaultSourceVisible = false,
  layout = "vertical",
  alwaysShowSource = false,
  hideSource = false,
  hideFilmstrip = false,
  filmstripHide,
  filmstripShow,
  hideFocusOverlay = false,
  loop = false,
  wrapInPreview = true,
}: DemonstrationProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const htmlVersion = useMemo(() => convertToWebComponents(children), [children]);
  const jsxVersion = useMemo(() => convertToJsx(children), [children]);
  const [editableHtmlVersion, setEditableHtmlVersion] = useState("");

  React.useEffect(() => {
    setEditableHtmlVersion(htmlVersion);
  }, [htmlVersion]);
  const [isSourceVisible, setIsSourceVisible] = useState(defaultSourceVisible);

  const extractedTargetId = useMemo(() => {
    if (wrapInPreview || !editableHtmlVersion) return null;

    const match = editableHtmlVersion.match(/\sid="([^"]+)"/);
    return match?.[1] || null;
  }, [editableHtmlVersion, wrapInPreview]);

  const renderPreviewContent = () => {
    if (wrapInPreview) {
      return (
        <Preview id={id} loop={loop} className={clsx("h-full w-full grid", {
          "grid-rows-[1.5fr_1fr]": !hideFilmstrip,
          "grid-rows-[1fr]": hideFilmstrip,
        })}>
          <div className="overflow-hidden bg-slate-300 dark:bg-slate-700 min-h-0">
            <FitScale>
              <div
                className="contents"
                dangerouslySetInnerHTML={{
                  __html: editableHtmlVersion,
                }}
              />
            </FitScale>
            {!hideFocusOverlay && <FocusOverlay />}
          </div>
          {!hideFilmstrip && (
            <div className="min-h-0">
              <Filmstrip
                autoScale
                className={clsx("w-full h-full", { dark: isDark })}
                hide={filmstripHide}
                show={filmstripShow}
              />
            </div>
          )}
        </Preview>
      );
    }

    return (
      <div className={clsx("h-full w-full grid", {
        "grid-rows-[1.5fr_1fr]": !hideFilmstrip,
        "grid-rows-[1fr]": hideFilmstrip,
      })}>
        <div className="overflow-hidden bg-slate-300 dark:bg-slate-700 min-h-0">
          <FitScale>
            <div
              className="contents"
              dangerouslySetInnerHTML={{
                __html: editableHtmlVersion,
              }}
            />
          </FitScale>
          {!hideFocusOverlay && <FocusOverlay />}
        </div>
        {!hideFilmstrip && extractedTargetId && (
          <div className="min-h-0">
            <Filmstrip
              target={extractedTargetId}
              autoScale
              className={clsx("w-full h-full", { dark: isDark })}
              hide={filmstripHide}
              show={filmstripShow}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      className={clsx("border-l-4 border-slate-300 dark:border-slate-600 pl-2 sm:pl-4", {
        "grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4": layout === "horizontal" && !hideSource,
      })}
    >
      <div className="h-[calc(50vh-4rem)] sm:h-[calc(60vh-4rem)] min-h-[250px]">
        {renderPreviewContent()}
      </div>

      {!hideSource && (
        <div className="max-h-[calc(50vh-4rem)] sm:max-h-[calc(60vh-4rem)] flex flex-col">
          {!alwaysShowSource && (
            <button
              onClick={() => setIsSourceVisible(!isSourceVisible)}
              className="text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 flex items-center gap-1 py-2 touch-manipulation"
            >
              {isSourceVisible ? "▼" : "▶"} Show Source
            </button>
          )}

          {(isSourceVisible || alwaysShowSource) && (
            <PersistentTabGroup stateKey="demonstration">
              <PersistentTab label="HTML">
                <CodeEditor
                  className="my-2 sm:my-4"
                  code={editableHtmlVersion}
                  onChange={(newCode) => setEditableHtmlVersion(newCode || "")}
                  language="html"
                />
              </PersistentTab>
              <PersistentTab label="JSX (read only)">
                <CodeEditor
                  readOnly
                  className="my-2 sm:my-4"
                  code={jsxVersion}
                  onChange={() => { }}
                  language="javascript"
                />
              </PersistentTab>
            </PersistentTabGroup>
          )}
        </div>
      )}
    </div>
  );
}
