/**
 * TypeScript interfaces for landing-page-2 section components
 */

export interface HeroSectionProps {
  headline: string;
  subheadline?: string;
  description?: string;
  primaryCTA?: {
    label: string;
    href: string;
  };
  secondaryCTA?: {
    label: string;
    href: string;
  };
  trustSignals?: string[];
}

export interface WhyChooseSectionProps {
  headline?: string;
  comparison: {
    diy: {
      title: string;
      points: string[];
      risks: string[];
    };
    competitors: {
      title: string;
      points: string[];
      risks: string[];
    };
    editframe: {
      title: string;
      points: string[];
      benefits: string[];
    };
  };
}

export interface CodeControlSectionProps {
  headline?: string;
  description?: string;
  codeExample?: string;
  benefits?: Array<{
    title: string;
    description: string;
  }>;
}

export interface InfrastructureSectionProps {
  headline?: string;
  description?: string;
  benefits?: Array<{
    title: string;
    description: string;
  }>;
}

export interface RenderingSectionProps {
  headline?: string;
  description?: string;
  metrics?: Array<{
    value: string;
    label: string;
  }>;
  benefits?: Array<{
    title: string;
    description: string;
  }>;
}

export interface DeveloperExperienceSectionProps {
  headline?: string;
  description?: string;
  features?: Array<{
    title: string;
    description: string;
    icon?: React.ReactNode;
  }>;
}

export interface TrustSectionProps {
  headline?: string;
  description?: string;
  socialProof?: string;
  metrics?: Array<{
    label: string;
    value: string;
  }>;
  trustPoints?: string[];
}

export interface GetStartedSectionProps {
  headline?: string;
  description?: string;
  primaryCTA?: {
    label: string;
    href: string;
  };
  secondaryCTA?: {
    label: string;
    href: string;
  };
  benefits?: string[];
}



