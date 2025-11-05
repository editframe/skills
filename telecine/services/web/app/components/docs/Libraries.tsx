import { Button } from "~/components/docs/Button";
import NodeLogo from "~/ui/icons/node.svg";

const libraries = [
  {
    href: "https://github.com/editframe/editframe-js",
    name: "Node.js",
    description:
      "Node.js® is an open-source, cross-platform JavaScript runtime environment.",
    logo: NodeLogo,
  },
];

export function Libraries() {
  return (
    <div className="my-4 xl:max-w-none">
      <h2 className="text-zinc-900 text-2xl font-semibold dark:text-white">
        Official libraries
      </h2>
      <div className="not-prose border-zinc-900/5 grid grid-cols-1 gap-x-6 gap-y-10 border-t  sm:grid-cols-2 xl:max-w-none xl:grid-cols-2 dark:border-white/5">
        {libraries.map((library) => (
          <div
            key={library.name}
            className="flex flex-row-reverse items-center gap-6"
          >
            <div className="flex-auto">
              <h3 className="text-zinc-900 text-sm font-semibold dark:text-white">
                {library.name}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mt-1 text-sm">
                {library.description}
              </p>
              <p className="mt-4">
                <Button
                  variant="text"
                  renderAs="a"
                  arrow="right"
                  href={library.href}
                >
                  Read more
                </Button>
              </p>
            </div>
            <img src={library.logo} alt="" className="h-12 w-12" />
          </div>
        ))}
      </div>
    </div>
  );
}
