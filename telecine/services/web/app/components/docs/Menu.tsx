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
  
  // Section type icons (check before element types)
  if (lowerTitle === "tutorial" || lowerHref.includes("/tutorial")) {
    return GraduationCap;
  }
  if (lowerTitle.includes("how-to") || lowerTitle.includes("how to") || lowerHref.includes("/how-to")) {
    return FileText;
  }
  if (lowerTitle === "concepts" || lowerTitle === "concept" || lowerHref.includes("/explanation") || lowerHref.includes("/concept")) {
    return Brain;
  }
  if (lowerTitle === "reference" || lowerHref.includes("/reference")) {
    return FileText;
  }
  
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

/** Renders a group label (non-clickable visual separator) */
const GroupLabel: FC<{ title: string; level: number }> = ({ title, level }) => {
  const ItemIcon = getIconForTitle(title);
  const indentLevel = level * 12;
  
  return (
    <li>
      <div
        className={clsx(
          "flex items-center px-3 py-2 mt-4 first:mt-0 text-xs leading-5 gap-2",
          "font-bold text-[var(--ink-black)] dark:text-white uppercase tracking-wider"
        )}
        style={level > 0 ? { paddingLeft: `${indentLevel}px` } : undefined}
      >
        <ItemIcon className="h-3.5 w-3.5 flex-shrink-0 text-[var(--accent-blue)]" />
        <span className="truncate text-[10px]">{title}</span>
      </div>
    </li>
  );
};

const MenuItem: FC<{ 
  item: DocsMenuItem; 
  level?: number;
  expandedItems?: Set<string>;
  collapsedItems?: Set<string>;
  onToggle?: (slug: string) => void;
  isActivePath?: boolean;
}> = ({ item, level = 0, expandedItems = new Set(), collapsedItems = new Set(), onToggle, isActivePath = false }) => {
  const location = useLocation();
  
  // Group labels are rendered differently - just a visual separator
  if (item.isGroupLabel) {
    return <GroupLabel title={item.attrs.title} level={level} />;
  }
  
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
  
  // Check if manually collapsed
  const isManuallyCollapsed = collapsedItems.has(item.slug || "");
  
  // Expand if:
  // 1. Manually expanded (takes precedence)
  // 2. OR in active path (need to show active page, even if manually collapsed)
  // 3. OR (not manually collapsed AND has active child - for auto-expansion)
  const shouldBeExpanded = isManuallyExpanded || isActivePath || (!isManuallyCollapsed && hasChildren && (isActive || hasActiveChild(item.children)));

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
              "flex-shrink-0 p-0.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors",
              "text-[var(--warm-gray)]"
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
                "flex items-center px-3 py-1.5 cursor-pointer w-full text-xs leading-5 transition-all flex-1 border-l-2",
                level <= 2 ? "gap-2" : "gap-0",
                level === 0
                  ? "font-bold"
                  : "font-medium",
                isActive
                  ? "text-[var(--ink-black)] dark:text-white border-[var(--accent-blue)] bg-[var(--accent-blue)]/5"
                  : "text-[var(--warm-gray)] hover:text-[var(--ink-black)] dark:hover:text-white border-transparent hover:border-[var(--ink-black)]/20 dark:hover:border-white/20",
              )
            }
            style={level > 0 ? { paddingLeft: `${indentLevel}px` } : undefined}
          >
            {level <= 2 && <ItemIcon className="h-3.5 w-3.5 flex-shrink-0" />}
            <span className="truncate">{item.attrs.title}</span>
          </NavLink>
        ) : (
          <div
            className={clsx(
              "flex items-center px-3 py-1.5 text-xs leading-5 flex-1 border-l-2 border-transparent",
              level <= 2 ? "gap-2" : "gap-0",
              level === 0 ? "font-bold text-[var(--ink-black)] dark:text-white" : "font-medium text-[var(--warm-gray)]"
            )}
            style={level > 0 ? { paddingLeft: `${indentLevel}px` } : undefined}
          >
            {level <= 2 && <ItemIcon className="h-3.5 w-3.5 flex-shrink-0" />}
            <span className="truncate">{item.attrs.title}</span>
          </div>
        )}
      </div>
      {hasChildren && shouldBeExpanded && (
        <ul className={clsx(
          "mt-0.5 space-y-0.5 ml-4",
          level === 0 ? "border-l-2 border-[var(--ink-black)]/10 dark:border-white/10 pl-2" : ""
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
                collapsedItems={collapsedItems}
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
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set());

  // Auto-expand sections that contain the active page, but respect manually collapsed items
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
      // Auto-expand all parents of the active page (even if manually collapsed)
      // This ensures the active page is visible, but manual collapse state is preserved
      // so if user navigates away, it will collapse again
      setExpandedItems((prev) => {
        const next = new Set(prev);
        parentsToExpand.forEach((slug) => next.add(slug));
        return next;
      });
    }
  }, [location.pathname, menu]);

  const handleToggle = (slug: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      const isCurrentlyExpanded = next.has(slug);
      
      if (isCurrentlyExpanded) {
        // Collapsing: remove from expanded, add to collapsed
        next.delete(slug);
        setCollapsedItems((prevCollapsed) => {
          const nextCollapsed = new Set(prevCollapsed);
          nextCollapsed.add(slug);
          return nextCollapsed;
        });
      } else {
        // Expanding: add to expanded, remove from collapsed
        next.add(slug);
        setCollapsedItems((prevCollapsed) => {
          const nextCollapsed = new Set(prevCollapsed);
          nextCollapsed.delete(slug);
          return nextCollapsed;
        });
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
              collapsedItems={collapsedItems}
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
