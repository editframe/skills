import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll } from "vitest";

export const useMSW = () => {
  const server = setupServer();
  beforeAll(() => {
    server.listen();
    process.env.EF_TOKEN = "ef_SECRET_TOKEN";
    process.env.EF_HOST = "http://localhost:3000";
  });
  afterAll(() => server.close());
  afterEach(() => server.resetHandlers());
  return server;
};
