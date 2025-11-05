import type { TadaDocumentNode } from "gql.tada";

export function subscriptionFromQuery<QueryType, Variables>(
  query: TadaDocumentNode<QueryType, Variables>,
) {
  const subscription = structuredClone(query);
  subscription.definitions.forEach((d) => {
    if (d.kind === "OperationDefinition") {
      // @ts-expect-error - This is a writeonly field, but we're intentionally changing it to create a subscription from a query.
      d.operation = "subscription";
      // @ts-expect-error - Same as above.
      d.name.value += "Subscription";
    }
  });
  return subscription;
}
