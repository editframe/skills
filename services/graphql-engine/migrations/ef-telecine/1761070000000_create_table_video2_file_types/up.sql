CREATE TABLE "video2"."file_types" ("value" text NOT NULL, "comment" text NOT NULL DEFAULT '', PRIMARY KEY ("value"));
INSERT INTO "video2"."file_types"("value", "comment") VALUES (E'video', E'Video or audio files processed via ISOBMFF'), (E'image', E'Image files'), (E'caption', E'Caption or subtitle files');
