/**
 * Types for landing-page-4 components
 * Inspired by Hasura's clean, enterprise-focused design
 */

export interface HeroSectionProps {
  headline: string;
  subheadline: string;
  primaryCTA: { label: string; href: string };
  secondaryCTA: { label: string; href: string };
  logos: Array<{ name: string; logo?: string }>;
}

export interface ValuePropSectionProps {
  headline: string;
  subheadline: string;
  features: Array<{
    icon: "speed" | "governance" | "scale";
    title: string;
    description: string;
    testimonial?: {
      company: string;
      quote: string;
    };
  }>;
}

export interface ArchitectureSectionProps {
  headline: string;
  description: string;
  centerLabel: string;
  leftItems: Array<{ label: string; icon?: string }>;
  rightItems: Array<{ label: string; icon?: string }>;
}

export interface FeatureListSectionProps {
  eyebrow: string;
  headline: string;
  description: string;
  features: Array<{
    icon: "productivity" | "automation" | "aggregation" | "reliability";
    title: string;
    description: string;
  }>;
  codePreview?: string;
}

export interface TestimonialSectionProps {
  quote: string;
  author: string;
  role: string;
  company: string;
  metric?: {
    value: string;
    label: string;
  };
  logos: Array<{ name: string }>;
}

export interface DeveloperSectionProps {
  headline: string;
  subheadline: string;
  testimonials: Array<{
    quote: string;
    author: string;
    role: string;
    avatar?: string;
  }>;
  communityCTA?: {
    label: string;
    href: string;
  };
}

export interface FinalCTASectionProps {
  headline: string;
  primaryCTA: { label: string; href: string };
  secondaryCTA?: { label: string; href: string };
}



