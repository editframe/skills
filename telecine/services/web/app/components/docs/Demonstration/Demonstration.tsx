import { Filmstrip, FitScale, FocusOverlay, Preview } from "@editframe/react";
import React, { useMemo, useState } from "react";
import { CodeEditor } from "../../CodeEditor";
import clsx from "clsx";
import { convertToWebComponents } from "./convertToWebComponents";
import { convertToJsx } from "./convertToJsx";
import { PersistentTab } from "../PersistentTabGroup";
import { PersistentTabGroup } from "../PersistentTabGroup";
import { useTheme } from "~/hooks/useTheme";

interface DemonstrationProps {
  children: React.ReactNode;
  
  // Layout
  layout?: "horizontal" | "vertical";
  className?: string;
  
  // Source code visibility
  sourceVisible?: boolean;        // Initial visibility state
  alwaysShowSource?: boolean;     // Keep source always visible
  hideSource?: boolean;           // Completely hide source
  
  // Video features (all opt-in)
  enablePreview?: boolean;        // Wrap in Preview component
  enableFilmstrip?: boolean;      // Show filmstrip
  enableFocusOverlay?: boolean;   // Show focus overlay
  enableFitScale?: boolean;       // Wrap content in FitScale
  checkerboard?: boolean;         // Add checkerboard background pattern
  
  // Preview-specific props
  id?: string;                    // Preview id
  loop?: boolean;                 // Enable loop for Preview
  
  // Filmstrip-specific props
  filmstripHide?: string;
  filmstripShow?: string;
}

export function Demonstration({
  children,
  layout,
  className,
  sourceVisible,
  alwaysShowSource,
  hideSource,
  enablePreview,
  enableFilmstrip,
  enableFocusOverlay,
  enableFitScale,
  checkerboard,
  id,
  loop,
  filmstripHide,
  filmstripShow,
}: DemonstrationProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  
  const htmlVersion = useMemo(() => convertToWebComponents(children), [children]);
  const jsxVersion = useMemo(() => convertToJsx(children), [children]);
  const [editableHtmlVersion, setEditableHtmlVersion] = useState("");

  React.useEffect(() => {
    setEditableHtmlVersion(htmlVersion);
  }, [htmlVersion]);
  
  const [isSourceVisible, setIsSourceVisible] = useState(sourceVisible ?? false);

  const extractedTargetId = useMemo(() => {
    if (enablePreview || !enableFilmstrip || !editableHtmlVersion) return null;

    const match = editableHtmlVersion.match(/\sid="([^"]+)"/);
    return match?.[1] || null;
  }, [editableHtmlVersion, enablePreview, enableFilmstrip]);

  const renderPreviewContent = () => {
    // Render React children directly
    const content = (
      <div className="contents">
        {children}
      </div>
    );

    const wrappedContent = enableFitScale ? (
      <FitScale className="w-full h-full max-w-full min-w-0">
        {content}
      </FitScale>
    ) : content;

    const contentWithOverlay = (
      <>
        {wrappedContent}
        {enableFocusOverlay && <FocusOverlay />}
      </>
    );

    const checkerboardStyle = checkerboard ? {
      backgroundImage: isDark 
        ? `
            linear-gradient(45deg, rgba(148, 163, 184, 0.3) 25%, transparent 25%),
            linear-gradient(-45deg, rgba(148, 163, 184, 0.3) 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, rgba(148, 163, 184, 0.3) 75%),
            linear-gradient(-45deg, transparent 75%, rgba(148, 163, 184, 0.3) 75%)
          `
        : `
            linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
            linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
            linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
            linear-gradient(-45deg, transparent 75%, #e5e7eb 75%)
          `,
      backgroundSize: '20px 20px',
      backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
    } : undefined;

    const mainContent = (
      <div 
        className="overflow-hidden bg-slate-300 dark:bg-slate-700 min-h-0 min-w-0 w-full h-full max-w-full"
        style={checkerboardStyle}
      >
        {contentWithOverlay}
      </div>
    );

    const filmstripContent = enableFilmstrip && (
      <div className="min-h-0">
        <Filmstrip
          target={extractedTargetId ?? undefined}
          autoScale
          className={clsx("w-full h-full", { dark: isDark })}
          hide={filmstripHide}
          show={filmstripShow}
        />
      </div>
    );

    if (enablePreview) {
      return (
        <Preview 
          id={id} 
          loop={loop} 
          className={clsx("h-full w-full max-w-full min-w-0 grid", {
            "grid-rows-[1.5fr_1fr]": enableFilmstrip,
            "grid-rows-[1fr]": !enableFilmstrip,
          })}
        >
          {mainContent}
          {filmstripContent}
        </Preview>
      );
    }

    if (enableFilmstrip) {
      return (
        <div className={clsx("h-full w-full max-w-full min-w-0 grid", {
          "grid-rows-[1.5fr_1fr]": true,
        })}>
          {mainContent}
          {filmstripContent}
        </div>
      );
    }

    return (
      <div className="h-full w-full max-w-full min-w-0">
        {mainContent}
      </div>
    );
  };

  return (
    <div
      className={clsx(
        "border-l-4 border-slate-300 dark:border-slate-600 pl-2 sm:pl-4 w-full max-w-full",
        className,
        {
          "grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-4": layout === "horizontal" && !hideSource,
        }
      )}
    >
      <div className="h-[calc(50vh-4rem)] sm:h-[calc(60vh-4rem)] min-h-[250px] w-full min-w-0 max-w-full">
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
