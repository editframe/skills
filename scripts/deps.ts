#!/usr/bin/env tsx
// Dependency graph generator
// Usage: deps [--workspace=elements|telecine|all] [--format=text|json|mermaid]

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface DepNode {
  name: string;
  version?: string;
  children: string[];
}

function addPackageJson(pkgPath: string, moduleName: string, graph: DepNode[]) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    graph.push({
      name: moduleName,
      version: pkg.version,
      children: [
        ...Object.keys(pkg.dependencies || {}),
        ...Object.keys(pkg.devDependencies || {}),
      ].filter((v, i, a) => a.indexOf(v) === i),
    });
  } catch (e) {
    // ignore missing packages
  }
}

function main() {
  const args = process.argv.slice(2);
  const workspaceArg = args.find(a => a.startsWith('--workspace='));
  const formatArg = args.find(a => a.startsWith('--format='));
  const workspace = (workspaceArg?.split('=')[1] as any) || 'all';
  const format = (formatArg?.split('=')[1] as any) || 'text';

  const graph: DepNode[] = [];

  // Elements packages
  if (workspace === 'elements' || workspace === 'all') {
    const elementsPkgs = ['api', 'assets', 'cli', 'create', 'elements', 'react', 'vite-plugin'];
    for (const pkg of elementsPkgs) {
      addPackageJson(join(__dirname, '..', 'elements', 'packages', pkg, 'package.json'), `@editframe/${pkg}`, graph);
    }
  }

  // Telecine monolithic
  if (workspace === 'telecine' || workspace === 'all') {
    addPackageJson(join(__dirname, '..', 'telecine', 'package.json'), '@telecine/source', graph);
  }

  // Output
  if (format === 'json') {
    console.log(JSON.stringify(graph, null, 2));
  } else if (format === 'mermaid') {
    console.log('graph TD;');
    for (const node of graph) {
      for (const child of node.children) {
        console.log(`  ${node.name} --> ${child};`);
      }
    }
  } else {
    // text
    for (const node of graph) {
      console.log(`${node.name}${node.version ? ` (${node.version})` : ''}`);
      for (const child of node.children) {
        console.log(`  └─ ${child}`);
      }
      console.log('');
    }
  }
}

main();
