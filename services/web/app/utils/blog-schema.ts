import { z } from "zod";

export const AuthorSchema = z.object({
  name: z.string(),
  bio: z.string(),
  avatar: z.string(),
  twitter: z.string().optional(),
  github: z.string().optional(),
});

export type Author = z.infer<typeof AuthorSchema>;
export type AuthorMap = Record<string, Author>;

export const BlogFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string(),
  author: z.string(),
  tags: z.array(z.string()).default([]),
  featured: z.boolean().default(false),
  coverImage: z.string().optional(),
  ogImage: z.string().optional(),
});

export type BlogFrontmatter = z.infer<typeof BlogFrontmatterSchema>;

export const ChangelogFrontmatterSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string(),
  version: z.string().optional(),
  tags: z.array(z.string()).default([]),
});

export type ChangelogFrontmatter = z.infer<typeof ChangelogFrontmatterSchema>;

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  tags: string[];
  featured: boolean;
  coverImage?: string;
  ogImage?: string;
}

export interface ChangelogEntry {
  slug: string;
  title: string;
  description: string;
  date: string;
  version?: string;
  tags: string[];
}
