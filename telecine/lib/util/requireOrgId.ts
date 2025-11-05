export const requireOrgId = (request: Request) => {
  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const orgId = searchParams.get("org");

  if (!orgId) {
    throw new Error("No org provided");
  }

  return orgId;
}