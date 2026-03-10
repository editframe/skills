import { Highlight, themes } from "prism-react-renderer";
import { Children, useEffect, useState } from "react";
import type { FC, PropsWithChildren, ReactElement } from "react";

interface CodeBlockProps extends PropsWithChildren {
  className?: string;
}

const languageAliases: Record<string, string> = {
  html: "markup",
  xml: "markup",
  js: "javascript",
  ts: "typescript",
};

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

  let code: string;
  let language: string;

  if (typeof firstChild === "string") {
    code = removeCommonIndentation(firstChild.trim());
    language = className?.replace("language-", "") || "tsx";
  } else {
    const codeElement = firstChild as ReactElement<{
      children: string;
      className?: string;
    }>;
    code = removeCommonIndentation(codeElement.props.children.trim());
    language = codeElement.props.className?.replace("language-", "") || "text";
  }

  const resolvedLanguage = languageAliases[language] || language;

  return (
    <Highlight
      theme={isDarkMode ? themes.nightOwl : themes.github}
      code={code}
      language={resolvedLanguage}
    >
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className="overflow-x-auto rounded-md"
          style={{
            ...style,
            fontSize: "0.8125rem",
            lineHeight: "1.625",
            padding: "1rem",
            margin: 0,
          }}
        >
          {tokens.map((line, i) => (
            <div key={i} {...getLineProps({ line })}>
              {line.map((token, key) => (
                <span key={key} {...getTokenProps({ token })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};
