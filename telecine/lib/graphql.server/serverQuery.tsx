import {
  type HasuraSessionInfo,
  signHasuraJwtForSession,
} from "@/util/signJwtForSession.server";
import * as serverGQL from "@/graphql.server";
import type { AnyVariables } from "@urql/core";
import type { ProgressiveQueryDescriptor } from "../graphql.client/progressiveQuery";

export async function serverQuery<
  Data = any,
  Variables extends AnyVariables = AnyVariables,
>(
  sessionInfo: HasuraSessionInfo,
  descriptor: ProgressiveQueryDescriptor<Data, Variables>,
  variables: Variables,
) {
  const token = signHasuraJwtForSession(sessionInfo);
  const result = await serverGQL.queryAs(
    sessionInfo,
    descriptor.role,
    descriptor.query,
    variables,
  );
  return { result, token };
}
