import type { LoaderFunction, LoaderFunctionArgs } from "react-router";
import { trace, SpanStatusCode } from "@opentelemetry/api";
import {
  type APISessionInfo,
  parseRequestSession,
  type TokenLikeSessionInfo,
  type URLSessionInfo,
  type AnonymousURLSessionInfo,
} from "./session";
import { data } from "react-router";
import { validateUrlToken } from "./validateUrlToken";

export type LoaderFunctionArgsWithAPISession = LoaderFunctionArgs & {
  session: APISessionInfo;
};

export type LoaderWithAPISession = (
  args: LoaderFunctionArgsWithAPISession,
) => ReturnType<LoaderFunction>;

export type LoaderFunctionArgsWithURLSession = LoaderFunctionArgs & {
  session: URLSessionInfo;
};

export type LoaderWithURLSession = (
  args: LoaderFunctionArgsWithURLSession,
) => ReturnType<LoaderFunction>;

export type LoaderFunctionArgsWithAnonymousURLSession = LoaderFunctionArgs & {
  session: AnonymousURLSessionInfo;
};

export type LoaderWithAnonymousURLSession = (
  args: LoaderFunctionArgsWithAnonymousURLSession,
) => ReturnType<LoaderFunction>;

export function requireApiToken<
  LoaderType extends
    | LoaderWithAPISession
    | LoaderWithURLSession
    | LoaderWithAnonymousURLSession,
>(loader: LoaderType) {
  return async (args: LoaderFunctionArgs) => {
    const activeSpan = trace.getActiveSpan();
    try {
      const session = await parseRequestSession(args.request);
      if (!session) {
        activeSpan?.setAttributes({
          "auth.authenticated": false,
          "auth.type": "api",
          "auth.error": "missing_token",
        });
        return data(
          { message: "Invalid or expired API token" },
          { status: 401 },
        );
      }

      if (
        session.type !== "api" &&
        session.type !== "url" &&
        session.type !== "anonymous_url"
      ) {
        activeSpan?.setAttributes({
          "auth.authenticated": false,
          "auth.type": session.type,
          "auth.error": "invalid_token_type",
        });
        return data(
          { message: "Invalid or expired API token" },
          { status: 401 },
        );
      }

      switch (session?.type) {
        case "api": {
          if (session.expired_at && new Date(session.expired_at) < new Date()) {
            activeSpan?.setAttributes({
              "auth.authenticated": false,
              "auth.type": "api",
              "auth.error": "token_expired",
              "enduser.id": session.uid,
              "enduser.email": session.email,
            });
            return data(
              { message: "Invalid or expired API token" },
              { status: 401 },
            );
          }
          activeSpan?.setAttributes({
            "auth.authenticated": true,
            "auth.type": "api",
            "enduser.id": session.uid,
            "enduser.email": session.email,
          });
          return (loader as LoaderWithAPISession)({
            ...args,
            session,
          }) as ReturnType<LoaderWithAPISession>;
        }
        case "url": {
          const validation = validateUrlToken(session, args.request.url);
          if (!validation.isValid) {
            activeSpan?.setAttributes({
              "auth.authenticated": false,
              "auth.type": "url",
              "auth.error": "url_mismatch",
              "auth.request_url": validation.errorDetails!.requestUrl,
              "auth.signed_url": validation.errorDetails!.signedUrl,
              "enduser.id": session.uid,
            });
            return data(
              {
                message: validation.errorDetails!.message,
              },
              { status: 401 },
            );
          }
          activeSpan?.setAttributes({
            "auth.authenticated": true,
            "auth.type": "url",
            "auth.request_url": args.request.url,
          });
          return (loader as LoaderWithURLSession)({
            ...args,
            session,
          }) as ReturnType<LoaderWithURLSession>;
        }
        case "anonymous_url": {
          const validation = validateUrlToken(session, args.request.url);
          if (!validation.isValid) {
            activeSpan?.setAttributes({
              "auth.authenticated": false,
              "auth.type": "anonymous_url",
              "auth.error": "url_mismatch",
              "auth.request_url": validation.errorDetails!.requestUrl,
              "auth.signed_url": validation.errorDetails!.signedUrl,
            });
            return data(
              {
                message: validation.errorDetails!.message,
              },
              { status: 401 },
            );
          }
          activeSpan?.setAttributes({
            "auth.authenticated": true,
            "auth.type": "anonymous_url",
            "auth.request_url": args.request.url,
          });
          return (loader as LoaderWithAnonymousURLSession)({
            ...args,
            session,
          }) as ReturnType<LoaderWithAnonymousURLSession>;
        }
      }
    } catch (error) {
      activeSpan?.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "API token error",
      });
      throw error;
    }
  };
}

export const requireCookieOrTokenSession = (
  loader: (
    args: LoaderFunctionArgs & {
      session: TokenLikeSessionInfo;
    },
  ) => ReturnType<LoaderFunction>,
) => {
  return async (args: LoaderFunctionArgs) => {
    const activeSpan = trace.getActiveSpan();
    try {
      const hasCookie = args.request.headers.has("cookie");
      activeSpan?.setAttributes({
        "auth.method": hasCookie ? "cookie" : "token",
      });

      if (hasCookie) {
        const session = await parseRequestSession(args.request);
        if (!session) {
          activeSpan?.setAttributes({
            "auth.authenticated": false,
            "auth.error": "invalid_cookie",
          });
          throw new Response(null, {
            status: 401,
            statusText:
              "Unauthorized. Requires a cookie session or API token as Bearer token in Authorizaiton Header",
          });
        }
        if (session.oid === undefined) {
          activeSpan?.setAttributes({
            "auth.authenticated": false,
            "auth.error": "missing_org_id",
          });
          throw new Response(null, {
            status: 401,
            statusText:
              "Unauthorized. Requires a cookie session with an org id specified.",
          });
        }

        activeSpan?.setAttributes({
          "auth.authenticated": true,
          "enduser.id": session.uid,
          "organization.id": session.oid,
        });

        return loader({
          ...args,
          session: {
            cid: session.type === "api" ? session.cid : null,
            uid: session.uid,
            oid: session.oid,
          },
        });
      }
      return requireApiToken(loader)(args);
    } catch (error) {
      activeSpan?.setStatus({
        code: SpanStatusCode.ERROR,
        message:
          error instanceof Error ? error.message : "Cookie/Token session error",
      });
      throw error;
    }
  };
};
