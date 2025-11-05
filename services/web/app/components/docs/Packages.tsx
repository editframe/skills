import { Link } from "react-router";
import NpmLogo from "~/ui/icons/npm.svg";
import { Button } from "~/components/docs/Button";

const packages = [
    {
        href: "/docs/packages/cli",
        name: "@editframe/cli",
        description: "A command-line tool for interacting with the Editframe platform.",
        logo: NpmLogo,
    },
    {
        href: "/docs/packages/create",
        name: "@editframe/create",
        description: "A library for creating new projects and templates.",
        logo: NpmLogo,
    }
];

export const Packages = () => {
    return (
        <div className="my-4 xl:max-w-none">
            <div className="not-prose border-zinc-900/5 grid grid-cols-1 gap-x-6 gap-y-10 border-t  sm:grid-cols-2 xl:max-w-none xl:grid-cols-2 dark:border-white/5">
                {packages.map((library) => (
                    <Link to={library.href} key={library.name}>
                        <div
                            key={library.name}
                            className="flex mt-2 flex-row-reverse items-center gap-6"
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
                                        renderAs="span"
                                        arrow="right"
                                    >
                                        Read more
                                    </Button>
                                </p>
                            </div>
                            <img src={library.logo} alt="" className="h-12 w-12" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    )
}
