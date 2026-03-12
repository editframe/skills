import type { TadaDocumentNode } from "gql.tada";

export function subscriptionFromQuery<QueryType, Variables>(
  query: TadaDocumentNode<QueryType, Variables>,
) {
  for (const d of query.definitions) {
    if (d.kind === "OperationDefinition") {
      const topLevelCount = d.selectionSet.selections.length;
      if (topLevelCount > 1) {
        throw new Error(
          `subscriptionFromQuery: subscription operations must select one top-level field, but this query selects ${topLevelCount}. Wrap all fields under a single top-level aggregate or relationship field.`,
        );
      }
    }
  }

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
