import { describe, test, expect } from "vitest";
import { transcribe } from "./transcribe";
import path from "node:path";

describe.skip("transcribe", () => {
  const audioPath = path.join(
    __dirname,
    "..",
    "test-transcribe",
    "audio-sample.mp4",
  );
  test("it works", async () => {
    const json = await transcribe(audioPath, 0);
    expect(json).toEqual({
      word_segments: [
        { end: 0.5, start: 0.13, text: " Thanks" },
        { end: 0.74, start: 0.5, text: " for" },
        { end: 1.23, start: 0.74, text: " trying" },
        { end: 2, start: 1.23, text: " Editframe." },
        { end: 2.26, start: 2, text: " This" },
        { end: 2.39, start: 2.26, text: " is" },
        { end: 2.52, start: 2.39, text: " an" },
        { end: 2.85, start: 2.52, text: " audio" },
        { end: 3.11, start: 2.85, text: " file" },
        { end: 3.24, start: 3.11, text: " we" },
        { end: 3.73, start: 3.24, text: " created" },
        { end: 3.9, start: 3.73, text: " for" },
        { end: 4.1, start: 3.9, text: " our" },
        { end: 5, start: 4.1, text: " documentation." },
        { end: 5.26, start: 5, text: " We" },
        { end: 5.36, start: 5.26, text: " hope" },
        { end: 5.55, start: 5.36, text: " you" },
        { end: 5.85, start: 5.55, text: " enjoy" },
        { end: 6, start: 5.85, text: " it." },
      ],
      segments: [
        {
          end: 2,
          start: 0.13,
          text: " Thanks  for  trying  Editframe.",
          words: [
            { end: 0.5, start: 0.13, text: " Thanks" },
            { end: 0.74, start: 0.5, text: " for" },
            { end: 1.23, start: 0.74, text: " trying" },
            { end: 2, start: 1.23, text: " Editframe." },
          ],
        },
        {
          end: 3.9,
          start: 2,
          text: " This  is  an  audio  file  we  created  for",
          words: [
            { end: 2.26, start: 2, text: " This" },
            { end: 2.39, start: 2.26, text: " is" },
            { end: 2.52, start: 2.39, text: " an" },
            { end: 2.85, start: 2.52, text: " audio" },
            { end: 3.11, start: 2.85, text: " file" },
            { end: 3.24, start: 3.11, text: " we" },
            { end: 3.73, start: 3.24, text: " created" },
            { end: 3.9, start: 3.73, text: " for" },
          ],
        },
        {
          end: 5,
          start: 3.9,
          text: " our  documentation.",
          words: [
            { end: 4.1, start: 3.9, text: " our" },
            { end: 5, start: 4.1, text: " documentation." },
          ],
        },
        {
          end: 6,
          start: 5,
          text: " We  hope  you  enjoy  it.",
          words: [
            { end: 5.26, start: 5, text: " We" },
            { end: 5.36, start: 5.26, text: " hope" },
            { end: 5.55, start: 5.36, text: " you" },
            { end: 5.85, start: 5.55, text: " enjoy" },
            { end: 6, start: 5.85, text: " it." },
          ],
        },
      ],
    });
  }, 60_000);

  test("it applies time gaps", async () => {
    const json = await transcribe(audioPath, 60);
    expect(json).toEqual({
      word_segments: [
        { end: 60.5, start: 60.13, text: " Thanks" },
        { end: 60.74, start: 60.5, text: " for" },
        { end: 61.23, start: 60.74, text: " trying" },
        { end: 62, start: 61.23, text: " Editframe." },
        { end: 62.26, start: 62, text: " This" },
        { end: 62.39, start: 62.26, text: " is" },
        { end: 62.52, start: 62.39, text: " an" },
        { end: 62.85, start: 62.52, text: " audio" },
        { end: 63.11, start: 62.85, text: " file" },
        { end: 63.24, start: 63.11, text: " we" },
        { end: 63.73, start: 63.24, text: " created" },
        { end: 63.9, start: 63.73, text: " for" },
        { end: 64.1, start: 63.9, text: " our" },
        { end: 65, start: 64.1, text: " documentation." },
        { end: 65.26, start: 65, text: " We" },
        { end: 65.36, start: 65.26, text: " hope" },
        { end: 65.55, start: 65.36, text: " you" },
        { end: 65.85, start: 65.55, text: " enjoy" },
        { end: 66, start: 65.85, text: " it." },
      ],
      segments: [
        {
          end: 62,
          start: 60.13,
          text: " Thanks  for  trying  Editframe.",
          words: [
            { end: 60.5, start: 60.13, text: " Thanks" },
            { end: 60.74, start: 60.5, text: " for" },
            { end: 61.23, start: 60.74, text: " trying" },
            { end: 62, start: 61.23, text: " Editframe." },
          ],
        },
        {
          end: 63.9,
          start: 62,
          text: " This  is  an  audio  file  we  created  for",
          words: [
            { end: 62.26, start: 62, text: " This" },
            { end: 62.39, start: 62.26, text: " is" },
            { end: 62.52, start: 62.39, text: " an" },
            { end: 62.85, start: 62.52, text: " audio" },
            { end: 63.11, start: 62.85, text: " file" },
            { end: 63.24, start: 63.11, text: " we" },
            { end: 63.73, start: 63.24, text: " created" },
            { end: 63.9, start: 63.73, text: " for" },
          ],
        },
        {
          end: 65,
          start: 63.9,
          text: " our  documentation.",
          words: [
            { end: 64.1, start: 63.9, text: " our" },
            { end: 65, start: 64.1, text: " documentation." },
          ],
        },
        {
          end: 66,
          start: 65,
          text: " We  hope  you  enjoy  it.",
          words: [
            { end: 65.26, start: 65, text: " We" },
            { end: 65.36, start: 65.26, text: " hope" },
            { end: 65.55, start: 65.36, text: " you" },
            { end: 65.85, start: 65.55, text: " enjoy" },
            { end: 66, start: 65.85, text: " it." },
          ],
        },
      ],
    });
  }, 20_000);
});
