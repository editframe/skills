import { useLocation } from "react-router";
import {
  Gear,
  FilmReel,
  Key,
  VideoCamera,
  Users,
  UserPlus,
  Microphone,
  User,
  Building,
  FileText,
  Cpu,
  ChartBar,
  ChartLine,
  WebhooksLogo,
  File,
  Image,
  ClosedCaptioning,
} from "@phosphor-icons/react";
import { NavLink } from "./Link";
import clsx from "clsx";
import { useState, useEffect } from "react";
import { useTheme } from "~/hooks/useTheme";

interface SidebarItemProps {
  to: string;
  children: React.ReactNode;
  Icon: React.ElementType;
}

const SidebarItem = ({ to, children, Icon }: SidebarItemProps) => {
  const location = useLocation();
  const isActive = location.pathname.startsWith(to);
  return (
    <li>
      <NavLink
        to={to}
        className={({ isActive }) =>
          clsx(
            "flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-xs transition-all duration-150 group",
            "text-slate-700 dark:text-slate-300",
            "hover:bg-slate-100/80 dark:hover:bg-slate-800/50",
            "hover:text-slate-900 dark:hover:text-slate-100",
            isActive && [
              "bg-blue-100 dark:bg-blue-950/75 relative",
              "text-slate-900 dark:text-white",
              "font-medium",
              "shadow-sm dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.3)]",
              "before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-200/30 before:via-blue-100/10 before:to-blue-100/5",
              "dark:before:from-blue-900/25 dark:before:via-blue-950/10 dark:before:to-blue-950/5",
              "before:pointer-events-none before:rounded-md",
            ],
          )
        }
      >
        <Icon
          className={clsx(
            "h-4 w-4 flex-shrink-0 transition-colors",
            isActive
              ? "text-slate-900 dark:text-white"
              : "text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-300",
          )}
          weight={isActive ? "fill" : "regular"}
        />
        <span className="leading-snug">{children}</span>
      </NavLink>
    </li>
  );
};

interface NavGroup {
  title: string;
  items: Array<
    | {
        to: string;
        label: string;
        Icon: React.ElementType;
      }
    | false
  >;
}

const userNavGroups: NavGroup[] = [
  {
    title: "Media",
    items: [
      {
        to: "/resource/files",
        Icon: File,
        label: "All Files",
      },
      {
        to: "/resource/videos",
        Icon: VideoCamera,
        label: "Videos",
      },
      {
        to: "/resource/images",
        Icon: Image,
        label: "Images",
      },
      {
        to: "/resource/captions",
        Icon: ClosedCaptioning,
        label: "Captions",
      },
    ],
  },
  {
    title: "Workers",
    items: [
      { to: "/resource/renders", Icon: FilmReel, label: "Renders" },
      {
        to: "/resource/transcriptions",
        Icon: Microphone,
        label: "Transcriptions",
      },
      {
        to: "/resource/process_isobmff",
        Icon: VideoCamera,
        label: "Process ISOBMFF",
      },
      {
        to: "/resource/process_html",
        Icon: FileText,
        label: "Process HTML",
      },
    ],
  },
  {
    title: "API",
    items: [
      { to: "/resource/api_keys", Icon: Key, label: "API Keys" },
      { to: "/resource/webhooks", Icon: WebhooksLogo, label: "Webhooks" },
    ],
  },
  {
    title: "Organization",
    items: [
      { to: "/org/settings", Icon: Gear, label: "Settings" },
      {
        to: "/resource/members",
        Icon: Users,
        label: "Members",
      },
      {
        to: "/resource/invites",
        Icon: UserPlus,
        label: "Invites",
      },
    ],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    title: "Accounts",
    items: [
      { to: "/admin/users", Icon: User, label: "Users" },
      { to: "/admin/orgs", Icon: Building, label: "Orgs" },
      { to: "/admin/invites", Icon: UserPlus, label: "Invites" },
      { to: "/admin/create-user", Icon: UserPlus, label: "Create User" },
    ],
  },
  {
    title: "Media",
    items: [{ to: "/admin/files", Icon: File, label: "Files" }],
  },
  {
    title: "Workers",
    items: [{ to: "/admin/scheduler", Icon: Cpu, label: "Overview" }],
  },
  {
    title: "API",
    items: [
      { to: "/admin/api_keys", Icon: Key, label: "API Keys" },
      { to: "/admin/webhooks", Icon: WebhooksLogo, label: "Webhooks" },
      { to: "/admin/api-traffic", Icon: ChartBar, label: "API Traffic" },
      { to: "/admin/telemetry", Icon: ChartLine, label: "Telemetry" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/admin/reprocess-html", Icon: FileText, label: "Reprocess HTML" },
    ],
  },
];

interface NavigationProps {
  navGroups: NavGroup[];
  className?: string;
}

export const UserNavigation = ({
  className,
  isMobileOpen,
  setIsMobileOpen,
}: {
  className?: string;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}) => {
  return (
    <Navigation
      navGroups={userNavGroups}
      className={className}
      isMobileOpen={isMobileOpen}
      setIsMobileOpen={setIsMobileOpen}
    />
  );
};

export const AdminNavigation = ({
  className,
  isMobileOpen,
  setIsMobileOpen,
}: {
  className?: string;
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}) => {
  return (
    <Navigation
      navGroups={adminNavGroups}
      className={className}
      isMobileOpen={isMobileOpen}
      setIsMobileOpen={setIsMobileOpen}
    />
  );
};

export const Navigation = ({
  navGroups,
  className = "",
  isMobileOpen,
  setIsMobileOpen,
}: NavigationProps & {
  isMobileOpen?: boolean;
  setIsMobileOpen?: (open: boolean) => void;
}) => {
  useTheme();
  const [internalMobileOpen, setInternalMobileOpen] = useState(false);
  const mobileOpen = isMobileOpen ?? internalMobileOpen;
  const setMobileOpen = setIsMobileOpen ?? setInternalMobileOpen;

  useEffect(() => {
    if (!mobileOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen, setMobileOpen]);

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Navigation sidebar */}
      <nav
        className={clsx(
          "fixed lg:static inset-y-0 left-0 z-50 lg:z-auto h-full overflow-y-auto transition-transform duration-300 ease-in-out lg:relative",
          "w-48 backdrop-blur-sm",
          "bg-white/95 dark:bg-slate-900/95",
          "border-r border-slate-300/75 dark:border-slate-700/75",
          "shadow-[0_1px_2px_0_rgb(0_0_0_/_0.08)] dark:shadow-[0_1px_2px_0_rgb(0_0_0_/_0.4)]",
          "before:absolute before:inset-0 before:bg-gradient-to-br before:from-blue-50/18 before:via-transparent before:to-transparent",
          "dark:before:from-blue-950/15 before:via-transparent dark:before:to-transparent",
          "before:pointer-events-none",
          className,
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <ul className="px-2.5 py-3 space-y-5">
          {navGroups.map((group) => (
            <li key={group.title} className="space-y-1">
              <h3
                className={clsx(
                  "text-[10px] font-semibold uppercase tracking-widest px-2.5 py-1.5 transition-colors",
                  "text-slate-500 dark:text-slate-400",
                )}
              >
                {group.title}
              </h3>
              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  if (item === false) {
                    return null;
                  }
                  return (
                    <SidebarItem key={item.to} to={item.to} Icon={item.Icon}>
                      {item.label}
                    </SidebarItem>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
