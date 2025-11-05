import debug from "debug";
import { StreamEventSource } from "./StreamEventSource.js";

const log = debug("ef:api:client");

export class Client {
  #token?: string;
  #efHost: string;

  constructor(token?: string, efHost = "https://editframe.dev") {
    log("Creating client with efHost", { efHost, tokenIsSet: !!token });
    this.#token = token;
    this.#efHost = efHost;

    // Only validate token if provided
    if (token) {
      const { apiKey, apiSecret } =
        token.match(/^(?<apiSecret>ef_[^_]+)_(?<apiKey>.+)$/)?.groups ?? {};

      if (!apiKey || !apiSecret) {
        throw new Error("Invalid token format. Must look like: ef_{}_{}");
      }
    }
  }

  authenticatedEventSource = async (path: string, init: RequestInit = {}) => {
    const abortController = new AbortController();

    const requestInit: RequestInit = {
      ...init,
    };

    // if (process.env.NODE_ENV !== "test") {
    requestInit.signal ??= abortController.signal;
    // }

    const response = await this.authenticatedFetch(path, requestInit);
    if (response.body === null) {
      throw new Error("Could not create event source. Response body is null.");
    }

    return new StreamEventSource(response.body, abortController);
  };

  authenticatedFetch = async (
    path: string,
    init: RequestInit & { duplex?: "half" } = {},
  ) => {
    init.headers ||= {};
    const url = new URL(path, this.#efHost);

    log(
      "Authenticated fetch",
      { url: url.toString(), init },
      this.#token
        ? "(Token will be added as Bearer token)"
        : "(Using session cookie)",
    );

    // Only add Authorization header if token is present
    if (this.#token) {
      Object.assign(init.headers, {
        Authorization: `Bearer ${this.#token}`,
      });
    }

    // Always include Content-Type
    Object.assign(init.headers, {
      "Content-Type": "application/json",
    });

    // Add credentials: 'include' for cookie support
    init.credentials = "include";

    try {
      const response = await fetch(url, init);

      log("Authenticated fetch response", response.status, response.statusText);
      return response;
    } catch (error) {
      console.error("Client authenticatedFetch error", url, error);
      throw error;
    }
  };
}
