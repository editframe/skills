import {
  createUnprocessedFileFromPath,
  getIsobmffProcessInfo,
  getIsobmffProcessProgress,
  processIsobmffFile,
  uploadUnprocessedFile,
} from "@editframe/api/node";
import { program } from "commander";
import ora from "ora";
import { getClient } from "../utils/index.js";
import { withSpinner } from "../utils/withSpinner.js";

program
  .command("process-file <file>")
  .description("Upload a audio/video to Editframe for processing.")
  .action(async (path: string) => {
    const client = getClient();

    const unprocessedFile = await withSpinner(
      "Creating unprocessed file record",
      () => createUnprocessedFileFromPath(client, path),
    );

    const upload = await uploadUnprocessedFile(client, unprocessedFile, path);
    const uploadSpinner = ora("Uploading file");

    for await (const event of upload) {
      uploadSpinner.text = `Uploading file: ${(100 * event.progress).toFixed(2)}%`;
    }
    uploadSpinner.succeed("Upload complete");
    const processorRecord = await withSpinner(
      "Marking for processing",
      async () => await processIsobmffFile(client, unprocessedFile.id),
    );

    const processSpinner = ora("Waiting for processing to complete");
    processSpinner.start();
    const progress = await getIsobmffProcessProgress(
      client,
      processorRecord.id,
    );

    for await (const event of progress) {
      if (event.type === "progress") {
        processSpinner.text = `Processing: ${(100 * event.data.progress).toFixed(2)}%`;
      } else if (event.type === "complete") {
        processSpinner.succeed("Processing complete");
      }
    }

    const info = await getIsobmffProcessInfo(client, processorRecord.id);

    console.log("Processed file info");
    console.log(info);
  });
