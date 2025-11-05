import type { FC } from "react";

interface Heading {
  value: string;
  slug: string;
}

export const TableOfContents: FC<{
  headings?: Heading[];
}> = ({ headings }) => {
  if (!headings) return <></>;

  return (
    <>
      <h2> Table of Contents</h2>
      <ul>
        {headings.map(({ value, slug }) =>
          slug && value ? (
            <li key={slug}>
              <a className="hover:font-bold" href={`#${slug}`}>
                {value}
              </a>
            </li>
          ) : (
            <></>
          ),
        )}
      </ul>
    </>
  );
};
