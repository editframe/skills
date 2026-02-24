import type { MetaFunction } from "react-router";
import { Navigation } from "~/components/landing-v5/Navigation";
import { FooterSection } from "~/components/landing-v5/sections/FooterSection";
import { useTheme } from "~/hooks/useTheme";
import "~/styles/landing.css";

export const meta: MetaFunction = () => {
  return [
    { title: "Terms of Service | Editframe" },
    {
      name: "description",
      content:
        "Terms of Service for Editframe cloud services, subscriptions, and paid plans.",
    },
  ];
};

export default function TermsPage() {
  useTheme();

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] text-[var(--ink-black)]">
      <Navigation />

      <main className="pt-32 pb-20">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-5xl sm:text-7xl font-black tracking-tighter uppercase leading-none mb-12">
            Terms of Service
          </h1>

          <div className="prose prose-lg max-w-none dark:prose-invert prose-headings:font-black prose-headings:tracking-tight prose-headings:uppercase prose-h2:text-2xl prose-h3:text-xl prose-a:text-[var(--poster-blue)] prose-a:underline-offset-2 prose-strong:text-[var(--ink-black)] dark:prose-strong:text-white prose-hr:border-[var(--ink-black)]/10 dark:prose-hr:border-white/10">
            <p>
              <strong>Effective Date:</strong> January 12, 2026{" "}
              <strong>Version:</strong> 2.0
            </p>

            <p>
              These Terms govern your access to Editframe cloud services
              (Server-Side Rendering, Premium Player) and paid subscriptions.
              For the Client-Side SDK, see the License Agreement. By creating an
              account, you agree to these Terms.
            </p>

            <hr />

            <h2>1. Accounts</h2>

            <p>
              Provide accurate information at signup including your legal name,
              email, billing details, and total employee count. You are
              responsible for all activity under your account, maintaining
              credential security, and ensuring organizational compliance.
            </p>

            <p>
              <strong>Prohibited:</strong> Sharing credentials or API keys across
              organizations; creating multiple accounts to circumvent pricing.
            </p>

            <p>
              If signing up on behalf of an organization, you represent that you
              have authority to bind it.
            </p>

            <hr />

            <h2>2. Subscriptions</h2>

            <h3>Tiers</h3>

            <p>
              <strong>Free (≤3 employees):</strong> Client-Side SDK only.
              <br />
              <strong>Team (4–10 employees):</strong> Client-Side SDK for any
              business purpose.
              <br />
              <strong>Cloud (11–20 employees, or any size needing cloud):</strong>{" "}
              Client-Side SDK + Server-Side Rendering + Premium Player.
              <br />
              <strong>Enterprise (21+):</strong> Cloud Tier features + priority
              support + custom SLAs. Contact{" "}
              <a href="mailto:hello@editframe.com">hello@editframe.com</a>.
            </p>

            <p>
              "Total employees" = all full-time, part-time, and contractors
              across all affiliated entities. Threshold is based on total
              headcount, not SDK users.
            </p>

            <h3>Usage Billing</h3>

            <p>
              Cloud Tier usage fees apply in addition to the base subscription:
            </p>

            <ul>
              <li>Server-Side Rendering: billed per render minute</li>
              <li>Premium Player: billed per delivery minute</li>
            </ul>

            <p>
              <strong>Render minute:</strong> One minute of Server-Side
              processing time, measured in 1-second increments, rounded up.
            </p>

            <p>
              <strong>Delivery minute:</strong> One minute of video streamed from
              cloud storage via Premium Player. Cache replays in the same session
              are not billed. Local file playback via the Client-Side SDK is not
              billed.
            </p>

            <p>
              See{" "}
              <a href="https://editframe.com/pricing">editframe.com/pricing</a> for
              current rates.
            </p>

            <h3>Upgrade Requirements</h3>

            <p>
              You are responsible for upgrading within 30 days of crossing a tier
              threshold. Evaluation use (30 days, non-production) is permitted
              before upgrading.
            </p>

            <hr />

            <h2>3. Billing</h2>

            <ul>
              <li>
                <strong>Processor:</strong> Stripe (USD)
              </li>
              <li>
                <strong>Cycle:</strong> Base fees billed monthly in advance;
                usage billed monthly in arrears
              </li>
              <li>
                <strong>Renewal:</strong> Automatic. Cancel at least 24 hours
                before renewal to avoid next charge
              </li>
              <li>
                <strong>Price changes:</strong> 30 days' notice. Existing
                subscribers grandfathered for 90 days
              </li>
              <li>
                <strong>Taxes:</strong> Excluded from listed fees. You are
                responsible for all applicable VAT, GST, and sales tax
              </li>
              <li>
                <strong>Late payment:</strong> 1.5%/month interest. Services may
                be suspended after 15 days overdue
              </li>
              <li>
                <strong>Refunds:</strong> Non-refundable except: 14-day
                money-back guarantee on first paid subscription; credits for
                documented downtime; billing errors at our discretion
              </li>
              <li>
                <strong>Plan changes:</strong> Upgrades prorated immediately;
                downgrades take effect next cycle
              </li>
            </ul>

            <hr />

            <h2>4. Acceptable Use</h2>

            <p>
              Permitted: Create and deliver video content for lawful purposes;
              integrate our APIs into your applications.
            </p>

            <p>
              Prohibited: Violate applicable laws; infringe third-party IP;
              transmit malware; conduct unauthorized security research on our
              infrastructure; circumvent authentication or billing systems;
              disrupt services for other users.
            </p>

            <p>
              We may suspend access immediately for violations or security risks.
            </p>

            <hr />

            <h2>5. Intellectual Property</h2>

            <p>
              Editframe, Inc. retains all rights to the Services. You retain all
              rights to content you create ("Your Content"). We claim no
              ownership over Your Content. You grant us a limited license to
              store, process, and transmit Your Content to provide the Services.
            </p>

            <hr />

            <h2>6. Privacy and Telemetry</h2>

            <p>
              Use of the Services is subject to our{" "}
              <a href="https://editframe.com/privacy">Privacy Policy</a>. The
              SDK includes always-on telemetry (render counts, durations, IP
              addresses, domains, feature usage). Telemetry cannot be disabled.
              No video content is collected.
            </p>

            <hr />

            <h2>7. Availability</h2>

            <p>
              Target uptime: 99.5% monthly. Prorated service credits available
              for documented downtime. Credits are the sole remedy for downtime —
              no cash refunds.
            </p>

            <hr />

            <h2>8. Warranties</h2>

            <p>
              THE SERVICES ARE PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND.
              WE DO NOT WARRANT THAT THE SERVICES WILL BE ERROR-FREE, SECURE, OR
              UNINTERRUPTED. YOU ASSUME ALL RISKS.
            </p>

            <hr />

            <h2>9. Liability</h2>

            <p>
              WE SHALL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL,
              CONSEQUENTIAL, OR PUNITIVE DAMAGES. TOTAL LIABILITY SHALL NOT
              EXCEED AMOUNTS PAID IN THE 12 MONTHS PRECEDING THE CLAIM, OR $100
              USD, WHICHEVER IS GREATER.
            </p>

            <hr />

            <h2>10. Indemnification</h2>

            <p>
              You agree to indemnify Editframe, Inc. against claims arising from
              your use of the Services, Your Content, or your violation of these
              Terms or third-party rights.
            </p>

            <hr />

            <h2>11. Termination</h2>

            <p>
              You may cancel anytime via dashboard. Effect at end of current
              billing period. We may terminate immediately for breach, fraud,
              non-payment (after 15 days' notice), or security risk (10 days'
              written notice where feasible). Upon termination, access ceases,
              outstanding fees are due, and Your Content will be deleted within
              30 days. Content export available within 30 days of termination.
            </p>

            <hr />

            <h2>12. General</h2>

            <ul>
              <li>
                <strong>Governing Law:</strong> Delaware
              </li>
              <li>
                <strong>Jurisdiction:</strong> New York County, NY courts
              </li>
              <li>
                <strong>Jury trial waiver:</strong> Both parties waive jury trial
                rights to the maximum extent permitted by law
              </li>
              <li>
                <strong>Assignment:</strong> You may not assign these Terms
                without written consent
              </li>
              <li>
                <strong>Entire Agreement:</strong> These Terms, License
                Agreement, and Privacy Policy constitute the full agreement
              </li>
              <li>
                <strong>Force majeure:</strong> We are not liable for delays
                caused by events outside our reasonable control
              </li>
              <li>
                <strong>Severability:</strong> If any provision is found
                unenforceable, the remaining provisions remain in full effect
              </li>
            </ul>

            <hr />

            <h2>Contact</h2>

            <p>
              <a href="mailto:hello@editframe.com">hello@editframe.com</a>
            </p>

            <p>
              <strong>Last Updated:</strong> February 23, 2026
            </p>
          </div>
        </div>
      </main>

      <FooterSection />
    </div>
  );
}
