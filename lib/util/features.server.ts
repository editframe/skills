/** Welcome to the telecine feature flags system. It is... a file. */

import { type LoaderFunction, type LoaderFunctionArgs, redirect } from "react-router";
import { parseRequestSession } from "./session";

export enum Features {
  REGISTRATION = "REGISTRATION",
  EDITOR = "EDITOR",
  UPLOADS = "UPLOADS",
  VIDEO2 = "VIDEO2",
  ORG_INVITES = "ORG_INVITES",
  ORG_MEMBERS = "ORG_MEMBERS",
  ORG_SETTINGS = "ORG_SETTINGS",
  ORG_CREATE = "ORG_CREATE",
  ORG_DELETE = "ORG_DELETE",
  RENDER = "RENDER",
  API_CREATE = "API_CREATE",
  API_UPDATE = "API_UPDATE",
  API_READ = "API_READ",
  API_DELETE = "API_DELETE",
  ASSET_READ = "ASSET_READ",
  TEMPLATES_READ = "TEMPLATES_READ",
  PLAYGROUND = "PLAYGROUND",
  ASSET_DELETE = "ASSET_DELETE",
}

// When features are generally available, add them to this set.
// Then later we can remove the feature flag checks for these features.

const generallyAvailableFeatures = new Set<Features>([
  Features.UPLOADS,
  Features.VIDEO2,
  Features.RENDER,
  Features.ORG_INVITES,
  Features.ORG_MEMBERS,
  Features.ORG_SETTINGS,
  Features.ORG_CREATE,
  Features.ORG_DELETE,
  Features.API_CREATE,
  Features.API_UPDATE,
  Features.API_READ,
  Features.API_DELETE,
  Features.ASSET_READ,
  Features.ASSET_DELETE,
]);

export function featureGate<LoaderType extends LoaderFunction>(
  feature: Features,
  loader: LoaderType,
) {
  return async (args: LoaderFunctionArgs): Promise<ReturnType<LoaderType>> => {
    const isEnabled = await featureEnabled(feature, args.request);

    if (isEnabled) {
      return (await loader(args)) as ReturnType<LoaderType>;
    }

    return redirect("/") as never;
  };
}

export async function featureEnabled(feature: Features, request: Request) {
  const isEnabled = await _featureEnabled(feature, request);
  return isEnabled;
}

const _featureEnabled = async (feature: Features, request: Request) => {
  // First, if the feature flag is in the environment, use that.
  if (process.env[feature] !== undefined) {
    // Any value other than "false" is considered true.
    return process.env[feature] !== "false";
  }

  // Else, if we're in dev mode, assume the feature to be enabled.
  if (process.env.ENABLE_ALL_FEATURES === "true") {
    return true;
  }

  const session = await parseRequestSession(request);

  // Not all session types have an email address associated with them.
  if (session && "email" in session) {
    // For now, editframe employees have access to all features.
    if (session?.email?.endsWith("@editframe.com")) {
      return true;
    }
    if (session?.email === "hdb.encode_video2@internal") {
      return true;
    }
  }

  /** Here, we can create more complex evaluations with database queries etc. */
  switch (feature) {
  }

  // If the feature is generally available, it's enabled.
  if (generallyAvailableFeatures.has(feature)) {
    return true;
  }

  // Otherwise, the feature is disabled.
  return false;
};
