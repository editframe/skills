#!/usr/bin/env tsx
// Dependency graph generator
// Usage: deps [--workspace=elements|telecine|all] [--format=text|json|mermaid]

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DepNode {
  name: string;
  version?: string;
  internal: string[];   // @editframe/* cross-references
  external: string[];   // third-party dependencies
}

function readPackageJson(pkgPath: string): any | null {
  try {
    return JSON.parse(readFileSync(pkgPath, 'utf-8'));
  } catch {
    return null;
  }
}

function allDeps(pkg: any): string[] {
  return [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
  ].filter((v, i, a) => a.indexOf(v) === i);
}

function buildNode(moduleName: string, pkgPath: string): DepNode | null {
  const pkg = readPackageJson(pkgPath);
  if (!pkg) return null;
  const deps = allDeps(pkg);
  return {
    name: moduleName,
    version: pkg.version,
    internal: deps.filter((d) => d.startsWith('@editframe/')),
    external: deps.filter((d) => !d.startsWith('@editframe/')),
  };
}

function main() {
  const args = process.argv.slice(2);
  const workspaceArg = args.find((a) => a.startsWith('--workspace='));
  const formatArg = args.find((a) => a.startsWith('--format='));
  const workspace = (workspaceArg?.split('=')[1] ?? 'all') as 'elements' | 'telecine' | 'all';
  const format = (formatArg?.split('=')[1] ?? 'text') as 'text' | 'json' | 'mermaid';

  const graph: DepNode[] = [];

  // Elements: auto-discover packages/*/package.json
  if (workspace === 'elements' || workspace === 'all') {
    const packagesDir = join(__dirname, '..', 'elements', 'packages');
    try {
      const pkgDirs = readdirSync(packagesDir, { withFileTypes: true })
        .filter((e) => e.isDirectory())
        .map((e) => e.name);
      for (const dir of pkgDirs) {
        const node = buildNode(`@editframe/${dir}`, join(packagesDir, dir, 'package.json'));
        if (node) graph.push(node);
      }
    } catch {
      // elements not present
    }
  }

  // Telecine: monolithic package
  if (workspace === 'telecine' || workspace === 'all') {
    const node = buildNode('@telecine/source', join(__dirname, '..', 'telecine', 'package.json'));
    if (node) graph.push(node);
  }

  if (format === 'json') {
    console.log(JSON.stringify(graph, null, 2));
    return;
  }

  if (format === 'mermaid') {
    console.log('graph TD;');
    for (const node of graph) {
      const id = (name: string) => `"${name}"`;
      // Show internal cross-references only (external would make a very noisy graph)
      for (const dep of node.internal) {
        console.log(`  ${id(node.name)} --> ${id(dep)};`);
      }
    }
    // Nodes with no internal deps still need to appear
    for (const node of graph) {
      if (node.internal.length === 0) {
        console.log(`  "${node.name}";`);
      }
    }
    return;
  }

  // text: show internal DAG prominently, external as summary count
  for (const node of graph) {
    const ver = node.version ? ` (${node.version})` : '';
    console.log(chalk_bold(node.name) + ver);
    if (node.internal.length > 0) {
      for (const dep of node.internal) {
        console.log(`  ↳ ${dep}`);
      }
    }
    console.log(`  ${node.external.length} external deps`);
    console.log('');
  }
}

// Minimal chalk-free bold for text output
function chalk_bold(s: string): string {
  return `\x1b[1m${s}\x1b[0m`;
}

main();
