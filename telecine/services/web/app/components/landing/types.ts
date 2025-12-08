/**
 * TypeScript interfaces for landing page section components
 */

import type React from "react";

export interface CTAButton {
  label: string;
  href: string;
  primary?: boolean;
}

export interface HeroSectionProps {
  headline: string;
  highlightedWord?: string;
  description: string;
  installCommand?: string;
  primaryCTA: CTAButton;
  secondaryCTA?: CTAButton;
  quickLinks?: Array<{ label: string; href: string }>;
}

export interface FeatureShowcaseProps {
  eyebrow: string;
  headline: string;
  description: string;
  codeExample?: string;
  codeLanguage?: string;
  visualComponent?: React.ReactNode;
  links?: Array<{ label: string; href: string }>;
  reversed?: boolean;
}

export interface UseCaseProps {
  title: string;
  description: string;
  image?: string;
  link?: { label: string; href: string };
}

export interface UseCasesSectionProps {
  eyebrow?: string;
  headline: string;
  useCases: UseCaseProps[];
}

export interface DemoSectionProps {
  headline: string;
  description?: string;
}

export interface PricingTier {
  name: string;
  description: string;
  price?: string;
  priceNote?: string;
  features: string[];
  cta: CTAButton;
  highlighted?: boolean;
}

export interface PricingSectionProps {
  headline: string;
  description?: string;
  tiers: PricingTier[];
}

export interface TrustedBySectionProps {
  logos: Array<{ name: string; logo?: React.ReactNode }>;
}

export interface Stat {
  value: string;
  label: string;
  icon?: React.ReactNode;
}

export interface StatsSectionProps {
  stats: Stat[];
}

export interface NewsletterSectionProps {
  headline: string;
  description?: string;
  placeholder?: string;
  buttonLabel?: string;
}

export interface CTASectionProps {
  headline: string;
  description?: string;
  primaryCTA: CTAButton;
  secondaryCTA?: CTAButton;
}

export interface FeatureGridItem {
  icon?: React.ReactNode;
  title: string;
  description: string;
}

export interface FeatureGridSectionProps {
  eyebrow?: string;
  headline: string;
  description?: string;
  features: FeatureGridItem[];
}
