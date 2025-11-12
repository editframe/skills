import type { FC } from "react";
import "~/styles/docs.css";
import type { DocsMenuItem } from "~/utils/fs.server";
import { NavLink } from "react-router";
import clsx from "clsx";
import {
  Code,
  FileText,
  Gear,
  Link,
  Rocket,
  GraduationCap,
  Terminal,
  Brain,
  Image as ImageIcon,
  VideoCamera,
  Sparkle,
  Cube,
  Stack,
  Key,
  WebhooksLogo,
  Play,
  ArrowClockwise,
  FastForward,
  WaveSine,
  Clock,
  FilmReel,
  FilmStrip,
  Microphone,
  SquaresFour,
  SpeakerHigh,
  Cpu,
  CloudArrowUp,
  Translate,
  PlayCircle,
  Sliders,
  Eye,
  ProjectorScreen,
  PuzzlePiece,
} from "@phosphor-icons/react";

// Icon mapping based on title keywords - more specific matching
const getIconForTitle = (title: string, href?: string): React.ElementType => {
  const lowerTitle = title.toLowerCase();
  const lowerHref = href?.toLowerCase() || "";
  
  // Getting Started section
  if (lowerTitle.includes("getting started") || lowerTitle === "getting started") {
    return Rocket;
  }
  if (lowerTitle.includes("authentication") || lowerTitle.includes("auth") || lowerHref.includes("authentication")) {
    return Key;
  }
  if (lowerTitle.includes("packages") || lowerHref.includes("packages")) {
    return Cube;
  }
  if (lowerTitle.includes("webhook") || lowerHref.includes("webhook")) {
    return WebhooksLogo;
  }
  if (lowerTitle.includes("main idea") || lowerHref.includes("main-idea")) {
    return Brain;
  }
  if (lowerTitle.includes("temporal") || lowerHref.includes("temporal")) {
    return Clock;
  }
  
  // Elements section
  if (lowerTitle === "elements" || lowerHref.includes("/elements") && !lowerHref.includes("/elements/")) {
    return PuzzlePiece;
  }
  if (lowerTitle.includes("timegroup") || lowerHref.includes("timegroup")) {
    return SquaresFour;
  }
  if (lowerTitle.includes("audio") && !lowerTitle.includes("video") || lowerHref.includes("/audio") && !lowerHref.includes("video")) {
    return SpeakerHigh;
  }
  if (lowerTitle.includes("video") || lowerHref.includes("/video")) {
    return VideoCamera;
  }
  if (lowerTitle.includes("thumbnail") || lowerHref.includes("thumbnail")) {
    return FilmStrip;
  }
  if (lowerTitle.includes("caption") || lowerHref.includes("caption")) {
    return Translate;
  }
  if (lowerTitle.includes("image") || lowerHref.includes("/image")) {
    return ImageIcon;
  }
  if (lowerTitle.includes("surface") || lowerHref.includes("surface")) {
    return ProjectorScreen;
  }
  if (lowerTitle.includes("waveform") || lowerHref.includes("waveform")) {
    return WaveSine;
  }
  if (lowerTitle.includes("example") || lowerHref.includes("example")) {
    return Sparkle;
  }
  
  // Rendering section
  if (lowerTitle.includes("rendering") || lowerHref.includes("rendering")) {
    return FilmReel;
  }
  if (lowerTitle.includes("api") && (lowerTitle.includes("rendering") || lowerHref.includes("rendering"))) {
    return Terminal;
  }
  
  // React section
  if (lowerTitle === "react" || lowerHref.includes("/react") && !lowerHref.includes("/react/")) {
    return Code;
  }
  if (lowerTitle.includes("component") || lowerHref.includes("component")) {
    return PuzzlePiece;
  }
  if (lowerTitle.includes("hook") || lowerHref.includes("hook")) {
    return Code;
  }
  
  // Controls section
  if (lowerTitle === "controls" || lowerHref.includes("/controls") && !lowerHref.includes("/controls/")) {
    return Sliders;
  }
  if (lowerTitle.includes("toggle") && lowerTitle.includes("play") || lowerHref.includes("toggle-play")) {
    return Play;
  }
  if (lowerTitle.includes("toggle") && lowerTitle.includes("loop") || lowerHref.includes("toggle-loop")) {
    return ArrowClockwise;
  }
  if (lowerTitle.includes("scrubber") || lowerHref.includes("scrubber")) {
    return FastForward;
  }
  if (lowerTitle.includes("time display") || lowerHref.includes("time-display")) {
    return Clock;
  }
  
  // Resources section
  if (lowerTitle === "resources" || lowerHref.includes("/resources") && !lowerHref.includes("/resources/")) {
    return Stack;
  }
  if (lowerTitle.includes("image file") || lowerHref.includes("image-file")) {
    return ImageIcon;
  }
  if (lowerTitle.includes("unprocessed") || lowerHref.includes("unprocessed")) {
    return CloudArrowUp;
  }
  if (lowerTitle.includes("process") || lowerHref.includes("process")) {
    return Cpu;
  }
  if (lowerTitle.includes("isobmff") || lowerHref.includes("isobmff")) {
    return FilmReel;
  }
  if (lowerTitle.includes("transcription") || lowerHref.includes("transcription")) {
    return Microphone;
  }
  if (lowerTitle.includes("render") && !lowerTitle.includes("rendering") || (lowerHref.includes("render") && !lowerHref.includes("rendering"))) {
    return FilmReel;
  }
  if (lowerTitle.includes("url token") || lowerHref.includes("url-token")) {
    return Key;
  }
  
  // Editor UI section
  if (lowerTitle.includes("editor") || lowerHref.includes("editor-ui")) {
    return Eye;
  }
  if (lowerTitle.includes("preview") || lowerHref.includes("preview")) {
    return PlayCircle;
  }
  if (lowerTitle.includes("configuration") || lowerTitle.includes("config") || lowerHref.includes("configuration")) {
    return Gear;
  }
  
  // Processing Files section
  if (lowerTitle.includes("processing") || lowerHref.includes("processing")) {
    return Cpu;
  }
  if (lowerTitle.includes("audio") && lowerTitle.includes("video") || lowerHref.includes("audio-video")) {
    return VideoCamera;
  }
  
  // Fallback for common patterns
  if (lowerTitle.includes("api") || lowerTitle.includes("endpoint")) {
    return Terminal;
  }
  if (lowerTitle.includes("introduction") || lowerTitle.includes("intro")) {
    return GraduationCap;
  }
  if (lowerTitle.includes("markdown") || lowerTitle.includes("syntax")) {
    return FileText;
  }
  if (lowerTitle.includes("code") || lowerTitle.includes("block")) {
    return Code;
  }
  if (lowerTitle.includes("setting") || lowerTitle.includes("config")) {
    return Gear;
  }
  if (lowerTitle.includes("navigation") || lowerTitle.includes("menu")) {
    return Link;
  }
  if (lowerTitle.includes("snippet") || lowerTitle.includes("reusable")) {
    return Sparkle;
  }
  
  // Default icon
  return FileText;
};

