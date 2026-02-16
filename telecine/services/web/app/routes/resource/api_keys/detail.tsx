import { graphql } from "@/graphql";
import { commitSession } from "@/util/session";

import {
  data,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
} from "react-router";
import type { MetaFunction } from "react-router";
import { useEffect, useState } from "react";
import { ErrorMessage } from "~/components/ErrorMessage";
import { SuccessMessage } from "~/components/SuccessMessage";
import z from "zod";
import { formFor } from "~/formFor";
import { webhookTopics } from "~/constants/webhookTopics";
import { ArrowLeft, Clipboard, EyeSlash } from "@phosphor-icons/react";
import { TimeAgoInWords } from "~/ui/timeAgoInWords";
import { requireMutateAs, requireQueryAs } from "@/graphql.server/userClient";
import { Clock, Key, Trash } from "@phosphor-icons/react";
import { Button } from "~/components/Button";
import { useFetcher } from "react-router";
import { Link } from "~/components/Link";
import { logger } from "@/logging";

import type { Route } from "./+types/detail";
import { identityContext, sessionCookieContext } from "~/middleware/context";

const schema = z.object({
  name: z.string(),
  webhook_url: z
    .string()
    .refine(
      (url) => !url || /^https?:\/\/.+/.test(url),
      "Must be a valid URL starting with http:// or https://",
    )
    .optional(),
  webhook_events: z.string().array().optional(),
});

export const editApiKey = formFor(schema);

export const loader = async ({ request, params, context }: Route.LoaderArgs) => {
  const session = context.get(identityContext);
  const sessionCookie = context.get(sessionCookieContext);

  const [key] = await requireQueryAs(
    { uid: session.uid, cid: session.cid ?? null },
    "org-admin",
    graphql(`
        query GetApiKey($id: uuid!) {
          result: identity_api_keys(where: { id: { _eq: $id } }) {
            name
            id
            org_id
            created_at
            updated_at
            expired_at
            webhook_events
            webhook_url
            org {
              display_name
              id
            }
          }
        }
      `),
    {
      id: params.id,
    },
  );

  if (!key) {
    throw new Response("Unauthorized", { status: 403 });
  }

  const token = sessionCookie.get("token") || null;
  const errorMessage = sessionCookie.get("error") || null;
  const successMessage = sessionCookie.get("success") || null;
  const webhookSigningSecret =
    sessionCookie.get("webhookSigningSecret") || null;

  sessionCookie.unset("token");
  sessionCookie.unset("error");
  sessionCookie.unset("success");
  sessionCookie.unset("webhookSigningSecret");

  return data(
    {
      key,
      token,
      errorMessage,
      successMessage,
      webhookSigningSecret,
    },
    {
      headers: {
        "Set-Cookie": await commitSession(sessionCookie),
      },
    },
  );
};

export const ErrorBoundary = () => {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 403) {
    return (
      <>
        <ErrorMessage message="You don't have permission to view this API key." />
        <Link to="/resource/api_keys">
          <Button mode="secondary" icon={ArrowLeft}>
            Go back
          </Button>
        </Link>
      </>
    );
  }
  throw error;
};

export const meta: MetaFunction<typeof loader> = () => {
  return [{ title: "API Key | Editframe" }];
};

interface SecretFieldProps {
  value: string;
  isHidden?: boolean;
  label: string;
  description?: string;
}

