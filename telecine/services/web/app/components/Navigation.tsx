import { useLocation } from "react-router";
import { WebhookIcon } from "./icons/WebhookIcon";
import {
  Cog8ToothIcon,
  CloudIcon,
  FilmIcon,
  KeyIcon,
  VideoCameraIcon,
  UsersIcon,
  UserPlusIcon,
  MicrophoneIcon,
  PhotoIcon,
  UserIcon,
  BuildingOfficeIcon,
  DocumentTextIcon,
  CpuChipIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import { NavLink } from "./Link";
import clsx from "clsx";

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
            "flex items-center gap-2 p-1 rounded text-xs font-light group",
            "hover:bg-gray-200 hover:shadow-sm",
            isActive && "bg-gray-300 font-medium text-gray-900 shadow-sm",
          )
        }
      >
        <Icon
          className={clsx(
            "size-6",
            isActive
              ? "text-gray-400 fill-white"
              : "text-gray-400 fill-gray-300 group-hover:text-gray-400 ",
          )}
        />
        {children}
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
        to: "/resource/isobmff_files",
        Icon: VideoCameraIcon,
        label: "Videos",
      },
      { to: "/resource/image_files", Icon: PhotoIcon, label: "Images" },
      {
        to: "/resource/unprocessed_files",
        Icon: CloudIcon,
        label: "Unprocessed Files",
      },
    ],
  },
  {
    title: "Workers",
    items: [
      { to: "/resource/renders", Icon: FilmIcon, label: "Renders" },
      {
        to: "/resource/transcriptions",
        Icon: MicrophoneIcon,
        label: "Transcriptions",
      },
      {
        to: "/resource/process_isobmff",
        Icon: VideoCameraIcon,
        label: "Process ISOBMFF",
      },
      {
        to: "/resource/process_html",
        Icon: DocumentTextIcon,
        label: "Process HTML",
      },
    ],
  },
  {
    title: "API",
    items: [
      { to: "/resource/api_keys", Icon: KeyIcon, label: "API Keys" },
      { to: "/resource/webhooks", Icon: WebhookIcon, label: "Webhooks" },
    ],
  },
  {
    title: "Organization",
    items: [
      { to: "/org/settings", Icon: Cog8ToothIcon, label: "Settings" },
      {
        to: "/resource/members",
        Icon: UsersIcon,
        label: "Members",
      },
      {
        to: "/resource/invites",
        Icon: UserPlusIcon,
        label: "Invites",
      },
    ],
  },
];

const adminNavGroups: NavGroup[] = [
  {
    title: "Accounts",
    items: [
      { to: "/admin/users", Icon: UserIcon, label: "Users" },
      { to: "/admin/orgs", Icon: BuildingOfficeIcon, label: "Orgs" },
      { to: "/admin/invites", Icon: UserPlusIcon, label: "Invites" },
      { to: "/admin/create-user", Icon: UserPlusIcon, label: "Create User" },
    ],
  },
  {
    title: "Media",
    items: [
      { to: "/admin/isobmff_files", Icon: VideoCameraIcon, label: "Videos" },
      { to: "/admin/image_files", Icon: PhotoIcon, label: "Images" },
    ],
  },
  {
    title: "Workers",
    items: [
      {
        to: "/admin/unprocessed_files",
        Icon: CloudIcon,
        label: "Unprocessed Files",
      },
      { to: "/admin/renders", Icon: FilmIcon, label: "Renders" },
      {
        to: "/admin/transcriptions",
        Icon: MicrophoneIcon,
        label: "Transcriptions",
      },
      {
        to: "/admin/process_isobmff",
        Icon: VideoCameraIcon,
        label: "Process ISOBMFF",
      },
    ],
  },
  {
    title: "Schedulers",
    items: [
      { to: "/admin/scheduler", Icon: CpuChipIcon, label: "Overview" },
      {
        to: "/admin/schedulers/process-html",
        Icon: DocumentTextIcon,
        label: "Process HTML",
      },
      {
        to: "/admin/schedulers/process-isobmff",
        Icon: VideoCameraIcon,
        label: "Process ISOBMFF",
      },
      { to: "/admin/schedulers/render", Icon: FilmIcon, label: "Render" },
    ],
  },
  {
    title: "API",
    items: [
      { to: "/admin/api_keys", Icon: KeyIcon, label: "API Keys" },
      { to: "/admin/webhooks", Icon: WebhookIcon, label: "Webhooks" },
      { to: "/admin/api-traffic", Icon: ChartBarIcon, label: "API Traffic" },
    ],
  },
  {
    title: "Operations",
    items: [
      { to: "/admin/reprocess-html", Icon: DocumentTextIcon, label: "Reprocess HTML" },
    ]
  }
];

interface NavigationProps {
  navGroups: NavGroup[];
  className?: string;
}

export const UserNavigation = ({ className }: { className?: string }) => {
  return <Navigation navGroups={userNavGroups} className={className} />;
};

export const AdminNavigation = ({ className }: { className?: string }) => {
  return <Navigation navGroups={adminNavGroups} className={className} />;
};

export const Navigation = ({ navGroups, className = "" }: NavigationProps) => {
  return (
    <nav className={clsx("w-48 h-full overflow-y-auto", className)}>
      <ul className="p-2 space-y-6">
        {navGroups.map((group) => (
          <li key={group.title} className="space-y-1">
            <h3 className="text-xs font-medium text-gray-500 px-1">
              {group.title}
            </h3>
            <ul className="space-y-1">
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
  );
};
