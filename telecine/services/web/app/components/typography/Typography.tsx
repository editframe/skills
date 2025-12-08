import type { ReactNode } from "react";
import clsx from "clsx";
import { typographyClasses, getTypographyClasses } from "~/utils/typography";

type TypographyVariant = "body" | "small" | "large" | "h1" | "h2" | "h3" | "h4" | "lead" | "paragraph";

interface TypographyProps {
  /**
   * Typography variant that determines size, weight, and spacing
   */
  variant?: TypographyVariant;
  /**
   * HTML element to render (defaults to appropriate element for variant)
   */
  as?: keyof JSX.IntrinsicElements;
  /**
   * Additional CSS classes
   */
  className?: string;
  /**
   * Child content
   */
  children: ReactNode;
  /**
   * Whether to include color classes (default: true)
   */
  includeColor?: boolean;
  /**
   * Whether to include spacing classes (default: true)
   */
  includeSpacing?: boolean;
}

const defaultElements: Record<TypographyVariant, keyof JSX.IntrinsicElements> = {
  body: "p",
  small: "p",
  large: "p",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  lead: "p",
  paragraph: "p",
};

/**
 * Typography component for consistent text styling across the application.
 * Provides type-safe variants with consistent spacing and styling.
 */
export function Typography({
  variant = "body",
  as,
  className,
  children,
  includeColor = true,
  includeSpacing = true,
}: TypographyProps) {
  const Component = as || defaultElements[variant];
  const baseClasses = variant === "paragraph" 
    ? typographyClasses.paragraph
    : getTypographyClasses(variant, { includeColor, includeSpacing });

  return (
    <Component className={clsx(baseClasses, className)}>
      {children}
    </Component>
  );
}










