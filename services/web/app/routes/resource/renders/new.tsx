import type { RenderOutputConfiguration } from "@editframe/api";
import React, { useEffect, useRef } from "react";
import { useState } from "react";
import { data, redirect } from "react-router";
import type { MetaFunction } from "react-router";
import { useNavigation, useSearchParams } from "react-router";
import { ClientOnly } from "remix-utils/client-only";
import { z } from "zod";

import { db } from "@/sql-client.server";
import { requireSession } from "@/util/requireSession.server";
import { Filmstrip, FitScale, FocusOverlay, Preview } from "@editframe/react";
import { Button } from "~/components/Button";
import { CodeEditor } from "~/components/CodeEditor";
import { Link } from "~/components/Link";
import { formFor } from "~/formFor";
import type { Route } from "./+types/new";

const CreateRenderSchema = z.object({
  html: z.string().min(1, "HTML cannot be blank"),
  output: z.enum(["mp4", "jpeg", "png", "webp"]),
});

const createRender = formFor(CreateRenderSchema);

export const meta: MetaFunction = () => {
  return [{ title: "New Render | Editframe" }];
};

const outputConfigMap: Record<string, RenderOutputConfiguration> = {
  mp4: {
    container: "mp4",
    video: {
      codec: "h264",
    },
    audio: {
      codec: "aac",
    },
  },
  jpeg: {
    container: "jpeg",
  },
  png: {
    container: "png",
  },
  webp: {
    container: "webp",
  },
};
export const action = async ({ request }: Route.ActionArgs) => {
  const { session } = await requireSession(request);
  const orgId = session.oid;
  if (!orgId) {
    throw new Error("No org provided");
  }

  const values = await createRender.parseFormData(request);

  if (!values.success) {
    return data(values.errors, { status: 400 });
  }

  const outputConfig = outputConfigMap[values.data.output];
  const { id: renderId } = await db
    .insertInto("video2.renders")
    .values({
      org_id: orgId,
      creator_id: session.uid,
      api_key_id: null,
      html: values.data.html,
      status: "created",
      strategy: "v1",
      fps: 30,
      output_config: outputConfig,
      metadata: {},
      work_slice_ms: Number.parseInt(process.env.WORK_SLICE_MS || "4000", 10),
    })
    .returning("id")
    .executeTakeFirstOrThrow();

  return redirect(`/resource/renders/${renderId}?org=${orgId}`);
};

const STARTER_HTML = /* html */ `<ef-timegroup
  mode="fixed"
  duration="5s"
  class="aspect-[1/1] w-[500px] h-[500px]  text-pink-400 bg-black flex items-center justify-center"
>
  <h1 class="text-5xl">Hello World</h1>
</ef-timegroup>`;

export default function NewRender() {
  const id = React.useId();
  const navigation = useNavigation();
  const submitting = navigation.state === "submitting";
  const contentsRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState(STARTER_HTML);

  const [params] = useSearchParams();
  const orgId = params.get("org");
  if (!orgId) {
    throw new Error("No org provided");
  }

  useEffect(() => {
    if (!contentsRef.current) {
      return;
    }
    contentsRef.current.innerHTML = html;
  }, [html]);

  return (
    <div className="flex gap-8 h-full">
      <div className="w-1/2">
        <Preview id={id} className="h-full w-full grid grid-rows-[1.5fr_1fr]">
          <div className="flex items-center justify-center overflow-hidden bg-slate-300 min-h-0">
            <ClientOnly>
              {() => (
                <FitScale>
                  <div
                    className="contents"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                  <FocusOverlay />
                </FitScale>
              )}
            </ClientOnly>
          </div>
          <div className="min-h-0">
            <Filmstrip autoScale className="w-full h-full" />
          </div>
        </Preview>
      </div>

      <div className="w-1/2">
        <createRender.Form>
          <div className="space-y-12">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  HTML Content
                </label>
                <ClientOnly>
                  {() => (
                    <>
                      <CodeEditor
                        code={html}
                        onChange={(newCode) => setHtml(newCode || "")}
                        className="border border-gray-300"
                        language="html"
                        height={400}
                      />
                      <createRender.HiddenInput field="html" value={html} />
                    </>
                  )}
                </ClientOnly>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <createRender.Select
                field="output"
                label="Output"
                options={[
                  { value: "mp4", label: "MP4" },
                  { value: "jpeg", label: "JPEG (first frame)" },
                  { value: "png", label: "PNG (first frame)" },
                  { value: "webp", label: "WebP (first frame)" },
                ]}
              />
            </div>
          </div>

          <div className="flex justify-start items-center gap-6 mt-6">
            <Button
              mode="primary"
              type="submit"
              loading={submitting}
              aria-label="Create render"
            >
              {submitting ? "Creating..." : "Create render"}
            </Button>
            <Link to="/resource/renders">Cancel</Link>
          </div>
        </createRender.Form>
      </div>
    </div>
  );
}
