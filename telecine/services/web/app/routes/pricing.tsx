import type { MetaFunction } from "react-router";
import { Link } from "react-router";
import { Navigation } from "~/components/landing-v5/Navigation";
import { FooterSection } from "~/components/landing-v5/sections/FooterSection";
import { useTheme } from "~/hooks/useTheme";
import "~/styles/landing.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Pricing | Editframe" },
    {
      name: "description",
      content:
        "Editframe pricing tiers — free for individuals and small teams, paid plans for larger organizations and cloud rendering.",
    },
  ];
};

const tiers = [
  {
    name: "Free",
    employees: "≤3 employees",
    price: "$0",
    period: "forever",
    color: "var(--poster-green)",
    description:
      "Individuals, freelancers, non-profits, educational institutions, and small teams.",
    features: [
      "Client-Side SDK",
      "Browser rendering (WebCodecs)",
      "CLI rendering",
      "Commercial use permitted",
      "Community support",
    ],
    cta: "Get started",
    ctaHref: "/auth/register",
  },
  {
    name: "Team",
    employees: "4–10 employees",
    price: "Contact us",
    period: "",
    color: "var(--poster-blue)",
    description:
      "Growing teams that need full Client-Side SDK rights for production use.",
    features: [
      "Everything in Free",
      "Full production SDK rights",
      "Email & Slack support",
      "48-hour response time",
    ],
    cta: "Contact sales",
    ctaHref: "mailto:hello@editframe.com",
  },
  {
    name: "Cloud",
    employees: "11–20, or any size needing cloud",
    price: "Contact us",
    period: "+ usage",
    color: "var(--poster-red)",
    description:
      "Server-Side Rendering and Premium Player for parallel rendering at scale.",
    features: [
      "Everything in Team",
      "Server-Side Rendering",
      "Premium Player (CDN streaming)",
      "Parallel fragment processing",
      "API & webhook integration",
      "Usage-based billing",
    ],
    cta: "Contact sales",
    ctaHref: "mailto:hello@editframe.com",
  },
  {
    name: "Enterprise",
    employees: "21+ employees",
    price: "Custom",
    period: "",
    color: "var(--poster-gold)",
    description:
      "Custom SLAs, priority support, and dedicated infrastructure for large organizations.",
    features: [
      "Everything in Cloud",
      "Priority support",
      "Custom SLAs",
      "Dedicated infrastructure",
      "Volume discounts",
    ],
    cta: "Contact us",
    ctaHref: "mailto:hello@editframe.com",
  },
];

const usageMetrics = [
  {
    name: "Render minute",
    description:
      "One minute of Server-Side processing time, measured in 1-second increments, rounded up.",
    color: "var(--poster-red)",
  },
  {
    name: "Delivery minute",
    description:
      "One minute of video streamed via Premium Player. Cache replays in the same session are not billed. Local playback via the Client-Side SDK is not billed.",
    color: "var(--poster-blue)",
  },
];

const comparisonFeatures = [
  {
    name: "Server-Side Rendering",
    free: false,
    team: false,
    cloud: true,
    enterprise: true,
  },
  {
    name: "Premium Player (CDN)",
    free: false,
    team: false,
    cloud: true,
    enterprise: true,
  },
  {
    name: "Parallel encoding",
    free: false,
    team: false,
    cloud: true,
    enterprise: true,
  },
  {
    name: "Email & Slack support",
    free: false,
    team: true,
    cloud: true,
    enterprise: true,
  },
  {
    name: "Priority support",
    free: false,
    team: false,
    cloud: false,
    enterprise: true,
  },
  {
    name: "Custom SLAs",
    free: false,
    team: false,
    cloud: false,
    enterprise: true,
  },
  {
    name: "Dedicated infrastructure",
    free: false,
    team: false,
    cloud: false,
    enterprise: true,
  },
];

const tierColors = [
  "var(--poster-green)",
  "var(--poster-blue)",
  "var(--poster-red)",
  "var(--poster-gold)",
];

const CheckIcon = () => (
  <div className="w-6 h-6 bg-[var(--poster-blue)] flex items-center justify-center">
    <svg
      className="w-3.5 h-3.5 text-white"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={3}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </div>
);

const CrossIcon = () => (
  <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
    <svg
      className="w-3.5 h-3.5 text-gray-400"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  </div>
);

