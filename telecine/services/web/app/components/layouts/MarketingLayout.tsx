import { PageLayout } from "./PageLayout";
import { Header } from "~/components/marketing/Header";
import { Footer } from "~/components/marketing/Footer";
import clsx from "clsx";
import type { PropsWithChildren } from "react";

interface MarketingLayoutProps {
  isLoggedIn?: boolean;
  containerClassName?: string;
  className?: string;
}

/**
 * Marketing page layout component with Header, Footer, and standardized container.
 * Uses mobile-first responsive design with configurable container padding.
 */
export function MarketingLayout({
  children,
  isLoggedIn,
  containerClassName,
  className = "",
}: PropsWithChildren<MarketingLayoutProps>) {
  return (
    <PageLayout className={className}>
      <Header isLoggedIn={isLoggedIn} />
      <div
        className={clsx(
          "px-4 sm:px-6 lg:px-[5.5rem] max-w-6xl mx-auto w-full",
          containerClassName
        )}
      >
        {children}
      </div>
      <Footer />
    </PageLayout>
  );
}

