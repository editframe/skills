import type { Video2RenderFragments } from "@/sql-client.server/kysely-codegen";
import type { Selectable } from "kysely";
import { buildFragmentIds } from "./buildFragmentIds";

export function extractFragmentCompletionInfo(
  render: {
    duration_ms: number;
    work_slice_ms: number;
  },
  fragments: Selectable<Video2RenderFragments>[],
) {
  const completeFragmentIds = new Set<string>();
  const incompleteFragmentIds = new Set<string>();
  fragments.forEach((fragment) => {
    if (fragment.completed_at) {
      completeFragmentIds.add(fragment.segment_id!);
    } else {
      incompleteFragmentIds.add(fragment.segment_id!);
    }
  });

  // +1 for the init fragment
  const totalFragmentCount =
    1 + Math.ceil(render.duration_ms / render.work_slice_ms);
  const incompleteFragmentCount = totalFragmentCount - completeFragmentIds.size;

  return {
    incompleteFragmentCount,
    allFragmentIds: buildFragmentIds(render),
    completeFragmentIds,
  };
}
