#!/usr/bin/env npx tsx
import { createServer } from "http";
import { readdir, readFile, stat } from "fs/promises";
import { join, dirname, relative } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RENDER_ROOT = join(__dirname, "../.."); // lib/queues/units-of-work/Render
const PORT = 3333;

interface Timing {
  totalMs?: number;
  renderMs?: number;
  avgSegmentMs?: number;
}

interface Metadata {
  renderMode?: string;
  canvasMode?: string;
  timing?: Timing;
  outputSizeBytes?: number;
  timestamp?: string;
  renderInfo?: { width: number; height: number; durationMs: number };
}

interface Technique {
  name: string;
  videos: string[];
  metadata?: Metadata;
}

interface Template {
  name: string;
  techniques: Technique[];
}

async function findTestRenderDirs(dir: string): Promise<string[]> {
  const results: string[] = [];
  async function scan(d: string) {
    const entries = await readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = join(d, entry.name);
      if (entry.name.endsWith(".test.renders")) {
        results.push(full);
      } else if (!entry.name.startsWith(".") && !entry.name.includes("node_modules")) {
        await scan(full);
      }
    }
  }
  await scan(dir);
  return results;
}

async function loadMetadata(artifactsPath: string): Promise<Metadata | undefined> {
  try {
    const metadataPath = join(artifactsPath, "metadata.json");
    const content = await readFile(metadataPath, "utf-8");
    return JSON.parse(content);
  } catch {
    return undefined;
  }
}

async function scanArtifacts(): Promise<Template[]> {
  const templates: Template[] = [];
  const testDirs = await findTestRenderDirs(RENDER_ROOT);

  for (const testDir of testDirs) {
    const templateName = relative(RENDER_ROOT, testDir).replace(".test.renders", "").replace(/\//g, " / ");
    const techniques: Technique[] = [];

    const variants = await readdir(testDir);
    for (const variant of variants) {
      if (variant.startsWith(".")) continue;
      const variantPath = join(testDir, variant);
      const s = await stat(variantPath);
      if (!s.isDirectory()) continue;

      const artifactsPath = join(variantPath, "artifacts");
      try {
        const files = await readdir(artifactsPath);
        const videos = files.filter(f => f.endsWith(".mp4")).map(f => relative(RENDER_ROOT, join(artifactsPath, f)));
        if (videos.length > 0) {
          const technique = variant.replace(/-[a-f0-9]{8}$/, "");
          const metadata = await loadMetadata(artifactsPath);
          techniques.push({ name: technique, videos, metadata });
        }
      } catch {}
    }

    if (techniques.length > 0) {
      techniques.sort((a, b) => {
        if (a.name.includes("baseline") || a.name.includes("server")) return -1;
        if (b.name.includes("baseline") || b.name.includes("server")) return 1;
        return a.name.localeCompare(b.name);
      });
      templates.push({ name: templateName, techniques });
    }
  }

  return templates.sort((a, b) => a.name.localeCompare(b.name));
}

function formatMs(ms?: number): string {
  if (ms === undefined) return "-";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function formatBytes(bytes?: number): string {
  if (bytes === undefined) return "-";
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatTimestamp(ts?: string): string {
  if (!ts) return "";
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "today";
  if (diffDays === 1) return "yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

function html(templates: Template[]): string {
  return `<!DOCTYPE html><html><head><style>
body{font:12px system-ui;background:#111;color:#ccc;margin:0;display:flex}
nav{width:220px;background:#0a0a0a;padding:15px;position:fixed;top:0;left:0;bottom:0;overflow-y:auto;border-right:1px solid #222;box-sizing:border-box}
nav a{display:block;color:#888;text-decoration:none;padding:6px 8px;border-radius:4px;margin-bottom:2px;font-size:11px}
nav a:hover{background:#1a1a1a;color:#fff}
nav a.active{background:#1a3a5a;color:#4fc3f7}
main{margin-left:240px;padding:20px;flex:1;min-width:0}
h1{font-size:16px;color:#4fc3f7;margin:30px 0 10px;border-bottom:1px solid #333;padding-bottom:5px}
h2{font-size:12px;color:#888;margin:15px 0 5px;display:flex;align-items:center;gap:10px}
.timing{font-size:10px;color:#666;font-weight:normal}
.timing .val{color:#4fc3f7}
.timing .size{color:#8bc34a}
.timing .date{color:#555}
.row{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px}
video{height:120px;background:#000}
.file{font-size:10px;color:#555}
</style></head><body>
<nav>
${templates.map(t => `<a href="#${t.name.replace(/\s/g, "-")}">${t.name}</a>`).join("")}
</nav>
<main>
${templates.map(t => `
<h1 id="${t.name.replace(/\s/g, "-")}">${t.name}</h1>
${t.techniques.map(tech => {
  const m = tech.metadata;
  const timing = m?.timing;
  const sizeStr = m?.outputSizeBytes ? ` (${formatBytes(m.outputSizeBytes)})` : '';
  const timingHtml = timing 
    ? `<span class="timing">render: <span class="val">${formatMs(timing.renderMs)}</span> | total: <span class="val">${formatMs(timing.totalMs)}</span> <span class="date">${formatTimestamp(m?.timestamp)}</span></span>`
    : (m?.timestamp ? `<span class="timing"><span class="date">${formatTimestamp(m?.timestamp)}</span></span>` : '');
  return `
<h2>${tech.name}<span class="size">${sizeStr}</span> ${timingHtml}</h2>
<div class="row">
${tech.videos.map(v => `<div><video src="/${v}" controls muted loop></video><div class="file">${v.split("/").pop()}</div></div>`).join("")}
</div>
`;
}).join("")}
`).join("")}
</main>
<script>
const links = document.querySelectorAll('nav a');
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      links.forEach(l => l.classList.remove('active'));
      document.querySelector('nav a[href="#' + e.target.id + '"]')?.classList.add('active');
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('h1[id]').forEach(h => observer.observe(h));
</script>
</body></html>`;
}

async function main() {
  const templates = await scanArtifacts();
  createServer(async (req, res) => {
    if (req.url === "/") {
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(html(templates));
    } else {
      try {
        const data = await readFile(join(RENDER_ROOT, decodeURIComponent(req.url!.slice(1))));
        res.writeHead(200, { "Content-Type": "video/mp4" });
        res.end(data);
      } catch { res.writeHead(404); res.end(); }
    }
  }).listen(PORT, () => console.log(`http://localhost:${PORT}`));
}

main();
