import * as React from "react";

interface Heading {
  id: string;
  text: string;
  level: number;
}

export function OnThisPage() {
  const [headings, setHeadings] = React.useState<Heading[]>([]);
  const [activeId, setActiveId] = React.useState<string>("");

  React.useEffect(() => {
    // Extract headings from the main content
    const mainElement = document.querySelector('main[data-skills-main]');
    if (!mainElement) return;

    const headingElements = mainElement.querySelectorAll('h2, h3');
    const extractedHeadings: Heading[] = [];

    headingElements.forEach((heading) => {
      const id = heading.id || heading.textContent?.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '') || '';
      if (!heading.id && id) {
        heading.id = id;
      }
      
      if (heading.id) {
        extractedHeadings.push({
          id: heading.id,
          text: heading.textContent || '',
          level: parseInt(heading.tagName[1]),
        });
      }
    });

    setHeadings(extractedHeadings);

    // Set up intersection observer for active heading
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-80px 0px -80% 0px',
      }
    );

    headingElements.forEach((heading) => {
      if (heading.id) {
        observer.observe(heading);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav className="sticky top-10 hidden xl:block w-56 flex-shrink-0 pl-8">
      <div className="text-[11px] font-bold uppercase tracking-wider text-[var(--warm-gray)]/60 dark:text-gray-500 mb-3">
        On This Page
      </div>
      <ul className="space-y-2 text-sm border-l-2 border-black/5 dark:border-white/5">
        {headings.map((heading) => (
          <li
            key={heading.id}
            style={{
              paddingLeft: heading.level === 3 ? '1rem' : '0.5rem',
            }}
          >
            <a
              href={`#${heading.id}`}
              className={`block py-0.5 transition-colors ${
                activeId === heading.id
                  ? 'text-[var(--accent-blue)] font-medium border-l-2 border-[var(--accent-blue)] -ml-[2px] pl-[calc(0.5rem-2px)]'
                  : 'text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white'
              }`}
              style={{
                paddingLeft: activeId === heading.id 
                  ? heading.level === 3 ? 'calc(1rem - 2px)' : 'calc(0.5rem - 2px)'
                  : undefined
              }}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
