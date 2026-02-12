import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { ghcolors as github } from "react-syntax-highlighter/dist/cjs/styles/prism";
import phpLanguage from "react-syntax-highlighter/dist/cjs/languages/prism/php";
import jsxLanguage from "react-syntax-highlighter/dist/cjs/languages/prism/jsx";
import javascriptLanguage from "react-syntax-highlighter/dist/cjs/languages/prism/javascript";
import typescriptLanguage from "react-syntax-highlighter/dist/cjs/languages/prism/typescript";
import markupLanguage from "react-syntax-highlighter/dist/cjs/languages/prism/markup";
import cssLanguage from "react-syntax-highlighter/dist/cjs/languages/prism/css";
import { Children, useEffect, useState } from "react";
import type { FC, PropsWithChildren, ReactElement } from "react";

// Handle both ESM and CommonJS module formats
const phpLang = "default" in phpLanguage ? phpLanguage.default : phpLanguage;
const jsxLang = "default" in jsxLanguage ? jsxLanguage.default : jsxLanguage;
const jsLang = "default" in javascriptLanguage ? javascriptLanguage.default : javascriptLanguage;
const tsLang = "default" in typescriptLanguage ? typescriptLanguage.default : typescriptLanguage;
const markupLang = "default" in markupLanguage ? markupLanguage.default : markupLanguage;
const cssLang = "default" in cssLanguage ? cssLanguage.default : cssLanguage;

// Register language support
SyntaxHighlighter.registerLanguage("php", phpLang);
SyntaxHighlighter.registerLanguage("jsx", jsxLang);
SyntaxHighlighter.registerLanguage("javascript", jsLang);
SyntaxHighlighter.registerLanguage("js", jsLang);
SyntaxHighlighter.registerLanguage("typescript", tsLang);
SyntaxHighlighter.registerLanguage("ts", tsLang);
SyntaxHighlighter.registerLanguage("markup", markupLang);
SyntaxHighlighter.registerLanguage("html", markupLang);
SyntaxHighlighter.registerLanguage("xml", markupLang);
SyntaxHighlighter.registerLanguage("css", cssLang);

interface CodeBlockProps extends PropsWithChildren {
  className?: string;
}

const removeCommonIndentation = (code: string) => {
  const lines = code.split("\n");
  let mindent: null | number = null;

  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    const match = line.match(/^(\s*)/);
    const indent = match?.[1]?.length ?? 0;
    if (mindent === null) {
      mindent = indent;
    } else {
      mindent = Math.min(mindent, indent);
    }
  }

  if (mindent !== null && mindent > 0) {
    const m = mindent;
    return lines
      .map((line) => {
        const leadingWhitespace = line.match(/^(\s*)/)?.[1]?.length ?? 0;
        return leadingWhitespace >= m ? line.slice(m) : line;
      })
      .join("\n");
  }

  return code;
};

export const CodeBlock: FC<CodeBlockProps> = ({ children, className = "" }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    };

    updateTheme();

    window.addEventListener("theme", updateTheme);

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      window.removeEventListener("theme", updateTheme);
      observer.disconnect();
    };
  }, []);

  const childrenArray = Children.toArray(children);
  const firstChild = childrenArray[0];
  
  // Handle both direct string children and wrapped <code> elements
  let code: string;
  let language: string;
  
  if (typeof firstChild === 'string') {
    // Direct string child
    code = removeCommonIndentation(firstChild.trim());
    language = className?.replace("language-", "") || "typescript";
  } else {
    // Wrapped in code element (from markdown)
    const codeElement = firstChild as ReactElement;
    code = removeCommonIndentation(codeElement.props.children.trim());
    language = codeElement.props.className?.replace("language-", "") || "text";
  }

  return (
    <SyntaxHighlighter
      language={language}
      style={isDarkMode ? nightOwl : github}
      className={`code-block-clean overflow-x-auto ${className}`}
      customStyle={{
        fontSize: "0.875rem", // text-sm (14px)
        lineHeight: "1.625", // leading-relaxed
        padding: "0.75rem", // p-3
        margin: 0,
      }}
      showLineNumbers={false}
      wrapLines={false}
      PreTag="div"
      CodeTag="code"
      lineProps={{
        style: { display: "block" }
      }}
      codeTagProps={{
        style: { display: "inline-block", whiteSpace: "pre", minWidth: "100%" }
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};
