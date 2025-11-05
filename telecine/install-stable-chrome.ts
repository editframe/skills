import { spawnSync } from "node:child_process";

// Helper function to run commands and exit on failure
function runCommand(command: string, args: string[]) {
  console.log(`Running: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.error) {
    console.error(`Error executing ${command}: ${result.error.message}`);
    process.exit(1);
  }
  if (result.status !== 0) {
    console.error(
      `Command '${command}' failed with exit code ${result.status}`,
    );
    process.exit(result.status);
  }
  return result;
}

async function installStableChrome() {
  // Fetch Chrome versions data using native fetch API
  console.log("Fetching Chrome version information...");
  const versionsJsonUrl =
    "https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json";
  const response = await fetch(versionsJsonUrl);
  const versionsData = await response.json();

  const latestVersion = versionsData.channels.Stable;

  const downloadURL = latestVersion.downloads["chrome-headless-shell"].find(
    (spec: any) => spec.platform === "linux64",
  ).url;

  // Download the headless Chrome shell
  console.log(`Downloading Chrome headless shell from ${downloadURL}`);
  const tempFile = "/tmp/chrome-headless-shell.zip";
  runCommand("curl", ["-L", downloadURL, "-o", tempFile]);

  // Create target directory if it doesn't exist
  runCommand("mkdir", ["-p", "/root/chrome-headless-shell"]);

  // Extract the downloaded file to target directory
  console.log("Extracting to /root/chrome-headless-shell");
  runCommand("unzip", ["-o", tempFile, "-d", "/root/chrome-headless-shell"]);

  // Clean up the temp file
  runCommand("rm", [tempFile]);

  console.log("Chrome headless shell installation complete");
}

installStableChrome();
