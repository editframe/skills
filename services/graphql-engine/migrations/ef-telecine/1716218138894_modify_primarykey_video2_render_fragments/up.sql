BEGIN TRANSACTION;
ALTER TABLE "video2"."render_fragments" DROP CONSTRAINT "render_fragments_pkey";

ALTER TABLE "video2"."render_fragments"
    ADD CONSTRAINT "render_fragments_pkey" PRIMARY KEY ("segment_id", "render_id");
COMMIT TRANSACTION;
