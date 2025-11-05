import { graphql } from "@/graphql";
import { requireQueryAs } from "@/graphql.server/userClient";
import { db } from "@/sql-client.server";
import { requireSession } from "@/util/requireSession.server";
import { data, redirect } from "react-router";
import { z } from "zod";
import { formFor } from "~/formFor";

import { requireOrgId } from "@/util/requireOrgId";
import type { Route } from "./+types/ingest";

const processIsobmffForm = formFor(
  z.object({
    source_url: z.string().url(),
  }),
);

export const action = async ({ request }: Route.ActionArgs) => {
  const { session } = await requireSession(request);
  const orgId = requireOrgId(request);

  const formResult = await processIsobmffForm.parseFormData(request);
  if (!formResult.success) {
    return data(formResult.errors, { status: 400 });
  }

  await requireQueryAs(
    session,
    "org-editor",
    graphql(`
      query GetOrg ($id: uuid!) {
        result: orgs_by_pk(id: $id) {
          id
        }
      }
    `),
    { id: orgId },
  );

  const { id: jobId } = await db
    .insertInto("video2.process_isobmff")
    .values({
      org_id: orgId,
      creator_id: session.uid,
      source_type: "url",
      url: formResult.data.source_url,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return redirect(`/resource/process_isobmff/${jobId}`);
};

export default function IngestURL() {
  return (
    <div className="container py-10">
      <processIsobmffForm.Form>
        <h2 className="text-base font-semibold mb-2">Process ISOBMFF File</h2>
        <p className="text-sm mb-6">Enter the URL of the file to process.</p>

        <processIsobmffForm.Input
          field="source_url"
          type="url"
          label="Source URL"
          placeholder="Enter the source URL"
          required
        />

        <div className="mt-6 flex justify-end">
          <processIsobmffForm.Submit>Process File</processIsobmffForm.Submit>
        </div>
      </processIsobmffForm.Form>
    </div>
  );
}
