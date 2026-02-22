import { describe, test, expect } from "vitest";
import { subscriptionFromQuery } from "./subscriptionFromQuery";
import type { DocumentNode } from "graphql";

function makeQueryDoc(fields: string[]): DocumentNode {
  return {
    kind: "Document",
    definitions: [
      {
        kind: "OperationDefinition",
        operation: "query" as const,
        name: { kind: "Name", value: "TestQuery" },
        variableDefinitions: [],
        directives: [],
        selectionSet: {
          kind: "SelectionSet",
          selections: fields.map((name) => ({
            kind: "Field",
            name: { kind: "Name", value: name },
            arguments: [],
            directives: [],
            selectionSet: {
              kind: "SelectionSet",
              selections: [{ kind: "Field", name: { kind: "Name", value: "id" }, arguments: [], directives: [] }],
            },
          })),
        },
      },
    ],
  } as unknown as DocumentNode;
}

describe("subscriptionFromQuery", () => {
  test("converts operation kind from query to subscription", () => {
    const query = makeQueryDoc(["result"]);
    const subscription = subscriptionFromQuery(query as any);
    const opDef = subscription.definitions.find((d) => d.kind === "OperationDefinition") as any;
    expect(opDef.operation).toBe("subscription");
  });

  test("appends Subscription to operation name", () => {
    const query = makeQueryDoc(["result"]);
    const subscription = subscriptionFromQuery(query as any);
    const opDef = subscription.definitions.find((d) => d.kind === "OperationDefinition") as any;
    expect(opDef.name.value).toBe("TestQuerySubscription");
  });

  test("does not modify the original query document", () => {
    const query = makeQueryDoc(["result"]);
    subscriptionFromQuery(query as any);
    const opDef = query.definitions.find((d) => d.kind === "OperationDefinition") as any;
    expect(opDef.operation).toBe("query");
    expect(opDef.name.value).toBe("TestQuery");
  });

  test("throws when query has multiple top-level fields (invalid for subscriptions)", () => {
    const query = makeQueryDoc(["page_info", "rows"]);
    expect(() => subscriptionFromQuery(query as any)).toThrow(
      /subscription.*one top.level field/i,
    );
  });
});
