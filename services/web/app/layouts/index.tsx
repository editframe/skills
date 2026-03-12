import { MarketingLayout } from "~/components/layouts/MarketingLayout";
import { FeaturesList } from "~/components/marketing/FeaturesList";
import { Hero } from "~/components/marketing/Hero";
import { Playground } from "~/components/marketing/Playground";

export const Layout = ({
  features,
  playground,
  description,
}: {
  description?: string;
  features: { icon: string; title: string; description: string }[];
  playground: { css: string; presetCode: string; html?: string; jsx: string };
}) => {
  return (
    <MarketingLayout containerClassName="pt-20 pb-8">
      <div className="mb-8">
        <Hero
          subheader="Make Videos with Code"
          header="Editframe"
          description={description}
        />
      </div>
      <div className="mb-14 mt-12">
        <FeaturesList features={features} />
      </div>
      <div className="mt-8 lg:mt-14">
        {playground.jsx ? (
          <Playground css={playground.css} presetCode={playground.presetCode}>
            {playground.jsx}
          </Playground>
        ) : (
          <Playground
            html={playground.html}
            css={playground.css}
            presetCode={playground.presetCode}
          />
        )}
      </div>
    </MarketingLayout>
  );
};
