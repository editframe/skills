import { themes, Highlight } from "prism-react-renderer";
import { useEffect, useState } from "react";

interface CodeBlockProps {
  code: string;
  language: string;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ code, language }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    const updateTheme = () => {
      const isDark =
        localStorage.theme === "dark" ||
        (!("theme" in localStorage) &&
          window.matchMedia("(prefers-color-scheme: dark)").matches);
      setIsDarkMode(isDark);
    };

    updateTheme();

    window.addEventListener("storage", updateTheme);
    window.addEventListener("theme", updateTheme);

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "theme") {
        updateTheme();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", updateTheme);
      window.removeEventListener("theme", updateTheme);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <Highlight
      theme={isDarkMode ? themes.nightOwl : themes.github}
      code={code}
      language={language}
    >
      {({ className, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`overflow-x-auto p-4 ${isDarkMode ? "bg-slate-900" : "bg-slate-100"} rounded-xl prism-code w-full ${className}`}
          style={{ maxWidth: "100%" }}
        >
          {tokens.map((line, i) => (
            <div
              {...getLineProps({ line, key: i })}
              className="whitespace-pre-wrap"
            >
              {line.map((token, key) => (
                <span {...getTokenProps({ token, key })} />
              ))}
            </div>
          ))}
        </pre>
      )}
    </Highlight>
  );
};