const billingDetails = [
  {
    label: "Processor",
    value: "Stripe (USD)",
    color: "var(--poster-blue)",
  },
  {
    label: "Billing cycle",
    value: "Base fees monthly in advance; usage monthly in arrears",
    color: "var(--poster-red)",
  },
  {
    label: "Renewal",
    value: "Automatic. Cancel at least 24 hours before renewal",
    color: "var(--poster-gold)",
  },
  {
    label: "Money-back guarantee",
    value: "14 days on first paid subscription",
    color: "var(--poster-green)",
  },
  {
    label: "Plan changes",
    value: "Upgrades prorated immediately; downgrades take effect next cycle",
    color: "var(--poster-blue)",
  },
  {
    label: "Taxes",
    value:
      "Excluded from listed fees. You are responsible for applicable VAT, GST, and sales tax",
    color: "var(--poster-red)",
  },
];

export default function PricingPage() {
  useTheme();

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] text-[var(--ink-black)]">
      <Navigation />

      {/* Hero */}
      <section className="pt-32 pb-20 border-b-4 border-[var(--ink-black)] dark:border-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl sm:text-7xl md:text-8xl font-black tracking-tighter uppercase leading-none mb-6">
              Pricing
            </h1>
            <p className="text-lg text-[var(--warm-gray)] max-w-2xl mx-auto leading-relaxed">
              Free for individuals and small teams. Paid plans for larger
              organizations and cloud rendering infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* Tier Cards */}
      <section className="relative py-24 bg-[var(--paper-cream)] overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {tiers.map((tier) => (
              <div key={tier.name} className="relative">
                <div
                  className="absolute -bottom-2 -right-2 md:-bottom-3 md:-right-3 w-full h-full"
                  style={{ backgroundColor: tier.color }}
                />
                <div className="relative bg-white dark:bg-[#1a1a1a] text-[var(--ink-black)] dark:text-white border-4 border-[var(--ink-black)] dark:border-white/20 p-5 md:p-6 h-full flex flex-col">
                  <h3 className="text-2xl font-black uppercase tracking-tight mb-1">
                    {tier.name}
                  </h3>
                  <p className="text-xs font-bold uppercase tracking-wider text-[var(--warm-gray)] mb-4">
                    {tier.employees}
                  </p>

                  <div className="mb-4">
                    <span className="text-3xl font-black tracking-tighter">
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span className="text-sm text-[var(--warm-gray)] ml-1">
                        {tier.period}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-[var(--warm-gray)] mb-6">
                    {tier.description}
                  </p>

                  <div className="space-y-2 text-xs mb-6 flex-1">
                    {tier.features.map((feature) => (
                      <div key={feature} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--poster-green)] flex-shrink-0" />
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>

                  {tier.ctaHref.startsWith("mailto:") ? (
                    <a
                      href={tier.ctaHref}
                      className="block text-center px-6 py-3 font-bold text-sm uppercase tracking-wider transition-all border-2 border-[var(--ink-black)] dark:border-white hover:bg-[var(--ink-black)] hover:text-white dark:hover:bg-white dark:hover:text-black"
                    >
                      {tier.cta}
                    </a>
                  ) : (
                    <Link
                      to={tier.ctaHref}
                      className="block text-center px-6 py-3 font-bold text-sm uppercase tracking-wider transition-all border-2 border-[var(--ink-black)] dark:border-white hover:bg-[var(--ink-black)] hover:text-white dark:hover:bg-white dark:hover:text-black"
                    >
                      {tier.cta}
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-[var(--warm-gray)] mt-12">
            "Total employees" = all full-time, part-time, and contractors across
            all affiliated entities.
            <br />
            Threshold is based on total headcount, not SDK users.
          </p>
        </div>
      </section>

      {/* Usage Billing */}
      <section className="relative py-24 bg-[var(--card-dark-bg)] text-white border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-6">
              Usage Billing
            </h2>
            <div className="flex justify-center gap-1 mb-6">
              <div className="w-24 h-1 bg-[var(--poster-gold)]" />
              <div className="w-24 h-1 bg-[var(--poster-blue)]" />
            </div>
            <p className="text-lg text-white/60 max-w-2xl mx-auto leading-relaxed">
              Cloud Tier includes usage-based billing for rendering and
              streaming. Contact us for current rates.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {usageMetrics.map((metric) => (
              <div key={metric.name} className="relative">
                <div
                  className="absolute -bottom-2 -right-2 w-full h-full"
                  style={{ backgroundColor: metric.color, opacity: 0.3 }}
                />
                <div className="relative bg-white/5 border-2 border-white/10 p-6">
                  <div
                    className="font-black text-lg uppercase tracking-tight mb-3"
                    style={{ color: metric.color }}
                  >
                    {metric.name}
                  </div>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {metric.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-white/40">
              High Client-Side rendering volume does not trigger payment
              requirements — eligibility is determined by company size only.
            </p>
          </div>
        </div>
      </section>

      {/* Feature Comparison */}
      <section className="relative py-24 bg-[var(--paper-cream)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-6">
              Compare Plans
            </h2>
            <div className="flex justify-center gap-1 mb-6">
              <div className="w-24 h-1 bg-[var(--poster-red)]" />
              <div className="w-24 h-1 bg-[var(--poster-green)]" />
            </div>
            <p className="text-sm text-[var(--warm-gray)]">
              All tiers include Client-Side SDK, browser rendering, CLI
              rendering, and commercial use rights.
            </p>
          </div>

          <div className="relative max-w-5xl mx-auto">
            <div className="absolute -bottom-3 -right-3 w-full h-full bg-[var(--poster-green)]" />
            <div className="relative bg-[var(--card-bg)] border-4 border-[var(--ink-black)] dark:border-white overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--card-dark-bg)] text-white">
                    <th className="text-left py-4 px-6 font-bold text-sm uppercase tracking-wider">
                      Feature
                    </th>
                    {["Free", "Team", "Cloud", "Enterprise"].map((name, i) => (
                      <th key={name} className="text-center py-4 px-4">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-full h-1 mb-1"
                            style={{ backgroundColor: tierColors[i] }}
                          />
                          <span className="font-bold text-sm uppercase tracking-wider">
                            {name}
                          </span>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {comparisonFeatures.map((feature, i) => (
                    <tr
                      key={i}
                      className="border-b-2 border-[var(--ink-black)]/10 dark:border-white/10 last:border-0 hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
                    >
                      <td className="py-4 px-6 text-sm font-semibold">
                        {feature.name}
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          {feature.free ? <CheckIcon /> : <CrossIcon />}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          {feature.team ? <CheckIcon /> : <CrossIcon />}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          {feature.cloud ? <CheckIcon /> : <CrossIcon />}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex justify-center">
                          {feature.enterprise ? <CheckIcon /> : <CrossIcon />}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Billing Details */}
      <section className="relative py-24 bg-[var(--paper-cream)] border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-6">
              Billing
            </h2>
            <div className="flex justify-center gap-1 mb-6">
              <div className="w-24 h-1 bg-[var(--poster-gold)]" />
              <div className="w-24 h-1 bg-[var(--poster-red)]" />
            </div>
          </div>

          <div className="space-y-0">
            {billingDetails.map((item, i) => (
              <div
                key={i}
                className="flex items-start gap-4 py-5 border-b-2 border-[var(--ink-black)]/10 dark:border-white/10 last:border-b-0"
              >
                <div
                  className="flex-shrink-0 w-1 h-full min-h-[2.5rem] self-stretch"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                  <span className="flex-shrink-0 sm:w-52 font-black text-sm uppercase tracking-tight">
                    {item.label}
                  </span>
                  <span className="text-sm text-[var(--warm-gray)]">
                    {item.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Enterprise CTA */}
      <section className="relative py-24 bg-[var(--poster-blue)] dark:bg-[#1a2a4a] text-white border-t-4 border-[var(--ink-black)] dark:border-white overflow-hidden">
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tighter uppercase mb-6">
            Enterprise
          </h2>
          <div className="flex justify-center gap-2 mb-6">
            <div className="w-12 h-1 bg-white" />
            <div className="w-12 h-1 bg-white/70" />
            <div className="w-12 h-1 bg-white/40" />
          </div>
          <p className="text-xl text-white/80 max-w-2xl mx-auto leading-relaxed mb-10">
            21+ employees? Need custom SLAs, dedicated infrastructure, or volume
            pricing? Let's talk.
          </p>
          <a
            href="mailto:hello@editframe.com"
            className="inline-flex items-center px-8 py-4 bg-white text-[var(--poster-blue)] font-bold text-sm uppercase tracking-wider hover:bg-[var(--poster-gold)] hover:text-[var(--ink-black)] transition-colors shadow-poster-hard"
          >
            Contact hello@editframe.com
            <svg
              className="ml-3 w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 8l4 4m0 0l-4 4m4-4H3"
              />
            </svg>
          </a>
        </div>
      </section>

      <FooterSection />
    </div>
  );
}