function SecretField({ value, label, description }: SecretFieldProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (copied) {
      setTimeout(() => setCopied(false), 2000);
    }
  }, [copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch (error) {
      console.error("Failed to copy to clipboard", error);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-900">
        {label}
        <EyeSlash
          className="ml-1 inline-block h-4 w-4 text-gray-500"
          aria-hidden="true"
        />
      </label>
      {description && <p className="text-sm text-gray-600">{description}</p>}
      <p className="text-sm font-medium text-amber-600">
        Important: Copy this value now. For security reasons, it will not be
        displayed again.
      </p>
      <div className="relative mt-2 rounded-md shadow-sm ring-1 ring-inset ring-gray-300 focus-within:ring-2 focus-within:ring-inset focus-within:ring-editframe-600 sm:max-w-md">
        <input
          value={value}
          type="text"
          readOnly
          disabled
          aria-label={label}
          className="block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-editframe-600 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500 disabled:ring-gray-200 sm:text-sm sm:leading-6"
        />
        <div className="absolute inset-y-0 right-0 flex cursor-pointer items-center bg-gray-100">
          <button
            type="button"
            onClick={handleCopy}
            className="relative -ml-px inline-flex items-center gap-x-1.5 rounded-r-md px-3 py-3 text-sm font-semibold text-editframe-900"
          >
            <Clipboard className="h-5 w-5 text-editframe-900" weight="fill" />
            <span>{copied ? "Copied" : "Copy"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface ApiKeyActionProps {
  id: string;
  name: string;
}

const RegenerateTokenAction = ({ id, name }: ApiKeyActionProps) => {
  const fetcher = useFetcher<{ success: boolean }>();
  const isLoading = fetcher.state !== "idle";
  const isSuccess = fetcher.state === "idle" && !!fetcher.data?.success;

  return (
    <Button
      mode="action"
      icon={Key}
      disabled={isLoading}
      loading={isLoading}
      action={{
        fetcher,
        method: "POST",
        url: `/resource/api_keys/${id}/regenerate`,
      }}
      confirmation={{
        title: "Regenerate API Token",
        description:
          "This will invalidate the existing token. Applications using this token will need to be updated.",
        confirmText: "Regenerate",
        cancelText: "Cancel",
        challengeText: name,
      }}
    >
      {isSuccess ? "Regenerated!" : "Regenerate Token"}
    </Button>
  );
};

const RegenerateWebhookAction = ({ id, name }: ApiKeyActionProps) => {
  const fetcher = useFetcher<{ success: boolean }>();
  const isLoading = fetcher.state !== "idle";
  const isSuccess = fetcher.state === "idle" && !!fetcher.data?.success;

  return (
    <Button
      mode="action"
      icon={Key}
      disabled={isLoading}
      loading={isLoading}
      action={{
        fetcher,
        method: "POST",
        url: `/resource/api_keys/${id}/webhook_regenerate`,
      }}
      confirmation={{
        title: "Regenerate Webhook Secret",
        description:
          "This will invalidate the existing webhook signing secret. Webhook endpoints will need to be updated.",
        confirmText: "Regenerate",
        cancelText: "Cancel",
        challengeText: name,
      }}
    >
      {isSuccess ? "Regenerated!" : "Regenerate Webhook Secret"}
    </Button>
  );
};

const ExtendExpirationAction = ({ id }: ApiKeyActionProps) => {
  const fetcher = useFetcher<{ success: boolean }>();
  const isLoading = fetcher.state !== "idle";
  const isSuccess = fetcher.state === "idle" && !!fetcher.data?.success;

  return (
    <Button
      mode="action"
      icon={Clock}
      disabled={isLoading}
      loading={isLoading}
      confirmation={{
        title: "Extend API Key Expiration",
        description: "Choose new expiration",
        inputs: [
          {
            type: "select",
            name: "expired_at",
            label: "Extension period",
            schema: z.string(),
            options: [
              { value: "1", label: "1 day" },
              { value: "7", label: "1 week" },
              { value: "30", label: "1 month" },
              { value: "365", label: "1 year" },
              {
                value: "",
                label: "No expiration date",
              },
            ],
          },
        ],
      }}
      action={{
        fetcher,
        method: "POST",
        url: `/resource/api_keys/${id}/extend`,
      }}
    >
      {isSuccess ? "Extended!" : "Extend Expiration"}
    </Button>
  );
};

const DeleteAction = ({ id, name }: ApiKeyActionProps) => {
  const fetcher = useFetcher<{ success: boolean }>();
  const isLoading = fetcher.state !== "idle";
  const isSuccess = fetcher.state === "idle" && !!fetcher.data?.success;

  return (
    <Button
      mode="destructive"
      icon={Trash}
      disabled={isLoading}
      loading={isLoading}
      action={{
        fetcher,
        method: "POST",
        url: `/resource/api_keys/${id}/delete`,
      }}
      confirmation={{
        title: `Delete API key for ${name}`,
        description:
          "This will prevent any applications using this token from accessing the API. This action cannot be undone.",
        confirmText: "Delete",
        cancelText: "Cancel",
        challengeText: name,
      }}
    >
      {isSuccess ? "Deleted!" : "Delete"}
    </Button>
  );
};

export default function ApiKeyDetail() {
  const { key, token, webhookSigningSecret, errorMessage, successMessage } =
    useLoaderData<typeof loader>();

  return (
    <div className="space-y-4">
      {errorMessage && (
        <ErrorMessage message={errorMessage} note="Please try again." />
      )}
      {successMessage && <SuccessMessage message={successMessage} />}

      {token && (
        <SecretField label="Copy API Token" value={token} isHidden={true} />
      )}

      {webhookSigningSecret && (
        <SecretField
          label="Copy Webhook Signing Secret"
          value={webhookSigningSecret}
        />
      )}

      <div>
        <h2 className="font-semibold text-base text-gray-900 leading-7">
          API Key: {key.name}
        </h2>
        <p className="mt-1 text-gray-600 text-sm leading-6">
          Manage your API key
        </p>
        {key.expired_at ? (
          <p className="text-sm text-gray-600">
            {new Date(key.expired_at) < new Date() ? (
              "This API key has expired"
            ) : (
              <>
                This API key will expire in{" "}
                <TimeAgoInWords date={key.expired_at} />
              </>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-600">
            This API key will never expire
          </p>
        )}
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-sm font-medium text-gray-900 mb-4">
          API Key Actions
        </h3>
        <div className="flex flex-wrap gap-4">
          <RegenerateTokenAction id={key.id} name={key.name} />
          <RegenerateWebhookAction id={key.id} name={key.name} />
          <ExtendExpirationAction id={key.id} name={key.name} />
          <DeleteAction id={key.id} name={key.name} />
        </div>
      </div>

      <editApiKey.Form method="post">
        <div className="space-y-12 max-w-lg">
          <div>
            <div className="space-y-4">
              {/* Name Field */}
              <editApiKey.Input
                label="Name"
                field="name"
                type="text"
                defaultValue={key.name}
                description="A name to identify this API key"
              />

              {/* Webhook URL */}
              <editApiKey.Input
                label="Webhook URL"
                field="webhook_url"
                type="text"
                defaultValue={key.webhook_url || ""}
                description="If you want to receive webhooks for actions performed with this API key, enter the URL here"
              />

              {/* Webhook Events Section */}
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
                    <editApiKey.Checkbox
                      array
                      field="webhook_events"
                      value={event.topic}
                      label={event.topic}
                      description={event.description}
                      defaultChecked={key.webhook_events?.includes(event.topic)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex justify-start items-center gap-6">
            <editApiKey.Submit>Save Changes</editApiKey.Submit>
          </div>
        </div>
      </editApiKey.Form>
    </div>
  );
}

export const action = async ({ request, params, context }: Route.ActionArgs) => {
  const session = context.get(identityContext);
  const sessionCookie = context.get(sessionCookieContext);
  const values = await editApiKey.parseFormData(request);

  if (!values.success) {
    return data(values.errors, { status: 400 });
  }

  const apiKey = values.data;

  try {
    await requireMutateAs(
      { uid: session.uid, cid: session.cid ?? null },
      "org-editor",
      graphql(`
          mutation UpdateApiKey($id: uuid!, $changes: identity_api_keys_set_input!) {
            result: update_identity_api_keys_by_pk(
              pk_columns: { id: $id }
              _set: $changes
            ) {
              id
            }
          }
        `),
      {
        id: params.id,
        changes: {
          name: apiKey.name,
          webhook_url: apiKey.webhook_url || null,
          webhook_events: apiKey.webhook_events,
        },
      },
    );

    sessionCookie.flash("success", "API key updated successfully");

    return data(
      { success: true },
      {
        headers: {
          "Set-Cookie": await commitSession(sessionCookie),
        },
      },
    );
  } catch (error) {
    sessionCookie.flash("error", "Failed to update API key");
    logger.error(error, "Failed to update API key");
    return data(
      { success: false },
      {
        headers: {
          "Set-Cookie": await commitSession(sessionCookie),
        },
      },
    );
  }
};
