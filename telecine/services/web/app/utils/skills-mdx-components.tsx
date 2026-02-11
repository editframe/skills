import * as React from "react";
import { Link } from "react-router";
import { CodeBlock } from "~/components/CodeBlock";
import { Preview, FitScale, FocusOverlay, Filmstrip } from "@editframe/react";
import clsx from "clsx";
import { useTheme } from "~/hooks/useTheme";

// --- Helper: Extract text content from React nodes ---

function extractText(node: React.ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractText).join("");
  if (React.isValidElement(node)) {
    return extractText((node.props as { children?: React.ReactNode }).children);
  }
  return "";
}

// --- SkillLink: Transform relative reference links ---

function SkillLink({
  href,
  ...props
}: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  "data-skill-name"?: string;
}) {
  const skillName = props["data-skill-name"];

  if (href && href.startsWith("references/") && href.endsWith(".md")) {
    const refName = href.replace("references/", "").replace(".md", "");
    return <Link to={`/skills/${skillName}/${refName}`} {...props} />;
  }

  if (href && (href.startsWith("http://") || href.startsWith("https://"))) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props} />
    );
  }

  return <Link to={href || "#"} {...props} />;
}

// --- LiveDemo: Interactive preview + source for html live blocks ---

function LiveDemo({ code }: { code: string }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [showSource, setShowSource] = React.useState(false);

  return (
    <div className="not-prose my-8">
      <div className="flex items-center gap-2 mb-2">
        <span className="px-2 py-0.5 bg-[var(--poster-blue)] text-white text-[10px] font-bold uppercase tracking-wider">
          Live
        </span>
      </div>

      <div className="border-2 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="h-[calc(50vh-4rem)] min-h-[300px] w-full">
          <Preview
            loop
            className="h-full w-full grid grid-rows-[1.5fr_1fr]"
          >
            <div className="overflow-hidden bg-slate-300 dark:bg-slate-700 min-h-0 min-w-0 w-full h-full max-w-full">
              <FitScale className="w-full h-full max-w-full min-w-0">
                <div
                  className="contents"
                  dangerouslySetInnerHTML={{ __html: code }}
                />
              </FitScale>
              <FocusOverlay />
            </div>
            <div className="min-h-0">
              <Filmstrip
                {...({ autoScale: true } as Record<string, unknown>)}
                className={clsx("w-full h-full", { dark: isDark })}
              />
            </div>
          </Preview>
        </div>
      </div>

      <button
        onClick={() => setShowSource(!showSource)}
        className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)] cursor-pointer py-2 hover:text-[var(--ink-black)] dark:hover:text-white transition-colors mt-1"
      >
        {showSource ? "\u25BC" : "\u25B6"} Source
      </button>
      {showSource && (
        <div className="border-2 border-[var(--ink-black)]/10 dark:border-white/10 overflow-hidden">
          <CodeBlock className="language-html">{code}</CodeBlock>
        </div>
      )}
    </div>
  );
}

// --- SkillsPreBlock: Detects html live blocks and routes to LiveDemo ---

function SkillsPreBlock(props: React.HTMLAttributes<HTMLPreElement>) {
  const childArray = React.Children.toArray(props.children);
  const codeElement = childArray[0];

  if (React.isValidElement(codeElement)) {
    const codeProps = codeElement.props as Record<string, unknown>;
    const meta = (codeProps["data-meta"] as string) || "";
    const className = (codeProps.className as string) || "";
    const isHtml = className.includes("language-html");
    const isLive = meta.includes("live");

    if (isHtml && isLive) {
      const codeContent = codeProps.children;
      const code =
        typeof codeContent === "string" ? codeContent.trim() : "";
      if (code) {
        return <LiveDemo code={code} />;
      }
    }
  }

  return <CodeBlock {...props} />;
}

// --- Attribute Table: Enhanced styling for property tables ---

