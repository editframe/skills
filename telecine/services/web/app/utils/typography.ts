/**
 * Centralized typography system with consistent scales, spacing, and utilities.
 * Provides type-safe typography constants and utility functions for use across the application.
 */

/**
 * Typography scale definitions
 */
export const typographyScale = {
  // Font sizes (in rem)
  fontSize: {
    xs: "0.75rem", // 12px
    sm: "0.875rem", // 14px
    base: "1rem", // 16px
    lg: "1.125rem", // 18px
    xl: "1.25rem", // 20px
    "2xl": "1.5rem", // 24px
    "3xl": "2rem", // 32px
    "4xl": "2.5rem", // 40px
    "5xl": "3rem", // 48px
  },
  // Line heights
  lineHeight: {
    tight: "1.1",
    snug: "1.2",
    normal: "1.5",
    relaxed: "1.625",
    loose: "1.75",
  },
  // Font weights
  fontWeight: {
    normal: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
  // Letter spacing
  letterSpacing: {
    tighter: "-0.05em",
    tight: "-0.025em",
    normal: "0",
    wide: "0.025em",
    wider: "0.05em",
  },
} as const;

/**
 * Typography spacing scale (margins between elements)
 */
export const typographySpacing = {
  // Paragraph spacing
  paragraph: {
    bottom: "1.5rem", // 24px
  },
  // Heading spacing
  heading: {
    h1: {
      top: "2rem", // 32px
      bottom: "1rem", // 16px
    },
    h2: {
      top: "2.5rem", // 40px
      bottom: "1rem", // 16px
    },
    h3: {
      top: "2rem", // 32px
      bottom: "0.75rem", // 12px
    },
    h4: {
      top: "1.5rem", // 24px
      bottom: "0.5rem", // 8px
    },
  },
  // List spacing
  list: {
    itemGap: "0.5rem", // 8px
    leftPadding: "1rem", // 16px
  },
} as const;

/**
 * Content width constraints for optimal readability
 */
export const contentWidth = {
  optimal: "65ch", // ~700px - optimal reading width
  max: "75ch", // ~800px - maximum for wider content
  prose: "65ch", // Default prose content width
} as const;

/**
 * Typography element definitions with complete styling
 */
export const typographyElements = {
  body: {
    fontSize: typographyScale.fontSize.base,
    lineHeight: typographyScale.lineHeight.loose,
    fontWeight: typographyScale.fontWeight.normal,
    color: {
      light: "text-slate-700",
      dark: "text-slate-200",
    },
  },
  small: {
    fontSize: typographyScale.fontSize.sm,
    lineHeight: typographyScale.lineHeight.normal,
    fontWeight: typographyScale.fontWeight.normal,
    color: {
      light: "text-slate-600",
      dark: "text-slate-300",
    },
  },
  large: {
    fontSize: typographyScale.fontSize.lg,
    lineHeight: typographyScale.lineHeight.loose,
    fontWeight: typographyScale.fontWeight.normal,
    color: {
      light: "text-slate-700",
      dark: "text-slate-200",
    },
  },
  h1: {
    fontSize: typographyScale.fontSize["4xl"],
    lineHeight: typographyScale.lineHeight.snug,
    fontWeight: typographyScale.fontWeight.bold,
    letterSpacing: typographyScale.letterSpacing.tight,
    marginTop: typographySpacing.heading.h1.top,
    marginBottom: typographySpacing.heading.h1.bottom,
    color: {
      light: "text-slate-900",
      dark: "text-white",
    },
  },
  h2: {
    fontSize: typographyScale.fontSize["3xl"],
    lineHeight: typographyScale.lineHeight.snug,
    fontWeight: typographyScale.fontWeight.semibold,
    letterSpacing: typographyScale.letterSpacing.tight,
    marginTop: typographySpacing.heading.h2.top,
    marginBottom: typographySpacing.heading.h2.bottom,
    color: {
      light: "text-slate-900",
      dark: "text-white",
    },
  },
  h3: {
    fontSize: typographyScale.fontSize["2xl"],
    lineHeight: typographyScale.lineHeight.snug,
    fontWeight: typographyScale.fontWeight.semibold,
    letterSpacing: typographyScale.letterSpacing.tight,
    marginTop: typographySpacing.heading.h3.top,
    marginBottom: typographySpacing.heading.h3.bottom,
    color: {
      light: "text-slate-900",
      dark: "text-slate-100",
    },
  },
  h4: {
    fontSize: typographyScale.fontSize.xl,
    lineHeight: typographyScale.lineHeight.snug,
    fontWeight: typographyScale.fontWeight.semibold,
    letterSpacing: typographyScale.letterSpacing.normal,
    marginTop: typographySpacing.heading.h4.top,
    marginBottom: typographySpacing.heading.h4.bottom,
    color: {
      light: "text-slate-700",
      dark: "text-slate-200",
    },
  },
  lead: {
    fontSize: typographyScale.fontSize.lg,
    lineHeight: typographyScale.lineHeight.loose,
    fontWeight: typographyScale.fontWeight.normal,
    color: {
      light: "text-slate-600",
      dark: "text-slate-400",
    },
  },
} as const;

/**
 * Utility function to generate typography class strings
 */
export function getTypographyClasses(
  element: keyof typeof typographyElements,
  options?: {
    includeColor?: boolean;
    includeSpacing?: boolean;
  }
): string {
  const elementStyles = typographyElements[element];
  const includeColor = options?.includeColor !== false;
  const includeSpacing = options?.includeSpacing !== false;

  const classes: string[] = [];

  // Font size
  if (elementStyles.fontSize) {
    classes.push(`text-[${elementStyles.fontSize}]`);
  }

  // Line height
  if (elementStyles.lineHeight) {
    const lineHeightMap: Record<string, string> = {
      "1.1": "leading-tight",
      "1.2": "leading-snug",
      "1.5": "leading-normal",
      "1.625": "leading-relaxed",
      "1.75": "leading-loose",
    };
    classes.push(lineHeightMap[elementStyles.lineHeight] || `leading-[${elementStyles.lineHeight}]`);
  }

  // Font weight
  if (elementStyles.fontWeight) {
    const weightMap: Record<string, string> = {
      "400": "font-normal",
      "500": "font-medium",
      "600": "font-semibold",
      "700": "font-bold",
    };
    classes.push(weightMap[elementStyles.fontWeight] || `font-[${elementStyles.fontWeight}]`);
  }

  // Letter spacing
  if (elementStyles.letterSpacing) {
    const spacingMap: Record<string, string> = {
      "-0.05em": "tracking-tighter",
      "-0.025em": "tracking-tight",
      "0": "tracking-normal",
      "0.025em": "tracking-wide",
      "0.05em": "tracking-wider",
    };
    classes.push(spacingMap[elementStyles.letterSpacing] || "");
  }

  // Colors (with dark mode)
  if (includeColor && elementStyles.color) {
    classes.push(elementStyles.color.light, `dark:${elementStyles.color.dark}`);
  }

  // Spacing (margins)
  if (includeSpacing) {
    if (elementStyles.marginTop) {
      classes.push(`mt-[${elementStyles.marginTop}]`);
    }
    if (elementStyles.marginBottom) {
      classes.push(`mb-[${elementStyles.marginBottom}]`);
    }
  }

  return classes.filter(Boolean).join(" ");
}

/**
 * Pre-computed class strings for common typography patterns
 */
export const typographyClasses = {
  body: getTypographyClasses("body"),
  small: getTypographyClasses("small"),
  large: getTypographyClasses("large"),
  h1: getTypographyClasses("h1"),
  h2: getTypographyClasses("h2"),
  h3: getTypographyClasses("h3"),
  h4: getTypographyClasses("h4"),
  lead: getTypographyClasses("lead"),
  // Paragraph with spacing
  paragraph: `${getTypographyClasses("body")} mb-6`,
  // Headings without spacing (for custom control)
  h1NoSpacing: getTypographyClasses("h1", { includeSpacing: false }),
  h2NoSpacing: getTypographyClasses("h2", { includeSpacing: false }),
  h3NoSpacing: getTypographyClasses("h3", { includeSpacing: false }),
  h4NoSpacing: getTypographyClasses("h4", { includeSpacing: false }),
} as const;





