#!/usr/bin/env node
import { glob, readFile, stat } from "node:fs/promises";
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

// Function to extract imports from a file
async function extractImports(filePath) {
  const content = await readFile(filePath, "utf-8");
  const imports = new Set();

  // Match import statements (both ESM and require)
  const importRegex =
    /(?:import\s+(?:.*\s+from\s+)?['"]([^'"]+)['"])|(?:require\(['"]([^'"]+)['"]\))/g;

  for (const match of content.matchAll(importRegex)) {
    const importPath = match[1] || match[2];
    // Only include package imports (not relative paths)
    if (!importPath.startsWith(".") && !importPath.startsWith("/")) {
      // Extract package name (handle subpath imports like '@scope/pkg/subpath')
      const packageName = importPath.startsWith("@")
        ? importPath.split("/").slice(0, 2).join("/")
        : importPath.split("/")[0];
      imports.add(packageName);
    }
  }

  return imports;
}

const packages = await getWorkspacePackages();
const missingDependencies = [];

for (const [name, pkg] of Object.entries(packages)) {
  const allDeps = {
    // We only count dependencies, not dev/peer dependencies because those are not
    // always installed downstream.
    ...pkg.packageJson.dependencies,
  };

  const pkgDir = join("packages", name.replace("@editframe/", ""), "src");
  // Scan all JS/TS files in the package
  const sourceFiles = await glob("**/*.{js,jsx,ts,tsx}", {
    cwd: pkgDir,
    ignore: ["node_modules/**", "dist/**", "build/**"],
  });

  const foundImports = new Set();
  for await (const file of sourceFiles) {
    if (file.endsWith("test.ts")) continue;
    if (file.endsWith("browsertest.ts")) continue;
    if (file.endsWith("browsertest.tsx")) continue;
    if (file.includes("templates/")) continue;
    if (file.includes("profiling/")) continue;
    console.log("Checking for imports in", file);
    const filePath = join(pkgDir, file);
    const fileImports = await extractImports(filePath);
    for (const imp of fileImports) {
      foundImports.add(imp);
    }
  }
  console.log("In package", name);
  console.log("Found imports", foundImports);
  console.log("All deps", Object.keys(allDeps));

  // Check for missing dependencies
  for (const importedPackage of foundImports) {
    if (importedPackage.startsWith("node:")) continue;
    if (!allDeps[importedPackage] && importedPackage !== name) {
      missingDependencies.push(
        `${name}: missing dependency "${importedPackage}" in package.json`,
      );
    }
  }
}

if (missingDependencies.length) {
  console.error(
    `Missing dependencies found:\n${missingDependencies.join("\n")}`,
  );
  process.exit(1);
} else {
  console.log("All dependencies are properly declared in package.json files");
}
