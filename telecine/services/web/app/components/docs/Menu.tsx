import type { FC } from "react";
import { useState, useEffect } from "react";
import "~/styles/docs.css";
import type { DocsMenuItem } from "~/utils/fs.server";
import { NavLink, useLocation } from "react-router";
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
  CaretRight,
  CaretDown,
} from "@phosphor-icons/react";

// Icon mapping based on title keywords - more specific matching
const getIconForTitle = (title: string, href?: string): React.ElementType => {
  const lowerTitle = title.toLowerCase();
  const lowerHref = href?.toLowerCase() || "";

  // Getting Started section
  if (
    lowerTitle.includes("getting started") ||
    lowerTitle === "getting started"
  ) {
    return Rocket;
  }
  if (
    lowerTitle.includes("authentication") ||
    lowerTitle.includes("auth") ||
    lowerHref.includes("authentication")
  ) {
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
  if (
    lowerTitle === "elements" ||
    (lowerHref.includes("/elements") && !lowerHref.includes("/elements/"))
  ) {
    return PuzzlePiece;
  }
  if (lowerTitle.includes("timegroup") || lowerHref.includes("timegroup")) {
    return SquaresFour;
  }
  if (
    (lowerTitle.includes("audio") && !lowerTitle.includes("video")) ||
    (lowerHref.includes("/audio") && !lowerHref.includes("video"))
  ) {
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
  if (
    lowerTitle.includes("api") &&
    (lowerTitle.includes("rendering") || lowerHref.includes("rendering"))
  ) {
    return Terminal;
  }

  // React section
  if (
    lowerTitle === "react" ||
    (lowerHref.includes("/react") && !lowerHref.includes("/react/"))
  ) {
    return Code;
  }
  if (lowerTitle.includes("component") || lowerHref.includes("component")) {
    return PuzzlePiece;
  }
  if (lowerTitle.includes("hook") || lowerHref.includes("hook")) {
    return Code;
  }

  // Controls section
  if (
    lowerTitle === "controls" ||
    (lowerHref.includes("/controls") && !lowerHref.includes("/controls/"))
  ) {
    return Sliders;
  }
  if (
    (lowerTitle.includes("toggle") && lowerTitle.includes("play")) ||
    lowerHref.includes("toggle-play")
  ) {
    return Play;
  }
  if (
    (lowerTitle.includes("toggle") && lowerTitle.includes("loop")) ||
    lowerHref.includes("toggle-loop")
  ) {
    return ArrowClockwise;
  }
  if (lowerTitle.includes("scrubber") || lowerHref.includes("scrubber")) {
    return FastForward;
  }
  if (
    lowerTitle.includes("time display") ||
    lowerHref.includes("time-display")
  ) {
    return Clock;
  }

  // Resources section
  if (
    lowerTitle === "resources" ||
    (lowerHref.includes("/resources") && !lowerHref.includes("/resources/"))
  ) {
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
  if (
    lowerTitle.includes("transcription") ||
    lowerHref.includes("transcription")
  ) {
    return Microphone;
  }
  if (
    (lowerTitle.includes("render") && !lowerTitle.includes("rendering")) ||
    (lowerHref.includes("render") && !lowerHref.includes("rendering"))
  ) {
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
  if (
    lowerTitle.includes("configuration") ||
    lowerTitle.includes("config") ||
    lowerHref.includes("configuration")
  ) {
    return Gear;
  }

  // Processing Files section
  if (lowerTitle.includes("processing") || lowerHref.includes("processing")) {
    return Cpu;
  }
  if (
    (lowerTitle.includes("audio") && lowerTitle.includes("video")) ||
    lowerHref.includes("audio-video")
  ) {
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

const MenuItem: FC<{ 
  item: DocsMenuItem; 
  level?: number;
  expandedItems?: Set<string>;
  onToggle?: (slug: string) => void;
  isActivePath?: boolean;
}> = ({ item, level = 0, expandedItems = new Set(), onToggle, isActivePath = false }) => {
  const location = useLocation();
  const hasChildren = item.children.length > 0;
  const ItemIcon = getIconForTitle(item.attrs.title, item.slug);
  const isManuallyExpanded = expandedItems.has(item.slug || "");
  const indentLevel = level * 12; // 12px per level for better visual hierarchy
  
  // Check if this item is active
  const isActive = item.slug === location.pathname;
  
  // Check if any child is active (recursively)
  const hasActiveChild = (children: DocsMenuItem[]): boolean => {
    return children.some((child) => {
      if (child.slug === location.pathname) return true;
      return child.children.length > 0 && hasActiveChild(child.children);
    });
  };
  
  // Auto-expand if manually expanded, or if this item or any child is active
  const shouldBeExpanded = isManuallyExpanded || isActivePath || (hasChildren && (isActive || hasActiveChild(item.children)));

  const handleToggle = (e: React.MouseEvent) => {
    if (hasChildren && item.slug) {
      e.preventDefault();
      e.stopPropagation();
      onToggle?.(item.slug);
    }
  };

  return (
    <li>
      <div className="flex items-center">
        {hasChildren && (
          <button
            onClick={handleToggle}
            className={clsx(
              "flex-shrink-0 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
              "text-slate-400 dark:text-slate-500"
            )}
            aria-label={shouldBeExpanded ? "Collapse" : "Expand"}
          >
            {shouldBeExpanded ? (
              <CaretDown className="h-3 w-3" />
            ) : (
              <CaretRight className="h-3 w-3" />
            )}
          </button>
        )}
        {!hasChildren && <div className="w-4" />}
        {item.slug ? (
          <NavLink
            to={item.slug}
            className={({ isActive }) =>
              clsx(
                "flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer w-full text-xs leading-5 transition-all flex-1",
                level === 0
                  ? "font-semibold"
                  : "font-normal",
                isActive
                  ? level === 0
                    ? "text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-800"
                    : "font-medium text-slate-900 bg-slate-100 dark:text-slate-100 dark:bg-slate-800"
                  : level === 0
                    ? "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/50",
              )
            }
            style={level > 0 ? { paddingLeft: `${indentLevel}px` } : undefined}
          >
            <ItemIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{item.attrs.title}</span>
          </NavLink>
        ) : (
          <div
            className={clsx(
              "flex items-center gap-2 px-2 py-1 rounded-md text-xs leading-5 flex-1",
              level === 0 ? "font-semibold text-slate-700 dark:text-slate-300" : "font-normal text-slate-600 dark:text-slate-400"
            )}
            style={level > 0 ? { paddingLeft: `${indentLevel}px` } : undefined}
          >
            <ItemIcon className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">{item.attrs.title}</span>
          </div>
        )}
      </div>
      {hasChildren && shouldBeExpanded && (
        <ul className={clsx(
          "mt-0.5 space-y-0.5 ml-4",
          level === 0 ? "border-l border-slate-200 dark:border-slate-800 pl-3" : ""
        )}>
          {item.children.map((child) => {
            // Check if this child or any descendant is active
            const checkIfActive = (item: DocsMenuItem): boolean => {
              if (item.slug === location.pathname) return true;
              return item.children.some(checkIfActive);
            };
            const childIsInActivePath = checkIfActive(child);
            
            return (
              <MenuItem 
                key={child.slug || child.attrs.title} 
                item={child} 
                level={level + 1}
                expandedItems={expandedItems}
                onToggle={onToggle}
                isActivePath={childIsInActivePath}
              />
            );
          })}
        </ul>
      )}
    </li>
  );
};

export const Menu: FC<{ menu: DocsMenuItem[]; className?: string }> = ({
  menu,
  className,
}) => {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Auto-expand sections that contain the active page
  useEffect(() => {
    const findAndExpandParents = (
      items: DocsMenuItem[],
      targetPath: string,
      parents: string[] = []
    ): string[] | null => {
      for (const item of items) {
        if (item.slug === targetPath) {
          // Found the target, return all parents
          return parents;
        }
        if (item.children.length > 0) {
          const found = findAndExpandParents(
            item.children,
            targetPath,
            item.slug ? [...parents, item.slug] : parents
          );
          if (found !== null) {
            return found;
          }
        }
      }
      return null;
    };

    const parentsToExpand = findAndExpandParents(menu, location.pathname);
    if (parentsToExpand) {
      setExpandedItems(new Set(parentsToExpand));
    }
  }, [location.pathname, menu]);

  const handleToggle = (slug: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  // Helper to check if item or any child is active
  const isItemActive = (item: DocsMenuItem): boolean => {
    if (item.slug === location.pathname) return true;
    return item.children.some((child) => isItemActive(child));
  };

  return menu ? (
    <nav className={clsx("text-xs", className)}>
      <ul className="space-y-1">
        {menu.map((category) => {
          const isActive = isItemActive(category);
          return (
            <MenuItem 
              key={category.slug || category.attrs.title} 
              item={category} 
              level={0}
              expandedItems={expandedItems}
              onToggle={handleToggle}
              isActivePath={isActive}
            />
          );
        })}
      </ul>
    </nav>
  ) : (
    <div className="bold text-gray-300">Failed to load menu</div>
  );
};
