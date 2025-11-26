import { parseRequestSession } from "./session";
import { validateUrlToken } from "./validateUrlToken";
import { data } from "react-router";

export const requireAPIToken = async (request: Request) => {
  const session = await parseRequestSession(request);
  if (!session) {
    throw data({ message: "Invalid or expired API token" }, { status: 401 });
  }

  if (
    session.type !== "api" &&
    session.type !== "url" &&
    session.type !== "anonymous_url"
  ) {
    throw data({ message: "Invalid or expired API token" }, { status: 401 });
  }

  switch (session.type) {
    case "api": {
      if (session.expired_at && new Date(session.expired_at) < new Date()) {
        throw data(
          { message: "Invalid or expired API token" },
          { status: 401 },
        );
      }
      return session;
    }
    case "url": {
      const validation = validateUrlToken(session, request.url);
      if (!validation.isValid) {
        throw data(
          { message: "Invalid or expired API token" },
          { status: 401 },
        );
      }
      return session;
    }
    case "anonymous_url": {
      const validation = validateUrlToken(session, request.url);
      if (!validation.isValid) {
        throw data(
          { message: "Invalid or expired API token" },
          { status: 401 },
        );
      }
      return session;
    }
  }
};
