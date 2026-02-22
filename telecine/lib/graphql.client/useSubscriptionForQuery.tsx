import * as clientGQL from "@/graphql.client/userClient";
import { useEffect, useRef, useState } from "react";
import type { AnyVariables, OperationResult } from "@urql/core";
import type { ProgressiveQueryDescriptor } from "./progressiveQuery";
import { subscriptionFromQuery } from "./subscriptionFromQuery";

export function useSubscriptionForQuery<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
  CountData = any,
>(
  token: string,
  descriptor: ProgressiveQueryDescriptor<Data, Variables, CountData>,
  variables: Variables,
  initialData: Pick<OperationResult<Data, Variables>, "data" | "error">,
) {
  const [result, setResult] =
    useState<Pick<OperationResult<Data, Variables>, "data" | "error">>(
      initialData,
    );

  const countDataRef = useRef<CountData | undefined>(undefined);

  const variablesDep = Object.entries(variables ?? {}).flat();

  useEffect(() => {
    const rowsSubscription = clientGQL
      .subscribeAs(
        token,
        descriptor.role,
        subscriptionFromQuery(descriptor.query),
        variables,
      )
      .subscribe((incoming) => {
        setResult((prev) => {
          if (!descriptor.countQuery) return incoming;
          return {
            ...incoming,
            data:
              incoming.data !== undefined
                ? { ...incoming.data, ...countDataRef.current }
                : incoming.data,
          };
        });
      });

    if (!descriptor.countQuery) {
      return () => rowsSubscription.unsubscribe();
    }

    const countSubscription = clientGQL
      .subscribeAs(
        token,
        descriptor.role,
        subscriptionFromQuery(descriptor.countQuery),
        variables,
      )
      .subscribe((incoming) => {
        countDataRef.current = incoming.data;
        setResult((prev) => ({
          ...prev,
          data:
            prev.data !== undefined
              ? { ...prev.data, ...incoming.data }
              : prev.data,
        }));
      });

    return () => {
      rowsSubscription.unsubscribe();
      countSubscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [descriptor.query, descriptor.countQuery, ...variablesDep]);

  return result;
}
