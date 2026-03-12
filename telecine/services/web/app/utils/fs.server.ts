import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import fs, { readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import fm from "front-matter";
import { logger } from "@/logging";
import { formatDate } from "~/ui/formatDate";
import { generateIndexPage } from "./doc-index-generator";
import {
  BlogFrontmatterSchema,
  ChangelogFrontmatterSchema,
  type BlogPost,
  type ChangelogEntry,
} from "./blog-schema";

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

const extractTitleFromMeta = (attributes: any): string => {
  if (!attributes?.meta || !Array.isArray(attributes.meta)) {
    return "";
  }
  return attributes.meta.find((attr: any) => attr.title)?.title || "";
};

const extractDescriptionFromMeta = (attributes: any): string => {
  if (!attributes?.meta || !Array.isArray(attributes.meta)) {
    return "";
  }
  return (
    attributes.meta.find((attr: any) => attr.name === "description")?.content ||
    ""
  );
};

const deriveNameFromPath = (name: string): string => {
  // Remove numeric prefix (e.g., "010-elements" -> "elements")
  const cleanName = name.replace(/^\d+-/, "").replace(/\.mdx$/, "");
  // Convert kebab-case to Title Case (e.g., "aspect-ratio-preservation" -> "Aspect Ratio Preservation")
  return cleanName
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

const getDocIndexFile = async (directory: string): Promise<DocIndexFile> => {
  const data = await fs.readFile(join(directory, "index.mdx"), "utf8");
  const { attributes } = fm<any>(data);
  const entries = (await readdir(directory)).filter(
    (entry) => entry !== "index.mdx",
  );
  const dirName = directory.split("/").pop() || "";
  return {
    title: extractTitleFromMeta(attributes) || deriveNameFromPath(dirName),
    description: extractDescriptionFromMeta(attributes),
    slug: "/docs",
    featured: attributes?.featured || false,
    featuredImage: attributes?.featured_image || "",
    publishedDate: attributes?.published_date || "",
    children: await Promise.all(
      entries.map(async (entry) => {
        if (entry.endsWith(".mdx")) {
          const data = await fs.readFile(join(directory, entry), "utf8");
          const { attributes } = fm<any>(data);
          return {
            title:
              extractTitleFromMeta(attributes) || deriveNameFromPath(entry),
            description: extractDescriptionFromMeta(attributes),
            slug: `/docs/${entry.replace(".mdx", "")}`,
            featured: attributes?.featured || false,
            featuredImage: attributes?.featured_image || "",
            publishedDate: attributes?.published_date || "",
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
  /** When true, this item is a visual group label, not a navigable item */
  isGroupLabel?: boolean;
}

export const buildDocSlugMap = async (
  directory = docsBasePath,
  prefix = "",
  map: Record<string, string> = {},
): Promise<Record<string, string>> => {
  const entries = await readdir(directory, { withFileTypes: true });

  // Process directories first to ensure nested structures are handled
  await Promise.all(
    entries.map(async (entry) => {
      if (entry.isDirectory() && !entry.name.endsWith(".tsx")) {
        return await buildDocSlugMap(
          join(directory, entry.name),
          join(prefix, entry.name),
          map,
        );
      }
    }),
  );

  // Then process files in current directory
  entries.forEach((entry) => {
    if (entry.isFile()) {
      if (entry.name === "index.mdx") {
        const slug = prefix.replace(/(\/?\d+-)/g, "/").replace(/^\//, "");
        const path = join(prefix, entry.name).replace(".mdx", "");
        map[slug] = path;
      } else if (entry.name.endsWith(".mdx")) {
        const path = join(prefix, entry.name).replace(".mdx", "");
        const slug = path.replace(/(\/?\d+-)/g, "/").replace(/^\//, "");
        map[slug] = path;
      }
    }
  });

  return map;
};

/** Extended type for sorting during menu building */
type DocsMenuItemWithMeta = DocsMenuItem & {
  _originalName?: string;
  _navFlat?: boolean;
};

const buildDocMenuItem = async (
  directory: string,
  prefix: string,
): Promise<DocsMenuItem> => {
  const indexPath = join(directory, "index.mdx");
  const hasIndex = existsSync(indexPath);

  let title = "";
  if (hasIndex) {
    const data = await fs.readFile(indexPath, "utf8");
    const { attributes } = fm<any>(data);
    title = extractTitleFromMeta(attributes);
  }

  const entries = await readdir(directory, { withFileTypes: true });
  const filteredEntries = entries.filter(
    (entry) => entry.name !== "index.mdx" && !entry.name.endsWith(".tsx"),
  );

  const children = await Promise.all(
    filteredEntries.map(async (entry) => {
      if (entry.isFile() && entry.name.endsWith(".mdx")) {
        const data = await fs.readFile(join(directory, entry.name), "utf8");
        const { attributes } = fm<any>(data);
        const titleFromMeta = extractTitleFromMeta(attributes);
        return {
          attrs: {
            title: titleFromMeta || deriveNameFromPath(entry.name),
            new: attributes?.new || false,
          },
          slug: `/docs/${join(prefix, entry.name.replace(".mdx", ""))
            .replace(/(\/?\d+-)/g, "/")
            .replace(/^\//, "")}`,
          hasContent: true,
          children: [],
          _originalName: entry.name, // Store original name for sorting (file or directory)
        } as DocsMenuItemWithMeta;
      }
      if (entry.isDirectory()) {
        const childItem = (await buildDocMenuItem(
          join(directory, entry.name),
          join(prefix, entry.name),
        )) as DocsMenuItemWithMeta;
        // Store original directory name for sorting
        childItem._originalName = entry.name;
        // Check if this child directory has navFlat
        const childIndexPath = join(directory, entry.name, "index.mdx");
        if (existsSync(childIndexPath)) {
          const childData = await fs.readFile(childIndexPath, "utf8");
          const { attributes: childAttrs } = fm<any>(childData);
          childItem._navFlat = childAttrs?.navFlat === true;
        }
        return childItem;
      }
      return null;
    }),
  );

  const validChildren = children.filter(
    (child): child is DocsMenuItemWithMeta => child !== null,
  );

  // Sort children by numerical prefix extracted from original name (file or directory)
  validChildren.sort((a, b) => {
    const nameA = a._originalName || "";
    const nameB = b._originalName || "";

    // Extract numerical prefix
    const prefixMatchA = nameA.match(/^(\d+)-/);
    const prefixMatchB = nameB.match(/^(\d+)-/);
    const prefixA = prefixMatchA?.[1]
      ? parseInt(prefixMatchA[1], 10)
      : Infinity;
    const prefixB = prefixMatchB?.[1]
      ? parseInt(prefixMatchB[1], 10)
      : Infinity;

    // Sort by numerical prefix first
    if (prefixA !== prefixB) {
      return prefixA - prefixB;
    }

    // If prefixes are equal, sort alphabetically by title
    return a.attrs.title.localeCompare(b.attrs.title);
  });

  // Flatten children that have navFlat: true
  // Instead of nesting them, convert to group labels and hoist their children
  const flattenedChildren: DocsMenuItemWithMeta[] = [];
  for (const child of validChildren) {
    if (child._navFlat && child.children.length > 0) {
      // This child is a flat group - add a group label, then hoist its children
      flattenedChildren.push({
        hasContent: false,
        attrs: {
          title: child.attrs.title,
          new: false,
        },
        children: [],
        isGroupLabel: true,
      });
      // Hoist all grandchildren up
      flattenedChildren.push(...child.children);
    } else {
      flattenedChildren.push(child);
    }
  }

  // Remove the temporary metadata properties
  flattenedChildren.forEach((child) => {
    delete child._originalName;
    delete child._navFlat;
  });

  if (!hasIndex) {
    // If no index.mdx, derive title from directory name and link to first child
    const dirName = prefix.split("/").pop() || "";
    // Remove numeric prefix (e.g., "010-elements" -> "elements")
    const cleanDirName = dirName.replace(/^\d+-/, "");
    // Convert kebab-case to Title Case (e.g., "editor-ui" -> "Editor UI")
    const derivedTitle = cleanDirName
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Find first child with a slug (first page in section)
    // This will be the first actual page, whether it's a .mdx file or a directory's first page
    const firstChildWithSlug = flattenedChildren.find((child) => child.slug);
    const sectionSlug = firstChildWithSlug?.slug;

    return {
      hasContent: true, // Mark as having content so it shows as a clickable header
      attrs: {
        title: title || derivedTitle || dirName,
        new: false,
      },
      slug: sectionSlug, // Link to first child page
      children: flattenedChildren,
    } as DocsMenuItem;
  }

  return {
    hasContent: true,
    attrs: {
      title,
      new: false,
    },
    slug: `/docs/${prefix.replace(/(\/?\d+-)/g, "/").replace(/^\//, "")}`,
    children: flattenedChildren,
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
      publishedDate: attributes.published_date
        ? formatDate(attributes.published_date)
        : "",
      author: attributes.author,
      featuredInDashboard: attributes.featured_in_dashboard || false,
      lastUpdated: attributes.last_updated
        ? formatDate(attributes.last_updated)
        : "",
    };
  });
  return guides.sort((a, b) => {
    return (
      new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime()
    );
  });
};
export const getAllChangelogsFiles = async (): Promise<ChangelogEntry[]> => {
  if (!existsSync(changelogsBasePath)) {
    return [];
  }
  const files = await fs.readdir(changelogsBasePath);
  const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

  const entries = await Promise.all(
    mdxFiles.map(async (file) => {
      const data = await fs.readFile(join(changelogsBasePath, file), "utf-8");
      const { attributes } = fm<unknown>(data);
      const parsed = ChangelogFrontmatterSchema.safeParse(attributes);
      if (!parsed.success) {
        throw new Error(
          `Invalid changelog frontmatter in ${file}:\n${parsed.error.message}`,
        );
      }
      const fm_ = parsed.data;
      return {
        slug: file.replace(".mdx", ""),
        title: fm_.title,
        description: fm_.description,
        date: fm_.date,
        version: fm_.version,
        tags: fm_.tags,
      } satisfies ChangelogEntry;
    }),
  );

  return entries.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
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
        // Manual index.mdx exists, use it (allows overrides)
        const data = readFileSync(indexPath, { encoding: "utf-8" });
        const { attributes } = fm<any>(data);
        return {
          path: path.endsWith("/") ? `${path}index.mdx` : `${path}/index.mdx`,
          content: data.toString(),
          author: attributes.author,
          publishedDate: attributes.published_date
            ? formatDate(attributes.published_date)
            : "",
        };
      }

      // No manual index.mdx, try to auto-generate one
      // Extract base slug from path (e.g., "010-elements/010-video/how-to" -> "/docs/elements/video/how-to")
      // The path parameter is relative to docsBasePath, so we need to convert it to a URL slug
      const slugPath = path
        .replace(/(\/?\d+-)/g, "/")
        .replace(/^\//, "")
        .replace(/\/$/, ""); // Remove trailing slash
      const baseSlug = `/docs/${slugPath}`;

      const generatedContent = await generateIndexPage(mdxDir, baseSlug);
      if (generatedContent) {
        return {
          path: path.endsWith("/") ? `${path}index.mdx` : `${path}/index.mdx`,
          content: generatedContent,
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

export const getAllBlogFiles = async (): Promise<BlogPost[]> => {
  const files = await fs.readdir(blogBasePath);
  const mdxFiles = files.filter((f) => f.endsWith(".mdx"));

  const posts = await Promise.all(
    mdxFiles.map(async (file) => {
      const data = await fs.readFile(join(blogBasePath, file), "utf-8");
      const { attributes } = fm<unknown>(data);
      const parsed = BlogFrontmatterSchema.safeParse(attributes);
      if (!parsed.success) {
        throw new Error(
          `Invalid blog frontmatter in ${file}:\n${parsed.error.message}`,
        );
      }
      const fm_ = parsed.data;
      return {
        slug: file.replace(".mdx", ""),
        title: fm_.title,
        description: fm_.description,
        date: fm_.date,
        author: fm_.author,
        tags: fm_.tags,
        featured: fm_.featured,
        coverImage: fm_.coverImage,
        ogImage: fm_.ogImage,
      } satisfies BlogPost;
    }),
  );

  return posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
};

export const getBlogFile = async (slug: string): Promise<string> => {
  const filePath = join(blogBasePath, `${slug}.mdx`);
  return fs.readFile(filePath, "utf-8");
};

export const getChangelogFile = async (slug: string): Promise<string> => {
  const filePath = join(changelogsBasePath, `${slug}.mdx`);
  return fs.readFile(filePath, "utf-8");
};
