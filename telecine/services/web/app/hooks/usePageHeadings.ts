import * as React from "react";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

export function usePageHeadings() {
  const [headings, setHeadings] = React.useState<Heading[]>([]);
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    const mainElement = document.querySelector("main[data-skills-main]");
    if (!mainElement) return;

    const headingElements = mainElement.querySelectorAll("h2, h3");
    const extracted: Heading[] = [];

    headingElements.forEach((heading) => {
      const id =
        heading.id ||
        (heading.textContent
          ?.toLowerCase()
          .replace(/\s+/g, "-")
          .replace(/[^\w-]/g, "") ?? "");
      if (!heading.id && id) {
        heading.id = id;
      }
      if (heading.id) {
        extracted.push({
          id: heading.id,
          text: heading.textContent || "",
          level: parseInt(heading.tagName[1] ?? "2"),
        });
      }
    });

    setHeadings(extracted);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -80% 0px" },
    );

    headingElements.forEach((h) => {
      if (h.id) observer.observe(h);
    });

    return () => observer.disconnect();
  }, []);

  return { headings, activeId };
}
