import type { Plugin } from "vite";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import fm from "front-matter";

/**
 * Vite plugin to generate content index at build time
 * This eliminates runtime file I/O and provides a clean API for content access
 * 
 * Generates: services/web/build/content-index.json
 */
export function viteContentIndexPlugin(): Plugin {
  const contentDir = resolve(process.cwd(), "services/web/app/content");
  
  return {
    name: "vite-content-index",
    buildStart() {
      // This runs during build, not dev server
    },
    generateBundle() {
      // Generate content index during build
      const index: Record<string, any> = {
        docs: {},
        guides: [],
        blogs: [],
        changelogs: [],
        generatedAt: new Date().toISOString(),
      };

      try {
        // Index docs
        const docsDir = join(contentDir, "docs");
        if (statSync(docsDir).isDirectory()) {
          const indexDocs = (dir: string, prefix = ""): Record<string, any> => {
            const entries = readdirSync(dir);
            const result: Record<string, any> = {};
            
            for (const entry of entries) {
              const fullPath = join(dir, entry);
              if (statSync(fullPath).isDirectory()) {
                result[entry] = indexDocs(fullPath, join(prefix, entry));
              } else if (entry.endsWith(".mdx")) {
                const content = readFileSync(fullPath, "utf-8");
                const { attributes } = fm(content);
                const slug = join(prefix, entry.replace(".mdx", "")).replace(/\\/g, "/");
                result[slug] = {
                  path: slug,
                  title: attributes.meta?.find((m: any) => m.title)?.title || "",
                  description: attributes.meta?.find((m: any) => m.name === "description")?.content || "",
                  publishedDate: attributes.published_date || "",
                };
              }
            }
            return result;
          };
          index.docs = indexDocs(docsDir);
        }

        // Index guides
        const guidesDir = join(contentDir, "guides");
        if (statSync(guidesDir).isDirectory()) {
          const guideFiles = readdirSync(guidesDir).filter(f => f.endsWith(".mdx"));
          index.guides = guideFiles.map(file => {
            const content = readFileSync(join(guidesDir, file), "utf-8");
            const { attributes } = fm(content);
            return {
              slug: `/guides/${file.replace(".mdx", "")}`,
              title: attributes.meta?.find((m: any) => m.title)?.title || "",
              description: attributes.meta?.find((m: any) => m.name === "description")?.content || "",
              featured: attributes.featured || false,
              publishedDate: attributes.published_date || "",
            };
          });
        }

        // Index blogs
        const blogsDir = join(contentDir, "blogs");
        if (statSync(blogsDir).isDirectory()) {
          const blogFiles = readdirSync(blogsDir).filter(f => f.endsWith(".mdx"));
          index.blogs = blogFiles.map(file => {
            const content = readFileSync(join(blogsDir, file), "utf-8");
            const { attributes } = fm(content);
            return {
              slug: `/blog/${file.replace(".mdx", "")}`,
              title: attributes.meta?.title || "",
              description: attributes.meta?.description || "",
              date: attributes.date || 0,
            };
          });
        }

        // Index changelogs
        const changelogsDir = join(contentDir, "changelogs");
        if (statSync(changelogsDir).isDirectory()) {
          const changelogFiles = readdirSync(changelogsDir).filter(f => f.endsWith(".mdx"));
          index.changelogs = changelogFiles.map(file => {
            const content = readFileSync(join(changelogsDir, file), "utf-8");
            const { attributes } = fm(content);
            return {
              slug: `/changelogs/${file.replace(".mdx", "")}`,
              title: attributes.meta?.find((m: any) => m.title)?.title || "",
              description: attributes.meta?.find((m: any) => m.name === "description")?.content || "",
              publishedDate: attributes.published_date || "",
            };
          });
        }

        // Emit as virtual module
        this.emitFile({
          type: "asset",
          fileName: "content-index.json",
          source: JSON.stringify(index, null, 2),
        });
      } catch (error) {
        console.warn("Failed to generate content index:", error);
      }
    },
  };
}

