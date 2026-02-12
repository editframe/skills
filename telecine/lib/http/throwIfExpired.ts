type Timestampish = string | Date | null | undefined;

export function throwIfExpired(expires_at: Timestampish): void {
  if (expires_at == null) return;

  const expiresDate =
    expires_at instanceof Date ? expires_at : new Date(expires_at);

  if (expiresDate.getTime() < Date.now()) {
    throw new Response(
      JSON.stringify({
        error: "file_expired",
        expires_at: expiresDate.toISOString(),
        message:
          "This file expired and is no longer available for download.",
      }),
      {
        status: 410,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
}
