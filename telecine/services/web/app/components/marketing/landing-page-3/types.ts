/**
 * Types for landing-page-3 components
 * Inspired by Mediabunny's clean, developer-focused design
 */

export interface HeroSectionProps {
  headline: string;
  subheadline: string;
  installCommand: string;
  primaryCTA: { label: string; href: string };
  secondaryCTAs?: Array<{ label: string; href: string }>;
  badges?: string[];
}

export interface FeatureSectionProps {
  headline: string;
  description: string;
  codeExample?: string;
  codeLanguage?: string;
  learnMoreHref?: string;
  layout?: "left" | "right";
  badges?: string[];
}

export interface FormatsSectionProps {
  headline: string;
  description: string;
  formats: Array<{ name: string; category?: "video" | "image" | "audio" | "other" }>;
  learnMoreHref?: string;
}

export interface PerformanceSectionProps {
  headline: string;
  description: string;
  metrics: Array<{ value: string; label: string; description?: string }>;
}

export interface TechStackSectionProps {
  headline: string;
  description: string;
  technologies: Array<{ name: string; description?: string }>;
  codeExample?: string;
}

export interface CTASectionProps {
  headline: string;
  description?: string;
  primaryCTA: { label: string; href: string };
  secondaryCTA?: { label: string; href: string };
}



