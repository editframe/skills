import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import fs, { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import fm from "front-matter";
import { logger } from "@/logging";
import { formatDate } from "~/ui/formatDate";

type Attributes = {
  date: number;
  meta: {
    title: string;
    description: string;
  };
};

// Content directory is always at services/web/app/content relative to project root
// In production container: process.cwd() is /app, so path is /app/services/web/app
// In development: process.cwd() is monorepo root, so path is <root>/services/web/app
// This is the same location regardless of where this file is bundled
const appDir = resolve(process.cwd(), "services/web/app");
const contentPath = "content";
const blogBasePath = join(appDir, contentPath, "blogs");
const guidesBasePath = join(appDir, contentPath, "guides");
const changelogsBasePath = join(appDir, contentPath, "changelogs");
const docsBasePath = join(appDir, contentPath, "docs");

export const getLocalFile = async (path: string): Promise<string> => {
  const jsonDirectory = join(appDir, contentPath);
  const data = await fs.readFile(join(jsonDirectory, path), "utf8");
  return data.toString();
};

interface DocIndexFile {
  title: string;
  description: string;
  slug: string;
  featured: boolean;
  featuredImage: string;
  publishedDate: string;
  children: DocIndexFile[];
}

const getDocIndexFile = async (directory: string): Promise<DocIndexFile> => {
  const data = await fs.readFile(join(directory, "index.mdx"), "utf8");
  const { attributes } = fm<any>(data);
  const entries = (await readdir(directory)).filter(
    (entry) => entry !== "index.mdx",
  );
  return {
    title: attributes.meta.find((attr: any) => attr.title).title,
    description: attributes.meta.find(
      (attr: any) => attr.name === "description",
    ).content,
    slug: "/docs",
    featured: attributes.featured || false,
    featuredImage: attributes.featured_image || "",
    publishedDate: attributes.published_date || "",
    children: await Promise.all(
      entries.map(async (entry) => {
        if (entry.endsWith(".mdx")) {
          const data = await fs.readFile(join(directory, entry), "utf8");
          const { attributes } = fm<any>(data);
          return {
            title: attributes.meta.find((attr: any) => attr.title).title,
            description: attributes.meta.find(
              (attr: any) => attr.name === "description",
            ).content,
            slug: `/docs/${entry.replace(".mdx", "")}`,
            featured: attributes.featured || false,
            featuredImage: attributes.featured_image || "",
            publishedDate: attributes.published_date || "",
            children: [],
          } as DocIndexFile;
        }
        return await getDocIndexFile(join(directory, entry));
      }),
    ),
  } as DocIndexFile;
};

export interface DocsMenuItem {
  hasContent: boolean;
  attrs: {
    title: string;
    new: boolean;
  };
  children: DocsMenuItem[];
  slug?: string;
}

export const buildDocSlugMap = async (
  directory = docsBasePath,
  prefix = "",
  map: Record<string, string> = {},
): Promise<Record<string, string>> => {
  const entries = await readdir(directory);
  entries.forEach((entry) => {
    if (entry === "index.mdx") {
      const slug = prefix.replace(/(\/?\d+-)/g, "/").replace(/^\//, "");
      const path = join(prefix, entry).replace(".mdx", "");
      map[slug] = path;
    } else if (entry.endsWith(".mdx")) {
      const path = join(prefix, entry).replace(".mdx", "");
      const slug = path.replace(/(\/?\d+-)/g, "/").replace(/^\//, "");
      map[slug] = path;
    }
  });
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.endsWith(".mdx") || entry.endsWith(".tsx")) {
        return;
      }
      return await buildDocSlugMap(
        join(directory, entry),
        join(prefix, entry),
        map,
      );
    }),
  );
  return map;
};

const buildDocMenuItem = async (
  directory: string,
  prefix: string,
): Promise<DocsMenuItem> => {
  const data = await fs.readFile(join(directory, "index.mdx"), "utf8");
  const { attributes } = fm<any>(data);
  const entries = (await readdir(directory)).filter(
    (entry) => entry !== "index.mdx" && !entry.endsWith(".tsx")
  );
  return {
    hasContent: true,
    attrs: {
      title: attributes.meta.find((attr: any) => attr.title).title,
    },
    slug: `/docs/${prefix.replace(/(\/?\d+-)/g, "/").replace(/^\//, "")}`,
    children: await Promise.all(
      entries.map(async (entry) => {
        if (entry.endsWith(".mdx")) {
          const data = await fs.readFile(join(directory, entry), "utf8");
          const { attributes } = fm<any>(data);
          return {
            attrs: {
              title: attributes.meta.find((attr: any) => attr.title).title,
            },
            slug: `/docs/${join(prefix, entry.replace(".mdx", ""))
              .replace(/(\/?\d+-)/g, "/")
              .replace(/^\//, "")}`,
          } as DocsMenuItem;
        }
        return await buildDocMenuItem(
          join(directory, entry),
          join(prefix, entry),
        );
      }),
    ),
  } as DocsMenuItem;
};

export const buildDocsMenu = async () => {
  return (await buildDocMenuItem(docsBasePath, "")).children;
};

export const getAllDocsFiles = async () => {
  return getDocIndexFile(docsBasePath);
};

