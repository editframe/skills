import { Link } from "react-router";
import clsx from "clsx";
import type { CTASectionProps } from "../types";

/**
 * CTA Section - Final call to action
 * Bold gradient background with clear action
 */
export function CTASection({
  headline,
  description,
  primaryCTA,
  secondaryCTA,
}: CTASectionProps) {
  return (
    <section className="relative py-20 sm:py-28 lg:py-32 overflow-hidden">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900" />

      {/* Decorative elements */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djJoLTJ2LTJoMnptMC00aDJ2MmgtMnYtMnptLTQgMHYyaC0ydi0yaDJ6bTIgMGgydjJoLTJ2LTJ6bS0yIDRoMnYyaC0ydi0yem00LThoMnYyaC0ydi0yem0tMTAgNHYtMmgydjJoLTJ6bTQgMGgtMnYtMmgydjJ6bTIgMHYtMmgydjJoLTJ6bS0yLTRoMnYyaC0ydi0yem00IDBoLTJ2LTJoMnYyem0wLTR2LTJoMnYyaC0yek0zMCAyNnYyaC0ydi0yaDJ6bS00IDBoMnYyaC0ydi0yem0yLTRoMnYyaC0ydi0yek0yNiAyMnYtMmgydjJoLTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-50" />

      {/* Floating orbs */}
      <div className="absolute top-10 left-[20%] w-72 h-72 bg-blue-500/20 rounded-full blur-[100px] animate-float-slow" />
      <div
        className="absolute bottom-10 right-[20%] w-96 h-96 bg-violet-500/20 rounded-full blur-[100px] animate-float-slow"
        style={{ animationDelay: "3s" }}
      />

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
          {headline}
        </h2>

        {description && (
          <p className="text-lg sm:text-xl text-blue-100/80 max-w-2xl mx-auto mb-10">
            {description}
          </p>
        )}

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to={primaryCTA.href}
            className="inline-flex items-center px-8 py-4 rounded-full bg-white text-slate-900 font-semibold text-lg hover:bg-blue-50 transition-all hover:scale-105 shadow-lg hover:shadow-xl"
          >
            {primaryCTA.label}
            <svg
              className="ml-2 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 7l5 5m0 0l-5 5m5-5H6"
              />
            </svg>
          </Link>
          {secondaryCTA && (
            <Link
              to={secondaryCTA.href}
              className="inline-flex items-center px-8 py-4 rounded-full border-2 border-white/30 text-white font-semibold text-lg hover:border-white/60 hover:bg-white/5 transition-all"
            >
              {secondaryCTA.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
