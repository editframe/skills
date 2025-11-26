import { FeatureCard } from "./FeatureCard";

export interface Feature {
  icon: string;
  title: string;
  description: string;
}

export const FeaturesList = ({ features }: { features: Feature[] }) => (
  <div className="relative">
    <div className="my-0 mx-auto max-w-7xl">
      <div className="flex lg:flex-row flex-col justify-start gap-3">
        {features.map((feature, index) => (
          <FeatureCard key={index} {...feature} />
        ))}
      </div>
    </div>
  </div>
);
