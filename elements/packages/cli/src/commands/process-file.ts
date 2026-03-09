import { upload, getFileProcessingProgress, getFileDetail } from "@editframe/api/node";
import { program } from "commander";
import ora from "ora";
import { getClient } from "../utils/index.js";

program
  .command("process-file <file>")
  .description("Upload a audio/video to Editframe for processing.")
  .action(async (path: string) => {
    const client = getClient();

    const uploadSpinner = ora("Creating file and uploading").start();

    const { file, uploadIterator } = await upload(client, path);

    for await (const event of uploadIterator) {
      uploadSpinner.text = `Uploading file: ${(100 * event.progress).toFixed(2)}%`;
    }
    uploadSpinner.succeed("Upload complete");

    if (file.type !== "video") {
      console.log(`File type "${file.type}" does not require processing.`);
      console.log("File ID:", file.id);
      return;
    }

    const processSpinner = ora("Waiting for processing to complete");
    processSpinner.start();
    const progress = await getFileProcessingProgress(client, file.id);

    for await (const event of progress) {
      if (event.type === "progress") {
        processSpinner.text = `Processing: ${(100 * event.data.progress).toFixed(2)}%`;
      } else if (event.type === "complete") {
        processSpinner.succeed("Processing complete");
      }
    }

    const detail = await getFileDetail(client, file.id);

    console.log("Processed file info");
    console.log(detail);
  });
