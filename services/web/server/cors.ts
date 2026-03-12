const ALLOWED_ORIGINS = [
  "https://editframe.dev",
  "https://www.editframe.dev",
  "https://editframe.com",
  "https://www.editframe.com",
  "http://localhost:3000",
  "http://localhost:3001",
];

const PUBLIC_CORS_PATHS = ["/api/v1/telemetry"];

export function isOriginAllowed(origin: string | null, path: string): boolean {
  if (!origin) return true;

  if (PUBLIC_CORS_PATHS.some((p) => path.startsWith(p))) return true;

  if (ALLOWED_ORIGINS.includes(origin)) return true;

  if (
    process.env.NODE_ENV === "development" &&
    (origin.match(/^https?:\/\/[^:]+\.localhost(:\d+)?$/) ||
      origin.match(/^https?:\/\/web(:\d+)?$/))
  ) {
    return true;
  }

  return false;
}
