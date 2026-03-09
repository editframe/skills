/**
 * Deterministic link checker for /skills pages.
 *
 * Reads every markdown source file under skills/skills/, extracts all links,
 * and checks whether each one resolves to a valid page given the routing
 * rules defined in the web service.
 *
 * Usage:  npx tsx scripts/check-skills-links.ts
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LinkInfo {
  /** The raw href from the markdown */
  href: string;
  /** The markdown source file that contains the link */
  sourceFile: string;
  /** Line number in the source file */
  line: number;
  /** Resolved absolute URL path (e.g. /skills/composition/video) */
  resolvedUrl: string | null;
  /** Whether the link target exists */
  ok: boolean;
  /** Description of the problem, if any */
  problem?: string;
}

interface ReferenceFrontmatter {
  title?: string;
  description?: string;
  type?: string;
  sections?: { slug: string; heading: string }[];
  status?: string;
}

interface SkillFrontmatter {
  name: string;
  status?: string;
}

// ---------------------------------------------------------------------------
// Minimal frontmatter parser (no dependencies)
// ---------------------------------------------------------------------------

function parseFrontmatter(content: string): {
  attributes: Record<string, any>;
  body: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { attributes: {}, body: content };

  const yamlStr = match[1]!;
  const body = match[2]!;
  const attrs: Record<string, any> = {};

  // Parse top-level scalar fields and simple arrays/objects
  const lines = yamlStr.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i]!;
    const scalarMatch = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
    if (scalarMatch) {
      const [, key, rawVal] = scalarMatch;
      attrs[key!] = rawVal!.replace(/^["']|["']$/g, "");
      i++;
      continue;
    }

    // Key with block value (array or object)
    const blockMatch = line.match(/^(\w[\w-]*)\s*:\s*$/);
    if (blockMatch) {
      const key = blockMatch[1]!;
      const items: any[] = [];
      let isArray = false;
      i++;

      while (i < lines.length && /^\s/.test(lines[i]!)) {
        const subline = lines[i]!;
        const arrItemMatch = subline.match(/^\s+-\s*$/);
        const arrInlineMatch = subline.match(/^\s+-\s+(\w[\w-]*):\s*(.*)$/);

        if (arrItemMatch) {
          isArray = true;
          const obj: Record<string, string> = {};
          i++;
          while (
            i < lines.length &&
            /^\s{4,}/.test(lines[i]!) &&
            !/^\s+-/.test(lines[i]!)
          ) {
            const propMatch = lines[i]!.match(/^\s+(\w[\w-]*):\s*(.+)$/);
            if (propMatch) {
              obj[propMatch[1]!] = propMatch[2]!.replace(/^["']|["']$/g, "");
            }
            i++;
          }
          items.push(obj);
        } else if (arrInlineMatch) {
          isArray = true;
          const obj: Record<string, string> = {};
          obj[arrInlineMatch[1]!] = arrInlineMatch[2]!.replace(
            /^["']|["']$/g,
            "",
          );
          i++;
          while (
            i < lines.length &&
            /^\s{4,}/.test(lines[i]!) &&
            !/^\s+-/.test(lines[i]!)
          ) {
            const propMatch = lines[i]!.match(/^\s+(\w[\w-]*):\s*(.+)$/);
            if (propMatch) {
              obj[propMatch[1]!] = propMatch[2]!.replace(/^["']|["']$/g, "");
            }
            i++;
          }
          items.push(obj);
        } else {
          i++;
        }
      }

      if (isArray) {
        attrs[key] = items;
      }
      continue;
    }

    i++;
  }

  return { attributes: attrs, body };
}

// ---------------------------------------------------------------------------
// Discovery: build the set of valid URL paths
// ---------------------------------------------------------------------------

const MONOREPO_ROOT = resolve(__dirname, "..");
const SKILLS_BASE = join(MONOREPO_ROOT, "skills", "skills");

function getSkillDirs(): string[] {
  if (!existsSync(SKILLS_BASE)) return [];
  return readdirSync(SKILLS_BASE).filter((e) =>
    statSync(join(SKILLS_BASE, e)).isDirectory(),
  );
}

function getSkillFrontmatter(skillDir: string): SkillFrontmatter | null {
  const p = join(SKILLS_BASE, skillDir, "SKILL.md");
  if (!existsSync(p)) return null;
  const { attributes } = parseFrontmatter(readFileSync(p, "utf8"));
  return attributes as SkillFrontmatter;
}

function getReferences(
  skillDir: string,
): { name: string; fm: ReferenceFrontmatter }[] {
  const refDir = join(SKILLS_BASE, skillDir, "references");
  if (!existsSync(refDir)) return [];

  return readdirSync(refDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const content = readFileSync(join(refDir, f), "utf8");
      const { attributes } = parseFrontmatter(content);
      return {
        name: f.replace(".md", ""),
        fm: attributes as ReferenceFrontmatter,
      };
    });
}

/** Build the complete set of valid /skills/* URL paths. */
function buildValidPaths(): Set<string> {
  const paths = new Set<string>();

  // /skills (catalog)
  paths.add("/skills");

  for (const dir of getSkillDirs()) {
    const skillFm = getSkillFrontmatter(dir);
    if (!skillFm || skillFm.status === "draft") continue;

    const skillName = skillFm.name; // from frontmatter (the URL slug)

    // /skills/:skill
    paths.add(`/skills/${skillName}`);

    for (const ref of getReferences(dir)) {
      // /skills/:skill/:reference
      paths.add(`/skills/${skillName}/${ref.name}`);

      // sections produce /skills/:skill/:reference~:section
      if (ref.fm.sections) {
        for (const sec of ref.fm.sections) {
          paths.add(`/skills/${skillName}/${ref.name}~${sec.slug}`);
        }
      }
    }
  }

  return paths;
}

// ---------------------------------------------------------------------------
// Link extraction from markdown
// ---------------------------------------------------------------------------

const MD_LINK_RE = /\[([^\]]*)\]\(([^)]+)\)/g;

interface RawLink {
  href: string;
  line: number;
}

function extractLinks(markdown: string): RawLink[] {
  const links: RawLink[] = [];
  const lines = markdown.split("\n");

  for (let i = 0; i < lines.length; i++) {
    let match: RegExpExecArray | null;
    MD_LINK_RE.lastIndex = 0;
    while ((match = MD_LINK_RE.exec(lines[i]!)) !== null) {
      links.push({ href: match[2]!, line: i + 1 });
    }
  }

  return links;
}

// ---------------------------------------------------------------------------
// Link resolution
// ---------------------------------------------------------------------------

/**
 * Resolve a link from a markdown source file to an absolute URL path.
 *
 * The SkillLink component in skills-mdx-components.tsx applies these rules:
 * 1. href starts with "references/" and ends with ".md"
 *    -> /skills/{skillName}/{refName}
 * 2. href starts with "http://" or "https://"
 *    -> external, not checked
 * 3. All other hrefs -> passed to React Router <Link> which resolves
 *    relative to the current page URL
 *
 * The "current page URL" depends on whether the source file is a SKILL.md
 * or a reference file:
 * - SKILL.md for skill "composition" -> /skills/composition
 * - references/foo.md for skill "composition" -> /skills/composition/foo
 */
function resolveLink(
  href: string,
  sourceFile: string,
  skillName: string,
  isSkillOverview: boolean,
): { resolvedUrl: string | null; external: boolean } {
  // Fragment-only links
  if (href.startsWith("#")) {
    return { resolvedUrl: null, external: false };
  }

  // External links
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return { resolvedUrl: href, external: true };
  }

  // Rule 1: references/*.md pattern — SkillLink intercepts these
  if (href.startsWith("references/") && href.endsWith(".md")) {
    const refName = href.replace("references/", "").replace(".md", "");
    return { resolvedUrl: `/skills/${skillName}/${refName}`, external: false };
  }

  // Rule 3: all other links — React Router relative resolution
  // Current page URL:
  const currentUrl = isSkillOverview
    ? `/skills/${skillName}`
    : `/skills/${skillName}/${sourceFileToRefName(sourceFile)}`;

  // Relative URL resolution
  if (href.startsWith("/")) {
    // Absolute path
    return { resolvedUrl: href, external: false };
  }

  // Relative path — resolve against the "directory" of the current URL
  // React Router treats the current URL as a "file", so relative links
  // resolve against its parent.
  // e.g. current = /skills/composition/render-to-video
  //      href = render-api.md
  //      resolves to /skills/composition/render-api.md
  const base = currentUrl.substring(0, currentUrl.lastIndexOf("/") + 1);
  const resolved = new URL(href, `http://localhost${base}`).pathname;
  return { resolvedUrl: resolved, external: false };
}

function sourceFileToRefName(filePath: string): string {
  const base = filePath.split("/").pop()!;
  return base.replace(".md", "");
}

// ---------------------------------------------------------------------------
// External link checking
// ---------------------------------------------------------------------------

async function checkExternalLink(
  url: string,
): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
      headers: { "User-Agent": "EditframeSkillsLinkChecker/1.0" },
    });
    clearTimeout(timeout);

    if (!res.ok) {
      // Retry with GET — some servers reject HEAD
      const res2 = await fetch(url, {
        method: "GET",
        signal: AbortSignal.timeout(10_000),
        redirect: "follow",
        headers: { "User-Agent": "EditframeSkillsLinkChecker/1.0" },
      });
      return { ok: res2.ok, status: res2.status };
    }

    return { ok: true, status: res.status };
  } catch (e: any) {
    return { ok: false, error: e.message || String(e) };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const validPaths = buildValidPaths();
  const allLinks: LinkInfo[] = [];
  const externalUrls = new Map<string, LinkInfo[]>();
  const checkExternal = process.argv.includes("--check-external");

  console.log(`Valid skill paths: ${validPaths.size}`);
  console.log();

  for (const dir of getSkillDirs()) {
    const skillFm = getSkillFrontmatter(dir);
    if (!skillFm || skillFm.status === "draft") continue;
    const skillName = skillFm.name;

    // Check SKILL.md
    const skillMdPath = join(SKILLS_BASE, dir, "SKILL.md");
    if (existsSync(skillMdPath)) {
      const content = readFileSync(skillMdPath, "utf8");
      const rawLinks = extractLinks(content);

      for (const raw of rawLinks) {
        const { resolvedUrl, external } = resolveLink(
          raw.href,
          "SKILL.md",
          skillName,
          true,
        );

        if (resolvedUrl === null) continue; // fragment link

        if (external) {
          const info: LinkInfo = {
            href: raw.href,
            sourceFile: `skills/skills/${dir}/SKILL.md`,
            line: raw.line,
            resolvedUrl,
            ok: true, // assume ok unless --check-external
          };
          if (checkExternal) {
            const list = externalUrls.get(resolvedUrl) || [];
            list.push(info);
            externalUrls.set(resolvedUrl, list);
          }
          allLinks.push(info);
          continue;
        }

        const ok = validPaths.has(resolvedUrl);
        allLinks.push({
          href: raw.href,
          sourceFile: `skills/skills/${dir}/SKILL.md`,
          line: raw.line,
          resolvedUrl,
          ok,
          problem: ok ? undefined : `No page exists at ${resolvedUrl}`,
        });
      }
    }

    // Check each reference file
    const refDir = join(SKILLS_BASE, dir, "references");
    if (!existsSync(refDir)) continue;

    for (const file of readdirSync(refDir).filter((f) => f.endsWith(".md"))) {
      const refPath = join(refDir, file);
      const content = readFileSync(refPath, "utf8");
      const rawLinks = extractLinks(content);
      const refName = file.replace(".md", "");

      for (const raw of rawLinks) {
        const { resolvedUrl, external } = resolveLink(
          raw.href,
          file,
          skillName,
          false,
        );

        if (resolvedUrl === null) continue;

        if (external) {
          const info: LinkInfo = {
            href: raw.href,
            sourceFile: `skills/skills/${dir}/references/${file}`,
            line: raw.line,
            resolvedUrl,
            ok: true,
          };
          if (checkExternal) {
            const list = externalUrls.get(resolvedUrl) || [];
            list.push(info);
            externalUrls.set(resolvedUrl, list);
          }
          allLinks.push(info);
          continue;
        }

        const ok = validPaths.has(resolvedUrl);
        allLinks.push({
          href: raw.href,
          sourceFile: `skills/skills/${dir}/references/${file}`,
          line: raw.line,
          resolvedUrl,
          ok,
          problem: ok ? undefined : `No page exists at ${resolvedUrl}`,
        });
      }
    }
  }

  // Check external links if requested
  if (checkExternal && externalUrls.size > 0) {
    console.log(`Checking ${externalUrls.size} external URLs...`);
    for (const [url, infos] of externalUrls) {
      const result = await checkExternalLink(url);
      if (!result.ok) {
        for (const info of infos) {
          info.ok = false;
          info.problem = result.error
            ? `External: ${result.error}`
            : `External: HTTP ${result.status}`;
        }
      }
    }
    console.log();
  }

  // Report
  const broken = allLinks.filter((l) => !l.ok);
  const internal = allLinks.filter((l) => !l.resolvedUrl?.startsWith("http"));
  const external = allLinks.filter((l) => l.resolvedUrl?.startsWith("http"));

  console.log("=".repeat(72));
  console.log("SKILLS LINK CHECK REPORT");
  console.log("=".repeat(72));
  console.log();
  console.log(`Total links scanned:    ${allLinks.length}`);
  console.log(`  Internal links:       ${internal.length}`);
  console.log(`  External links:       ${external.length}`);
  console.log(`  Broken links:         ${broken.length}`);
  console.log();

  if (broken.length === 0) {
    console.log("All links OK.");
    return;
  }

  console.log("-".repeat(72));
  console.log("BROKEN LINKS");
  console.log("-".repeat(72));

  // Group by source file
  const byFile = new Map<string, LinkInfo[]>();
  for (const link of broken) {
    const list = byFile.get(link.sourceFile) || [];
    list.push(link);
    byFile.set(link.sourceFile, list);
  }

  for (const [file, links] of byFile) {
    console.log();
    console.log(`  ${file}`);
    for (const link of links) {
      console.log(`    line ${link.line}: [${link.href}]`);
      console.log(`      -> resolves to: ${link.resolvedUrl}`);
      console.log(`      -> ${link.problem}`);

      // Suggest fix if possible
      const suggestion = suggestFix(link);
      if (suggestion) {
        console.log(`      -> suggestion:  change to "${suggestion}"`);
      }
    }
  }

  console.log();
  console.log("=".repeat(72));

  process.exit(broken.length > 0 ? 1 : 0);
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

function suggestFix(link: LinkInfo): string | null {
  const href = link.href;

  // Common mistake: using "foo.md" instead of "references/foo.md" from a
  // reference file. The SkillLink component only intercepts links that
  // start with "references/".
  if (
    href.endsWith(".md") &&
    !href.startsWith("references/") &&
    !href.startsWith("http")
  ) {
    return `references/${href}`;
  }

  return null;
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
