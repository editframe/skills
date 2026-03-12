import fm from "front-matter";
import { readFileSync } from "node:fs";

/**
 * Extracts plain text from MDX content for search indexing.
 * Removes frontmatter, code blocks, component tags, and markdown syntax
 * while preserving headings and paragraph text.
 */
export function extractTextFromMDX(mdxContent: string): {
  content: string;
  headings: string[];
} {
  // Parse frontmatter and get body
  const { body } = fm(mdxContent);

  // Extract headings first (before removing markdown syntax)
  const headings: string[] = [];
  const headingRegex = /^#{1,6}\s+(.+)$/gm;
  let match;
  while ((match = headingRegex.exec(body)) !== null) {
    const headingText = match[1]
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1") // Remove markdown links, keep text
      .replace(/\*\*([^\*]+)\*\*/g, "$1") // Remove bold
      .replace(/\*([^\*]+)\*/g, "$1") // Remove italic
      .replace(/`([^`]+)`/g, "$1") // Remove inline code
      .trim();
    if (headingText) {
      headings.push(headingText);
    }
  }

  // Remove frontmatter (already done by fm, but ensure it's gone)
  let text = body;

  // Remove code blocks (preserve language tags in a way that's searchable)
  // Match code blocks with optional language
  text = text.replace(/```[\s\S]*?```/g, (match) => {
    // Extract language tag if present
    const langMatch = match.match(/^```(\w+)/);
    if (langMatch) {
      return ` code example ${langMatch[1]}`;
    }
    return " code example";
  });

  // Remove inline code but keep the text
  text = text.replace(/`([^`]+)`/g, "$1");

  // Remove JSX/component tags but try to preserve text content
  // Remove self-closing component tags
  text = text.replace(/<[A-Z][a-zA-Z0-9]*\s*[^>]*\/>/g, "");
  // Remove opening/closing component tags (but keep text between them)
  text = text.replace(/<[A-Z][a-zA-Z0-9]*\s*[^>]*>/g, "");
  text = text.replace(/<\/[A-Z][a-zA-Z0-9]*>/g, "");

  // Remove HTML tags but keep text content
  text = text.replace(/<[^>]+>/g, "");

  // Remove markdown links but keep link text
  text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1");

  // Remove images
  text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, "$1");

  // Remove bold/italic markdown
  text = text.replace(/\*\*([^\*]+)\*\*/g, "$1");
  text = text.replace(/\*([^\*]+)\*/g, "$1");
  text = text.replace(/__([^_]+)__/g, "$1");
  text = text.replace(/_([^_]+)_/g, "$1");

  // Remove markdown list markers
  text = text.replace(/^[\s]*[-*+]\s+/gm, "");
  text = text.replace(/^[\s]*\d+\.\s+/gm, "");

  // Remove blockquotes
  text = text.replace(/^>\s+/gm, "");

  // Remove horizontal rules
  text = text.replace(/^---$/gm, "");
  text = text.replace(/^\*\*\*$/gm, "");

  // Remove heading markers (already extracted)
  text = text.replace(/^#{1,6}\s+/gm, "");

  // Normalize whitespace
  text = text
    .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
    .replace(/[ \t]+/g, " ") // Multiple spaces/tabs to single space
    .trim();

  return {
    content: text,
    headings,
  };
}

/**
 * Extracts text from an MDX file path
 */
export function extractTextFromMDXFile(filePath: string): {
  content: string;
  headings: string[];
} {
  const fileContent = readFileSync(filePath, "utf-8");
  return extractTextFromMDX(fileContent);
}
