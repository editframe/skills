import { glob, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import packageJson from "../package.json" with { type: "json" };

const ELEMENTS_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// Function to get workspace packages
export const getWorkspacePackages = async () => {
  const workspacePackages = {};

  for (const dep of packageJson.workspaces) {
    for await (const entry of glob(dep)) {
      const packagePath = join(ELEMENTS_ROOT, entry, "package.json");
      const info = await stat(packagePath).catch(() => {
        console.warn(`No package.json found in ${entry}. Skipping...`);
      });
      if (!info) continue;
      console.error(`Found package.json in ${packagePath}`);
      const { default: packageJson } = await import(packagePath, {
        with: { type: "json" },
      });
      workspacePackages[packageJson.name] = { packageJson, packagePath };
    }
  }

  return workspacePackages;
};

// Function to create dependency graph
const createDependencyGraph = async () => {
  const workspacePackages = await getWorkspacePackages();
  const dependencyGraph = {};

  const addDependencies = (packageName, seen) => {
    if (seen.has(packageName)) return; // Prevent infinite loops
    seen.add(packageName);

    const dependencies =
      workspacePackages[packageName]?.packageJson.dependencies;
    const devDependencies =
      workspacePackages[packageName]?.packageJson.devDependencies;
    if (!dependencies) return;

    if (!dependencyGraph[packageName]) {
      dependencyGraph[packageName] = new Set();
    }

    for (const dep in dependencies) {
      if (workspacePackages[dep]) {
        dependencyGraph[packageName].add(dep);
        addDependencies(dep, seen);
      }
    }

    for (const dep in devDependencies) {
      if (workspacePackages[dep]) {
        dependencyGraph[packageName].add(dep);
        addDependencies(dep, seen);
      }
    }
  };

  for (const packageName in workspacePackages) {
    addDependencies(packageName, new Set());
  }

  return dependencyGraph;
};

// Function to generate Mermaid format
const generateMermaidFile = (dependencyGraph, outputPath) => {
  let mermaidContent = "```mermaid\n";
  mermaidContent += "graph TD\n";

  const labels = {};
  let n = 0;
  for (const [pkg, _deps] of Object.entries(dependencyGraph)) {
    labels[pkg] = ++n;
  }

  for (const [pkg, deps] of Object.entries(dependencyGraph)) {
    for (const dep of deps) {
      mermaidContent += `  ${labels[pkg]}["${pkg}"] -- depends on --> ${labels[dep]}["${dep}"]\n`;
    }
  }

  mermaidContent += "```\n";

  return writeFile(outputPath, mermaidContent, "utf-8");
};

// Function to update dependencies to the latest version in the workspace
const updateDependenciesToLatest = async (workspacePackages) => {
  for (const [pkgName, { packageJson, packagePath }] of Object.entries(
    workspacePackages,
  )) {
    console.error(`Updating dependencies for ${pkgName}`);
    const dependencies = packageJson.dependencies || {};

    for (const depName in dependencies) {
      if (workspacePackages[depName]) {
        dependencies[depName] = workspacePackages[depName].packageJson.version;
      }
    }

    packageJson.dependencies = dependencies;

    await writeFile(packagePath, JSON.stringify(packageJson, null, 2), "utf-8");
    console.error(`Updated dependencies for ${pkgName}`);
  }
};

const topologicalSort = (graph) => {
  const sorted = [];
  const visited = new Set();

  const visit = (node, ancestors = new Set()) => {
    if (ancestors.has(node)) {
      throw new Error(
        `Circular dependency detected: ${[...ancestors, node].join(" -> ")}`,
      );
    }

    if (!visited.has(node)) {
      ancestors.add(node);
      for (const neighbor of graph[node] || []) {
        visit(neighbor, ancestors);
      }
      ancestors.delete(node);
      visited.add(node);
      sorted.push(node);
    }
  };

  for (const node in graph) {
    visit(node);
  }

  return sorted;
};

const updateTemplateDependencies = async () => {
  const templates = await readdir(
    join(ELEMENTS_ROOT, "packages", "create", "src", "templates"),
  );
  for (const template of templates) {
    const dirPath = join(
      ELEMENTS_ROOT,
      "packages",
      "create",
      "src",
      "templates",
      template,
    );
    const stats = await stat(dirPath);
    if (stats.isDirectory() === false) continue;

    const packagePath = join(dirPath, "package.json");
    const { default: packageJson } = await import(packagePath, {
      with: { type: "json" },
    });

    const dependencies = packageJson.dependencies || {};
    const workspacePackages = await getWorkspacePackages();

    for (const depName in dependencies) {
      if (workspacePackages[depName]) {
        dependencies[depName] = workspacePackages[depName].packageJson.version;
      }
    }

    packageJson.dependencies = dependencies;

    await writeFile(packagePath, JSON.stringify(packageJson, null, 2), "utf-8");
  }
};

const command = process.argv[2];
switch (command) {
  case "update-dependencies": {
    console.error(
      "Updating dependencies to the latest version in the workspace...",
    );
    const workspacePackages = await getWorkspacePackages();
    await updateDependenciesToLatest(workspacePackages);
    await updateTemplateDependencies();
    break;
  }
  case "sorted": {
    const dependencyGraph = await createDependencyGraph();
    const sorted = topologicalSort(dependencyGraph);
    // Using console.log because this is intended to be piped to other commands
    console.log(sorted.join("\n"));
    break;
  }
  case "graph": {
    const dependencyGraph = await createDependencyGraph();
    // Using console.log because this is intended to be piped to other commands
    console.log(dependencyGraph);
    break;
  }
  case "mermaid": {
    console.error("Writing dependency graph to deps.md...");
    const dependencyGraph = await createDependencyGraph();
    await generateMermaidFile(dependencyGraph, "deps.md");
    break;
  }
  default: {
    console.error(`Unknown command: ${command}`);
    process.exit(1);
  }
}
