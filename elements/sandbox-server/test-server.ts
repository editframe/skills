#!/usr/bin/env npx tsx
/**
 * Test server to verify sandbox routes work
 * Run: npx tsx sandbox-server/test-server.ts
 */

import { createSandboxServer } from "./index.js";

const port = parseInt(process.env.PORT || "4321", 10);
console.log(`Starting test sandbox server on port ${port}...`);
console.log(`Access at: http://localhost:${port}/sandbox/`);

createSandboxServer(port);