export const getAllGuideFiles = async () => {
  const files = readdirSync(guidesBasePath);
  const guides = files.map((file) => {
    const data = readFileSync(join(guidesBasePath, file), {
      encoding: "utf-8",
    });
    const { attributes } = fm<any>(data);
    const title = attributes.meta.find((attr: any) => attr.title).title;
    const description = attributes.meta.find(
      (attr: any) => attr.name === "description",
    ).content;
    return {
      title,
      description,
      slug: `/guides/${file.replace(".mdx", "")}`,
      featured: attributes.featured || false,
      featuredImage: attributes.featured_image || "",
      publishedDate: attributes.published_date ? formatDate(attributes.published_date) : "",
      author: attributes.author,
      featuredInDashboard: attributes.featured_in_dashboard || false,
      lastUpdated: attributes.last_updated ? formatDate(attributes.last_updated) : "",
    };
  });
  return guides.sort((a, b) => {
    return (
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
  });
};
export const getAllChangelogsFiles = async () => {
  const files = readdirSync(changelogsBasePath);
  const changelogs = files.map((file) => {
    const data = readFileSync(join(changelogsBasePath, file), {
      encoding: "utf-8",
    });
    const { attributes } = fm<any>(data);
    const title = attributes.meta.find((attr: any) => attr.title).title;
    const description = attributes.meta.find(
      (attr: any) => attr.name === "description",
    ).content;
    return {
      title,
      description,
      slug: `/changelogs/${file.replace(".mdx", "")}`,
      publishedDate: attributes.published_date || "",
    };
  });
  return changelogs.sort((a, b) => {
    return (
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
  });
};

export const getLocalContent = async (path: string) => {
  try {
    const basePath = join(appDir, contentPath, path);
    const mdxFile = `${basePath}.mdx`;
    const mdxDir = basePath;
    
    logger.info({ mdxFile, mdxDir }, "getLocalContent");
    
    // Check if it's a file with .mdx extension
    if (existsSync(mdxFile)) {
      const data = readFileSync(mdxFile, {
        encoding: "utf-8",
      });
      return {
        path: `${path}.mdx`,
        content: data.toString(),
      };
    }
    
    // Check if it's a directory with index.mdx
    if (existsSync(mdxDir) && statSync(mdxDir).isDirectory()) {
      const indexPath = join(mdxDir, "index.mdx");
      if (existsSync(indexPath)) {
        const data = readFileSync(indexPath, { encoding: "utf-8" });
        const { attributes } = fm<any>(data);
        return {
          path: path.endsWith("/") ? `${path}index.mdx` : `${path}/index.mdx`,
          content: data.toString(),
          author: attributes.author,
          publishedDate: attributes.published_date ? formatDate(attributes.published_date) : "",
        };
      }
    }
    
    // If we get here, the file doesn't exist
    throw new Error("Not found");
  } catch (error: any) {
    if (error.message === "Not found" || error.code?.includes("ENOENT")) {
      throw new Error("Not found");
    }

    throw error;
  }
};

export function loadMdxSingle(filepath: string) {
  const relativeFilePath = filepath.replace(/^\/blog\//, "").replace(/\/$/, "");
  const fileContents = readFileSync(
    join(blogBasePath, `${relativeFilePath}.mdx`),
    { encoding: "utf-8" },
  );

  const { attributes } = fm(fileContents);

  return attributes;
}

export function loadMdx() {
  const dirEntries = readdirSync(blogBasePath, { withFileTypes: true });
  const dirs = dirEntries.filter((entry) => entry.isDirectory());
  const files = dirEntries.filter((entry) => entry.isFile());

  const subFiles = dirs.flatMap((dir) => {
    const subDirEntries = readdirSync(join(blogBasePath, dir.name), {
      withFileTypes: true,
    })
      .filter((e) => e.isFile())
      .map((e) => ({ name: join(dir.name, e.name) }));

    return subDirEntries;
  });

  const entries = [...files, ...subFiles].map((entry) => {
    if (entry.name === "index.jsx") {
      return;
    }

    const fileContents = readFileSync(join(blogBasePath, entry.name), {
      encoding: "utf-8",
    });

    const { attributes }: { attributes: Attributes } = fm(fileContents);

    if (!attributes) {
      throw new Error("Attributes not found");
    }
    return {
      date: attributes.date,
      slug: `/blog/${entry.name.replace(".mdx", "")}`,
      title: attributes.meta.title,
      description: attributes.meta.description,
    };
  });

  const filteredEntries = entries.filter((entry) => entry !== undefined);
  return filteredEntries.sort((a, b) => b.date - a.date);
}
export const getAllBlogFiles = async () => {
  const files = readdirSync(blogBasePath);
  const blogs = files.map((file) => {
    const data = readFileSync(join(blogBasePath, file), {
      encoding: "utf-8",
    });
    const { attributes } = fm<any>(data);
    const title = attributes.meta.find((attr: any) => attr.title).title;
    const description = attributes.meta.find(
      (attr: any) => attr.name === "description",
    ).content;
    return {
      title,
      description,
      slug: `/blog/${file.replace(".mdx", "")}`,
      featured: attributes.featured || false,
      featuredImage: attributes.featured_image || "",
      publishedDate: attributes.published_date || "",
    };
  });
  return blogs.sort((a, b) => {
    return (
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
  });
};
