import type { MetaFunction } from "react-router";
import { Navigation } from "~/components/landing-v5/Navigation";
import { FooterSection } from "~/components/landing-v5/sections/FooterSection";
import { useTheme } from "~/hooks/useTheme";
import "~/styles/landing.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Privacy Policy | Editframe" },
    {
      name: "description",
      content: "Editframe Privacy Policy.",
    },
  ];
};

export default function PrivacyPage() {
  useTheme();

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] text-[var(--ink-black)]">
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none mb-12">
            Privacy Policy
          </h1>

          <p className="text-lg text-[var(--warm-gray)]">
            Privacy Policy coming soon. Questions?{" "}
            <a
              href="mailto:hello@editframe.com"
              className="text-[var(--poster-blue)] underline underline-offset-2"
            >
              hello@editframe.com
            </a>
          </p>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
