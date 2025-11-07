import { PageLayout } from "./PageLayout";
import { Header } from "~/components/marketing/Header";
import { Footer } from "~/components/Footer";
import clsx from "clsx";
import type { PropsWithChildren } from "react";

interface DocsLayoutProps {
  containerClassName?: string;
  className?: string;
}

/**
 * Documentation layout component with Header, Footer, and docs-specific container.
 * Uses mobile-first responsive design optimized for documentation content.
 */
export function DocsLayout({
  children,
  containerClassName,
  className = "",
}: PropsWithChildren<DocsLayoutProps>) {
  return (
    <PageLayout className={className}>
      <Header />
      <div
        className={clsx(
          "px-4 sm:px-6 lg:px-[7.2rem] mx-auto w-full",
          containerClassName
        )}
      >
        {children}
      </div>
      <Footer />
    </PageLayout>
  );
}