function detectAttributeTable(children: React.ReactNode): boolean {
  const text = extractText(children);
  return (
    /Attribute/i.test(text) &&
    /Type/i.test(text) &&
    /Description/i.test(text)
  );
}

function SkillsTable(props: React.TableHTMLAttributes<HTMLTableElement>) {
  const { children, ...rest } = props;

  if (detectAttributeTable(children)) {
    return (
      <div className="not-prose my-8 border-l-4 border-[var(--poster-blue)] overflow-x-auto">
        <table
          className={clsx(
            "w-full text-sm border-collapse",
            "[&_thead_th]:px-5 [&_thead_th]:py-3 [&_thead_th]:text-left [&_thead_th]:text-xs [&_thead_th]:font-bold [&_thead_th]:uppercase [&_thead_th]:tracking-wider",
            "[&_thead_th]:text-[var(--ink-black)] dark:[&_thead_th]:text-white",
            "[&_thead_th]:border-b-2 [&_thead_th]:border-[var(--ink-black)] dark:[&_thead_th]:border-white",
            "[&_thead_th]:bg-[var(--ink-black)]/[0.03] dark:[&_thead_th]:bg-white/[0.03]",
            "[&_tbody_td]:px-5 [&_tbody_td]:py-3",
            "[&_tbody_td]:text-[var(--warm-gray)]",
            "[&_tbody_td]:border-b [&_tbody_td]:border-[var(--ink-black)]/10 dark:[&_tbody_td]:border-white/10",
            "[&_tbody_td:nth-child(2)]:font-mono [&_tbody_td:nth-child(2)]:text-[var(--poster-blue)]",
            "[&_tbody_td:nth-child(3)]:font-mono [&_tbody_td:nth-child(3)]:text-xs [&_tbody_td:nth-child(3)]:opacity-60",
            "[&_tbody_tr:last-child_td]:border-b-0",
          )}
          {...rest}
        >
          {children}
        </table>
      </div>
    );
  }

  return <table {...rest}>{children}</table>;
}

// --- Callout Blockquote: Note/Warning styling ---

function detectCalloutType(
  children: React.ReactNode,
): "note" | "warning" | null {
  const text = extractText(children).trim();
  if (text.startsWith("Note:")) return "note";
  if (text.startsWith("Warning:")) return "warning";
  return null;
}

const calloutStyles = {
  note: {
    borderColor: "var(--poster-blue)",
    backgroundColor: "color-mix(in srgb, var(--poster-blue) 6%, transparent)",
  },
  warning: {
    borderColor: "var(--poster-gold)",
    backgroundColor: "color-mix(in srgb, var(--poster-gold) 8%, transparent)",
  },
};

function SkillsBlockquote(
  props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>,
) {
  const { children, ...rest } = props;
  const calloutType = detectCalloutType(children);

  if (calloutType) {
    const styles = calloutStyles[calloutType];
    return (
      <div
        className="not-prose my-6 border-l-4 p-4 rounded-r text-sm leading-relaxed text-[var(--warm-gray)]"
        style={{
          borderColor: styles.borderColor,
          backgroundColor: styles.backgroundColor,
        }}
      >
        <div className="[&_p]:m-0 [&_strong]:text-[var(--ink-black)] dark:[&_strong]:text-white">
          {children}
        </div>
      </div>
    );
  }

  return <blockquote {...rest}>{children}</blockquote>;
}

// --- Export: getSkillsMDXComponents ---

export function getSkillsMDXComponents(skillName: string) {
  return {
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <SkillLink {...props} data-skill-name={skillName} />
    ),
    pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
      <SkillsPreBlock {...props} />
    ),
    table: (props: React.TableHTMLAttributes<HTMLTableElement>) => (
      <SkillsTable {...props} />
    ),
    blockquote: (props: React.BlockquoteHTMLAttributes<HTMLQuoteElement>) => (
      <SkillsBlockquote {...props} />
    ),
    // TODO: Tutorial step indicators — detect ### Step N: headings and add step-indicator styling
  };
}