export const Menu: FC<{ menu: DocsMenuItem[]; className?: string }> = ({
  menu,
  className,
}) => {
  const navigation = menu.map((category) => {
    const menuCategoryType = category.hasContent
      ? category.children.length > 0
        ? "linkAndDetails"
        : "link"
      : "details";
    if (menuCategoryType === "linkAndDetails") {
      return {
        title: category.attrs.title,
        slug: category.slug,
        links: category.children.map((child) => ({
          title: child.attrs.title,
          href: child.slug,
        })),
      };
    }
    if (menuCategoryType === "details") {
      // When hasContent is false (no index.mdx), show children without a parent link
      return {
        title: category.attrs.title,
        slug: category.slug,
        links: category.children.map((child) => ({
          title: child.attrs.title,
          href: child.slug,
        })),
      };
    }
    return {
      title: category.attrs.title,
      slug: category.slug,
      links: [],
    };
  });

  return menu ? (
    <nav className={clsx("text-xs", className)}>
      <ul className="space-y-3">
        {navigation.map((section) => {
          const SectionIcon = getIconForTitle(section.title || "");
          return (
            <li key={section?.title}>
              {section?.slug && (
                <NavLink
                  to={section.slug as string}
                  className={({ isActive }) =>
                    clsx(
                      "sticky top-0 z-10 flex items-center gap-2 px-2 py-1 rounded-md text-xs font-semibold transition-all",
                      isActive
                        ? "text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800"
                        : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50 bg-white dark:bg-gray-900",
                    )
                  }
                >
                  <SectionIcon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span>{section.title}</span>
                </NavLink>
              )}
              <ul className="mt-2 space-y-0.5 border-l border-slate-200 dark:border-slate-800 pl-3">
                {section?.links.map((link) => {
                  const LinkIcon = getIconForTitle(link.title, link.href);
                  return (
                    <li key={link.href}>
                      <NavLink
                        to={link.href as string}
                        className={({ isActive }) =>
                          clsx(
                            "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer w-full text-xs leading-5 transition-all",
                            isActive
                              ? "font-medium text-slate-900 bg-slate-100 dark:text-slate-100 dark:bg-slate-800"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/50",
                          )
                        }
                      >
                        <LinkIcon className="h-3.5 w-3.5 flex-shrink-0" />
                        <span>{link.title}</span>
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ul>
    </nav>
  ) : (
    <div className="bold text-gray-300">Failed to load menu</div>
  );
};
