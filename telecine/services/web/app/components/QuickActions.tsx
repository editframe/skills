import { GraduationCap, At, List, Code } from "@phosphor-icons/react";
const items = [
  {
    title: "Check out our docs",
    description: "A list of different layers we support in our platform",
    icon: GraduationCap,
    href: "/docs",
  },
  {
    title: "Create an API key",
    description: "Another way to create and render a project",
    icon: List,
    href: "/developers/new",
  },
  {
    title: "Use our CLI",
    description: "Another way to interact with our platform",
    icon: Code,
    href: "https://www.npmjs.com/package/@editframe/cli",
  },
  {
    title: "Contact Us",
    description: "Get in touch with our engineering team ",
    icon: At,
    href: "mailto:team@editframe.com",
  },
];
function QuickActions() {
  return (
    <ul className="mt-6 grid grid-cols-1 gap-6 border-b border-t border-gray-200 py-6 sm:grid-cols-2">
      {items.map((item, itemIdx) => (
        <li key={itemIdx} className="flow-root">
          <div className="relative -m-2 flex items-center space-x-4 rounded-xl p-2 focus-within:ring-2 focus-within:ring-editframe-500 hover:bg-gray-50">
            <div
              className={
                "flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-editframe-900"
              }
            >
              <item.icon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">
                <a href={item.href} className="focus:outline-none">
                  <span className="absolute inset-0" aria-hidden="true" />
                  <span>{item.title}</span>
                  <span aria-hidden="true"> &rarr;</span>
                </a>
              </h3>
              <p className="mt-1 text-sm text-gray-500">{item.description}</p>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

export default QuickActions;
