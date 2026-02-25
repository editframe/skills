import { Link } from "react-router";
import type { SVGProps } from "react";
import { themeClasses } from "~/utils/theme-classes";
import clsx from "clsx";

export function Footer() {
  const navigation = {
    product: [
      { name: "Documentation", href: "/docs" },
      { name: "Guides", href: "/guides" },
      { name: "Tools", href: "/tools" },
      { name: "Pricing", href: "/pricing" },
      { name: "llms.txt", href: "/llms.txt", reloadDocument: true },
    ],
    technologies: [
      { name: "React", href: "/react" },
      { name: "AnimeJS", href: "/with/animejs" },
    ],
    legal: [
      { name: "Terms of Service", href: "/terms" },
      { name: "Privacy Policy", href: "/privacy" },
    ],
    social: [
      {
        name: "Github",
        href: "https://github.com/editframe",
        target: "_blank",
        icon: (props: SVGProps<SVGSVGElement>) => (
          <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path
              fillRule="evenodd"
              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
      {
        name: "Instagram",
        href: "https://instagram.com/edit_frame",
        target: "_blank",
        icon: (props: SVGProps<SVGSVGElement>) => (
          <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path
              fillRule="evenodd"
              d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z"
              clipRule="evenodd"
            />
          </svg>
        ),
      },
      {
        name: "X",
        href: "https://x.com/editframe",
        target: "_blank",
        icon: (props: SVGProps<SVGSVGElement>) => (
          <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M13.6823 10.6218L20.2391 3H18.6854L12.9921 9.61788L8.44486 3H3.2002L10.0765 13.0074L3.2002 21H4.75404L10.7663 14.0113L15.5685 21H20.8131L13.6819 10.6218H13.6823ZM11.5541 13.0956L10.8574 12.0991L5.31391 4.16971H7.70053L12.1742 10.5689L12.8709 11.5655L18.6861 19.8835H16.2995L11.5541 13.096V13.0956Z" />
          </svg>
        ),
      },
      {
        name: "LinkedIn",
        href: "https://www.linkedin.com/company/editframe",
        target: "_blank",
        icon: (props: SVGProps<SVGSVGElement>) => (
          <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
        ),
      },
    ],
  };
  return (
    <footer
      className={clsx(
        "border-t mt-20 sm:mt-24 lg:mt-32 border-solid pb-12 sm:pb-16 pt-12 sm:pt-16 lg:pt-20 text-base font-medium leading-5",
        themeClasses.pageBorder,
        themeClasses.pageTextSecondary,
      )}
    >
      <div className="px-4 sm:px-6 lg:px-[5.5rem] max-w-6xl mx-auto w-full">
        <div className="mx-auto mb-8 sm:mb-12 grid grid-cols-1 gap-6 sm:gap-8 leading-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <div>
            <h5
              className={clsx(
                "mb-6 sm:mb-8 mt-2 text-center text-base sm:text-lg font-bold md:text-left",
                themeClasses.pageText,
              )}
            >
              Follow Us
            </h5>
            <ul className="mt-6 sm:mt-10 grid justify-items-center gap-3 sm:gap-4 md:justify-items-start">
              {navigation.social.map((item) => (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    target={item.target}
                    className={clsx(
                      "flex max-w-full cursor-pointer items-center gap-2 bg-transparent font-semibold transition-colors",
                      themeClasses.pageText,
                      "hover:text-slate-600 dark:hover:text-slate-300",
                    )}
                  >
                    <item.icon
                      className="h-5 w-5 sm:h-6 sm:w-6"
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h5
              className={clsx(
                "mb-6 sm:mb-8 mt-2 text-center text-base sm:text-lg font-bold md:text-left",
                themeClasses.pageText,
              )}
            >
              Product
            </h5>
            <div className="grid justify-items-center gap-3 sm:gap-4 md:justify-items-start">
              {navigation.product.map((item, index) => (
                <Link
                  key={index}
                  to={item.href}
                  reloadDocument={item.reloadDocument}
                  className={clsx(
                    "cursor-pointer bg-transparent transition-colors",
                    themeClasses.pageTextSecondary,
                    "hover:text-slate-900 dark:hover:text-white",
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <h5
              className={clsx(
                "mb-6 sm:mb-8 mt-2 text-center text-base sm:text-lg font-bold md:text-left",
                themeClasses.pageText,
              )}
            >
              Build
            </h5>
            <div className="grid justify-items-center gap-3 sm:gap-4 md:justify-items-start">
              {navigation.technologies.map((item, index) => (
                <Link
                  key={index}
                  to={item.href}
                  className={clsx(
                    "cursor-pointer bg-transparent transition-colors",
                    themeClasses.pageTextSecondary,
                    "hover:text-slate-900 dark:hover:text-white",
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="hidden lg:block">
            <h5
              className={clsx(
                "mb-6 sm:mb-8 mt-2 text-center text-base sm:text-lg font-bold md:text-left",
                themeClasses.pageText,
              )}
            >
              Legal
            </h5>
            <div className="grid justify-items-center gap-3 sm:gap-4 md:justify-items-start">
              {navigation.legal.map((item, index) => (
                <Link
                  key={index}
                  to={item.href}
                  className={clsx(
                    "cursor-pointer bg-transparent transition-colors",
                    themeClasses.pageTextSecondary,
                    "hover:text-slate-900 dark:hover:text-white",
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 sm:gap-6 md:flex-row md:gap-0 pt-6 sm:pt-8 border-t border-slate-200 dark:border-slate-800">
          <div
            className={clsx(
              "leading-5 text-sm sm:text-base",
              themeClasses.pageTextSecondary,
            )}
          >
            © {new Date().getFullYear()} Editframe
          </div>
          <div
            className={clsx(
              "flex flex-col items-center justify-center rounded-xl py-2 pl-3 pr-2 leading-5 text-sm sm:text-base text-center",
              themeClasses.pageTextSecondary,
            )}
          >
            <div>Making video creation easier for software developers.</div>
          </div>
          <div className="leading-5">
            <a
              href="mailto:team@editframe.com"
              className={clsx(
                "cursor-pointer bg-transparent font-semibold transition-colors",
                themeClasses.pageText,
                "hover:text-slate-600 dark:hover:text-slate-300",
              )}
            >
              Have a question?
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
