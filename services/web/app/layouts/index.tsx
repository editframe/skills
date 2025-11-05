import { Footer } from "~/components/marketing/Footer";
import { FeaturesList } from "~/components/marketing/FeaturesList";
import { Hero } from "~/components/marketing/Hero";
import { Header } from "~/components/marketing/Header";
import { Playground } from "~/components/marketing/Playground";
import { PreviewVideo } from "~/components/docs/PreviewVideo";

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
    <div className="dark:bg-[#1b1b1f] bg-white">
      <Header />
      <div className="lg:px-[5.5rem] max-w-6xl mx-auto">
        <div className="px-6 pt-28 pb-8 -mt-14">
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
          <div className="lg:mt-14">
            {playground.jsx ? (
              <Playground
                css={playground.css}
                presetCode={playground.presetCode}
              >
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
          <div className="lg:mt-16">
            <PreviewVideo />
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};
