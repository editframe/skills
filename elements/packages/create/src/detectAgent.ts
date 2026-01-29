import { access } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

/**
 * Detect which AI coding agents are installed on the system.
 * Returns an array of detected agent names.
 */
export async function detectInstalledAgents(): Promise<string[]> {
  const detected: string[] = [];

  // Check for Cursor (project-level .cursor directory)
  try {
    await access(path.join(process.cwd(), ".cursor"));
    detected.push("cursor");
  } catch {
    // Not found
  }

  // Check for VS Code / Copilot (.vscode directory or .github/copilot)
  try {
    await access(path.join(process.cwd(), ".vscode"));
    detected.push("vscode");
  } catch {
    try {
      await access(path.join(process.cwd(), ".github/copilot"));
      detected.push("vscode");
    } catch {
      // Not found
    }
  }

  // Check for Claude Code (user-level ~/.claude directory)
  try {
    await access(path.join(os.homedir(), ".claude"));
    detected.push("claude");
  } catch {
    // Not found
  }

  // Check for Windsurf (user-level ~/.windsurf directory)
  try {
    await access(path.join(os.homedir(), ".windsurf"));
    detected.push("windsurf");
  } catch {
    // Not found
  }

  return detected;
}

/**
 * Get agent choices sorted by detection (detected agents first, then others).
 */
export async function getAgentChoices() {
  const detected = await detectInstalledAgents();

  // Define all available agents
  const allAgents = [
    { title: "Cursor", value: "cursor" },
    { title: "VS Code Copilot", value: "vscode" },
    { title: "Claude Code", value: "claude" },
    { title: "Windsurf", value: "windsurf" },
    { title: "All agents", value: "all" },
    { title: "Skip", value: "skip" },
  ];

  // Sort: detected agents first, then others
  const sorted = allAgents.sort((a, b) => {
    const aDetected = detected.includes(a.value);
    const bDetected = detected.includes(b.value);

    if (aDetected && !bDetected) return -1;
    if (!aDetected && bDetected) return 1;
    return 0;
  });

  return sorted;
}
