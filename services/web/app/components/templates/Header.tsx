import cx from "clsx";
import { useNavigate } from "react-router";
import { DetailsMenu, DetailsPopup } from "./DetailsMenu";
import iconsHref from "~/ui/icons.svg";
import { Link } from "react-router";
import { useIsActivePath } from "~/ui/primitives/utils";
import { InnerContainer } from "./InnerContainer";

const navigation = [
  { to: "/docs", label: "Docs" },
  // { to: "/guides", label: "Guides" },
  // { to: "/blogs", label: "Blog" },
  // { to: "/changelog", label: "Changelog" },
  // { to: "/templates", label: "Templates" },
];

export function Header() {
  const navigate = useNavigate();

  return (
    <div
      className={cx(
        "relative border-b border-gray-100/50 bg-white text-black dark:border-gray-800 dark:bg-editframe-900 dark:text-gray-100",
        // This hides some of the underlying text when the user scrolls to the
        // bottom which results in the overscroll bounce
        "before:absolute before:bottom-0 before:left-0 before:hidden before:h-[500%] before:w-full before:bg-inherit lg:before:block",
      )}
    >
      <InnerContainer>
        <div className="relative z-20 flex h-[--header-height] w-full items-center justify-between py-3">
          <div className="flex w-full items-center justify-between gap-4 sm:gap-8 md:w-auto">
            <Link
              className="flex"
              onContextMenu={(event) => {
                event.preventDefault();
                navigate("/brand");
              }}
              to="/"
            >
              <img
                src="https://efapi.nyc3.cdn.digitaloceanspaces.com/web/logo_black.png"
                alt="Editframe"
                className="h-6 dark:invert"
              />
            </Link>
            <div className="flex items-center gap-2">
              <HeaderMenuMobile className="md:hidden" />
            </div>
          </div>
          <div className="flex gap-8">
            <div className="hidden items-center md:flex">
              {navigation.map((nav) => (
                <HeaderMenuLink key={nav.to} to={nav.to}>
                  {nav.label}
                </HeaderMenuLink>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <HeaderLink
                href="https://github.com/editframe"
                svgId="github"
                label="View code on GitHub"
                title="View code on GitHub"
                svgSize="24x24"
              />
            </div>
          </div>
        </div>
      </InnerContainer>
    </div>
  );
}

function HeaderMenuLink({
  className = "",
  to,
  children,
}: {
  to: string;
  className?: string;
  children: React.ReactNode;
}) {
  const isActive = useIsActivePath(to);

  return (
    <Link
      prefetch="intent"
      to={to}
      className={cx(
        className,
        "p-2 py-2.5 text-sm leading-none underline-offset-4 hover:underline md:p-3",
        isActive
          ? "text-black underline decoration-black dark:text-gray-200 dark:decoration-gray-200"
          : "text-gray-500 decoration-gray-200 dark:text-gray-400 dark:decoration-gray-500",
      )}
    >
      {children}
    </Link>
  );
}

function HeaderMenuMobile({ className = "" }: { className: string }) {
  // This is the same default, hover, focus style as the VersionSelect
  const baseClasses =
    "bg-gray-100 hover:bg-gray-200 [[open]>&]:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:[[open]>&]:bg-gray-700";

  return (
    <DetailsMenu className={cx("relative cursor-pointer", className)}>
      <summary
        className={cx(
          baseClasses,
          "_no-triangle grid h-10 w-10 place-items-center rounded-full",
        )}
      >
        <svg className="h-5 w-5">
          <use href={`${iconsHref}#menu`} />
        </svg>
      </summary>
      <DetailsPopup>
        <div className="flex flex-col">
          {navigation.map((item) => (
            <HeaderMenuLink key={item.to} to={item.to}>
              {item.label}
            </HeaderMenuLink>
          ))}
        </div>
      </DetailsPopup>
    </DetailsMenu>
  );
}

function HeaderLink({
  className = "",
  href,
  svgId,
  label,
  svgSize,
  title,
}: {
  className?: string;
  href: string;
  svgId: string;
  label: string;
  svgSize: string;
  title?: string;
}) {
  const [width, height] = svgSize.split("x");

  return (
    <a
      href={href}
      className={cx(
        "hidden h-10 w-10 place-items-center text-black hover:text-gray-600 md:grid dark:text-gray-400 dark:hover:text-gray-50",
        className,
      )}
      title={title}
    >
      <span className="sr-only">{label}</span>
      <svg aria-hidden style={{ width: `${width}px`, height: `${height}px` }}>
        <use href={`${iconsHref}#${svgId}`} />
      </svg>
    </a>
  );
}
