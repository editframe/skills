import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import { nightOwl } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { ghcolors as github } from "react-syntax-highlighter/dist/cjs/styles/prism";
import phpLanguage from "react-syntax-highlighter/dist/cjs/languages/prism/php";
import { Children, useEffect, useState } from "react";
import type { FC, PropsWithChildren, ReactElement } from "react";

// Handle both ESM and CommonJS module formats
const phpLang = "default" in phpLanguage ? phpLanguage.default : phpLanguage;

// Register PHP language support
SyntaxHighlighter.registerLanguage("php", phpLang);

interface CodeBlockProps extends PropsWithChildren {
  className?: string;
}

const removeCommonIndentation = (code: string) => {
  const lines = code.split('\n');
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
      .join('\n');
  }

  return code;
};

export const CodeBlock: FC<CodeBlockProps> = ({ children, className = "" }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setIsDarkMode(isDark);
    };

    updateTheme();

    window.addEventListener("theme", updateTheme);
    
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => {
      window.removeEventListener("theme", updateTheme);
      observer.disconnect();
    };
  }, []);

  const childrenArray = Children.toArray(children);
  const codeElement = childrenArray[0] as ReactElement;
  const code = removeCommonIndentation(codeElement.props.children.trim());
  const language =
    codeElement.props.className?.replace("language-", "") || "text";

  return (
    <SyntaxHighlighter
      language={language}
      style={isDarkMode ? nightOwl : github}
      className={`overflow-scroll ${className}`}
      customStyle={{
        fontSize: '0.875rem', // text-sm (14px)
        lineHeight: '1.625', // leading-relaxed
        padding: '0.75rem', // p-3
        margin: 0,
      }}
    >
      {code}
    </SyntaxHighlighter>
  );
};
