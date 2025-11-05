import * as clientGQL from "@/graphql.client/userClient";
import { useEffect, useState } from "react";
import type { AnyVariables, OperationResult } from "@urql/core";
import type { ProgressiveQueryDescriptor } from "./progressiveQuery";
import { subscriptionFromQuery } from "./subscriptionFromQuery";

export function useSubscriptionForQuery<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  token: string,
  descriptor: ProgressiveQueryDescriptor<Data, Variables>,
  variables: Variables,
  initialData: Pick<OperationResult<Data, Variables>, "data" | "error">,
) {
  const [result, setResult] =
    useState<Pick<OperationResult<Data, Variables>, "data" | "error">>(
      initialData,
    );

  useEffect(() => {
    const subscription = clientGQL
      .subscribeAs(
        token,
        descriptor.role,
        subscriptionFromQuery(descriptor.query),
        variables,
      )
      .subscribe((result) => {
        setResult(result);
      });

    return () => {
      subscription.unsubscribe();
    };
  }, [descriptor.query, ...Object.entries(variables ?? {}).flat()]);

  return result;
}
