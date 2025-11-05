import { graphql } from "@/graphql";
import { commitSession } from "@/util/session";
import { data, redirect } from "react-router";
import type { MetaFunction } from "react-router";
import { useState } from "react";
import {
  isRouteErrorResponse,
  useNavigation,
  useRouteError,
  useSearchParams,
} from "react-router";
import { v4 } from "uuid";
import { z } from "zod";
import { Button } from "~/components/Button";
import { webhookTopics } from "~/constants/webhookTopics";
import { createApiKey } from "~/createApiKey.server";
import { formFor } from "~/formFor";
import { requireQueryAs } from "@/graphql.server/userClient";
import { Link } from "~/components/Link";
import { ErrorMessage } from "~/components/ErrorMessage";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";

import type { Route } from "./+types/new";
import { requireSession } from "@/util/requireSession.server";
import { requireOrgId } from "@/util/requireOrgId";

export const loader = async ({ request }: Route.LoaderArgs) => {
  const { session } = await requireSession(request);

  const [org] = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
      query GetOrg ($orgId: uuid!) {
        result: orgs(where: { id: { _eq: $orgId } }) {
          id
        }
      }
    `),
    { orgId: requireOrgId(request) },
  );

  if (!org) {
    throw new Response("Unauthorized", { status: 403 });
  }

  return null;
};

export const ErrorBoundary = () => {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 403) {
    return (
      <>
        <ErrorMessage message="You don't have permission to create an API key for this organization." />
        <Link to="/resource/api_keys">
          <Button mode="secondary" icon={ArrowLeftIcon}>
            Go back
          </Button>
        </Link>
      </>
    );
  }
  throw error;
};

const CreateProjectSchema = z.object({
  name: z.string().min(1, "Name cannot be blank"),
  org_id: z.string(),
  webhook_url: z
    .string()
    .refine(
      (url) => !url || /^https?:\/\/.+/.test(url),
      "Must be a valid URL starting with http:// or https://",
    )
    .optional(),
  webhook_events: z.string().array().optional(),
  expired_at: z
    .string()
    .transform((val) => {
      if (!val) return null;
      const days = Number.parseInt(val);
      const date = new Date();
      // Adding millis to the date because js date math can go bad around months of differing lengths etc.
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
      return date;
    })
    .optional(),
});

const createKey = formFor(CreateProjectSchema);

export const meta: MetaFunction = () => {
  return [{ title: "New API key | Editframe" }];
};

export const action = async ({ request }: Route.ActionArgs) => {
  const { session, sessionCookie } = await requireSession(request);
  const values = await createKey.parseFormData(request);

  if (!values.success) {
    return data(values.errors, { status: 400 });
  }

  const apiKey = values.data;

  const generatedToken = `ef_${v4().replaceAll("-", "")}`;
  const generatedSecret = `ef_webhook_${v4().replaceAll("-", "")}`;

  const [org] = await requireQueryAs(
    session,
    "org-editor",
    graphql(`
    query GetOrg ($orgId: uuid!) {
      result: orgs(where: { id: { _eq: $orgId } }) {
        id
      }
    }
  `),
    { orgId: apiKey.org_id },
  );

  if (!org) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const result = await createApiKey({
    token: generatedToken,
    webhookSecret: generatedSecret,
    name: apiKey.name,
    orgId: apiKey.org_id,
    userId: session.uid,
    webhookUrl: apiKey.webhook_url ?? null,
    webhookEvents: apiKey.webhook_events,
    expired_at: apiKey.expired_at,
  });

  const token = `${generatedToken}_${result.id}`;

  sessionCookie.flash("token", token);
  sessionCookie.flash("webhookSigningSecret", generatedSecret);

  return redirect(`/resource/api_keys/${result.id}?org=${apiKey.org_id}`, {
    headers: {
      "Set-Cookie": await commitSession(sessionCookie),
    },
  });
};

export default function NewApiKey() {
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const [selectedExpiredAt, setSelectedExpiredAt] = useState<string | null>(
    null,
  );

  const [params] = useSearchParams();
  const orgId = params.get("org");
  if (!orgId) {
    throw new Error("No org provided");
  }
  return (
    <div>
      <createKey.Form>
        <div className="space-y-12 max-w-lg">
          <div className="">
            <div>
              <h2 className="font-semibold text-base text-gray-900 leading-7">
                New API Key
              </h2>
              <p className="mt-1 text-gray-600 text-sm leading-6">
                Create a new API Key
              </p>
            </div>

            <div className="space-y-4">
              <createKey.Input
                label="Name"
                description="A name for the API key. This is useful to identify the key in the list of API keys. The name is not used for any other purpose."
                field="name"
                type="text"
                placeholder="Enter your key name"
                aria-label="name"
              />

              <createKey.HiddenInput field="org_id" value={orgId} />

              <createKey.Select
                label="Expires at"
                field="expired_at"
                description="The API key will expire at the selected date. You will be able to renew it at any time, including after expiration."
                options={[
                  { value: "1", label: "1 day" },
                  { value: "7", label: "1 week" },
                  { value: "30", label: "1 month" },
                  { value: "365", label: "1 year" },
                  {
                    value: "",
                    label: "No expiration date",
                  },
                ]}
                aria-label="Expires at"
                value={selectedExpiredAt ?? ""}
                onChange={(e) => {
                  setSelectedExpiredAt(e.target.value);
                }}
              />

              <createKey.Input
                label="Webhook URL"
                field="webhook_url"
                description="If you want to receive webhooks for actions performed with this API key, enter the URL here."
                type="text"
                placeholder="Enter your Webhook URL"
                aria-label="Webhook URL"
              />

              <div className="space-y-4 pt-4">
                <h2 className="font-semibold text-md">
                  Select the events you want to receive webhooks for:
                </h2>
                <p className="text-athens-gray-600 text-xs">
                  Resource changes triggered by other API keys or through this
                  web dashboard will not trigger webhook events.
                </p>
                {webhookTopics.map((event) => (
                  <div key={event.topic}>
                    <createKey.Checkbox
                      array
                      field="webhook_events"
                      value={event.topic}
                      label={event.topic}
                      aria-label={event.topic}
                      description={event.description}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-start items-center gap-6 mt-6">
          <Button
            mode="primary"
            type="submit"
            loading={submitting}
            aria-label="Create API key"
          >
            {submitting ? "Creating..." : "Create API key"}
          </Button>
          <Link to="/resource/api_keys">Cancel</Link>
        </div>
      </createKey.Form>
    </div>
  );
}
