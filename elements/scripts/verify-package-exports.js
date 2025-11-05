#!/usr/bin/env node
import { glob, stat } from "node:fs/promises";
import { join } from "node:path";
import packageJson from "../package.json" with { type: "json" };

// Function to get workspace packages
export const getWorkspacePackages = async () => {
  const workspacePackages = {};

  for (const dep of packageJson.workspaces) {
    for await (const entry of glob(dep)) {
      const packagePath = join(process.cwd(), entry, "package.json");
      const info = await stat(packagePath).catch(() => {
        console.info(`No package.json found in ${entry}. Skipping...`);
      });
      if (!info) continue;
      console.log(`Found package.json in ${packagePath}`);
      const { default: packageJson } = await import(packagePath, {
        with: { type: "json" },
      });
      workspacePackages[packageJson.name] = { packageJson, packagePath };
    }
  }

  return workspacePackages;
};

const packages = await getWorkspacePackages();

const missingExports = [];

for (const [name, pkg] of Object.entries(packages)) {
  if (!pkg.packageJson.exports) continue;
  for (const [exportName, exportEntry] of Object.entries(
    pkg.packageJson.exports,
  )) {
    if (typeof exportEntry === "string") continue;
    for (const [exportType, exportDeclaration] of Object.entries(exportEntry)) {
      for (const [exportKey, exportValue] of Object.entries(
        exportDeclaration,
      )) {
        const exportPath = join(pkg.packagePath, "..", exportValue);
        await stat(exportPath).catch(() => {
          missingExports.push({
            name,
            exportName,
            exportType,
            exportKey,
            exportPath,
          });
        });
      }
    }
  }
}

if (missingExports.length) {
  console.error("Missing exports");
  console.error(missingExports);
  process.exit(1);
}
