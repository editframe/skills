/**
 * Reusable theme-aware class strings for consistent styling across the application.
 * These classes follow the theme system patterns from theme-system.mdc.
 */

export const themeClasses = {
  /**
   * Page background colors
   * Light: white, Dark: slate-900
   */
  pageBg: "bg-white dark:bg-slate-900",

  /**
   * Primary text colors
   * Light: slate-900, Dark: white
   */
  pageText: "text-slate-900 dark:text-white",

  /**
   * Secondary text colors
   * Light: slate-600, Dark: slate-300
   */
  pageTextSecondary: "text-slate-600 dark:text-slate-300",

  /**
   * Muted text colors
   * Light: slate-500, Dark: slate-400
   */
  pageTextMuted: "text-slate-500 dark:text-slate-400",

  /**
   * Border colors
   * Light: slate-200, Dark: slate-800
   */
  pageBorder: "border-slate-200 dark:border-slate-800",

  /**
   * Selection colors
   * Light: blue-200 background with black text
   * Dark: blue-800 background with white text
   */
  pageSelection:
    "selection:bg-blue-200 selection:text-black dark:selection:bg-blue-800 dark:selection:text-white",

  /**
   * Link colors
   * Light: blue-600, Dark: blue-400
   */
  link: "text-blue-600 dark:text-blue-400 hover:underline font-medium",

  /**
   * Inline code styling
   */
  inlineCode:
    "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-1.5 py-0.5 font-mono text-sm rounded",

  /**
   * Code block styling
   */
  codeBlock:
    "bg-slate-900 dark:bg-slate-900/50 border-slate-800 rounded-lg shadow-lg",
} as const;

