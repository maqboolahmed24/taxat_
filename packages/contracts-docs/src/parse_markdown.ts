import path from "node:path";
import { readFile } from "node:fs/promises";

import type {
  MarkdownHeading,
  MarkdownLinkRef,
  MarkdownSection,
  ParsedMarkdownArtifact,
} from "./types.ts";
import { excerpt, relativeFromRepo, repoRoot, slugify, stripMarkdown, unique } from "./utils.ts";

const schemaTokenExpression =
  /https:\/\/taxat\.dev\/schemas\/[A-Za-z0-9_.-]+\.schema\.json|[A-Za-z0-9_.-]+\.schema\.json/g;
const sampleTokenExpression = /sample_[A-Za-z0-9_.-]+\.json/g;
const taskIdExpression = /\bpc_\d{4}\b/g;
const markdownLinkExpression = /\[([^\]]+)\]\(([^)]+)\)/g;
const headingExpression = /^(#{1,6})\s+(.+)$/;

function extractMatches(input: string, expression: RegExp) {
  return unique(Array.from(input.matchAll(expression), (match) => match[0]));
}

function createHeadingInventory(lines: string[]) {
  const headings: MarkdownHeading[] = [];
  const slugCounts = new Map<string, number>();
  const collisions: string[] = [];

  for (const line of lines) {
    const headingMatch = line.match(headingExpression);
    if (!headingMatch) {
      continue;
    }
    const text = headingMatch[2].trim();
    const baseSlug = slugify(text) || "section";
    const nextCount = (slugCounts.get(baseSlug) ?? 0) + 1;
    slugCounts.set(baseSlug, nextCount);
    if (nextCount > 1) {
      collisions.push(baseSlug);
    }
    headings.push({
      level: headingMatch[1].length,
      text,
      slug: nextCount === 1 ? baseSlug : `${baseSlug}-${nextCount}`,
    });
  }

  return {
    collisions,
    headings,
  };
}

function createSections(lines: string[], headings: MarkdownHeading[], fallbackTitle: string) {
  const sections: MarkdownSection[] = [];
  let headingIndex = -1;
  let currentHeading: MarkdownHeading | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (!currentHeading) {
      return;
    }
    const text = currentLines.join("\n").trim();
    sections.push({
      headingSlug: currentHeading.slug,
      headingText: currentHeading.text,
      level: currentHeading.level,
      lines: [...currentLines],
      plainText: stripMarkdown(text),
      excerpt: excerpt(text, 180),
      mentionedSchemaTokens: extractMatches(text, schemaTokenExpression),
      mentionedSampleTokens: extractMatches(text, sampleTokenExpression),
      mentionedTaskIds: extractMatches(text, taskIdExpression),
    });
  };

  for (const line of lines) {
    if (line.match(headingExpression)) {
      flush();
      headingIndex += 1;
      currentHeading = headings[headingIndex] ?? null;
      currentLines = [];
      continue;
    }
    if (!currentHeading) {
      currentHeading = {
        level: 1,
        text: fallbackTitle,
        slug: "overview",
      };
    }
    currentLines.push(line);
  }

  flush();
  return sections;
}

function createLinks(text: string, absolutePath: string): MarkdownLinkRef[] {
  return Array.from(text.matchAll(markdownLinkExpression), (match) => {
    const rawHref = match[2].trim().replace(/^<|>$/g, "");
    const [hrefPath, anchor = null] = rawHref.split("#");
    const external =
      hrefPath.startsWith("http://") ||
      hrefPath.startsWith("https://") ||
      hrefPath.startsWith("mailto:") ||
      rawHref.startsWith("#") ||
      hrefPath.startsWith("/");

    if (external || hrefPath.length === 0) {
      return {
        label: match[1],
        rawHref,
        resolvedPathOrNull: null,
        anchorOrNull: anchor,
      };
    }

    return {
      label: match[1],
      rawHref,
      resolvedPathOrNull: relativeFromRepo(path.resolve(path.dirname(absolutePath), hrefPath)),
      anchorOrNull: anchor,
    };
  });
}

export async function parseMarkdownArtifact(relativePath: string): Promise<ParsedMarkdownArtifact> {
  const absolutePath = path.join(repoRoot, relativePath);
  const text = await readFile(absolutePath, "utf8");
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const { collisions, headings } = createHeadingInventory(lines);
  const title =
    headings[0]?.text ??
    path.basename(relativePath, path.extname(relativePath)).replace(/[_-]+/g, " ");

  return {
    relativePath,
    title,
    headings,
    sections: createSections(lines, headings, title),
    links: createLinks(text, absolutePath),
    text,
    mentionedSchemaTokens: extractMatches(text, schemaTokenExpression),
    mentionedSampleTokens: extractMatches(text, sampleTokenExpression),
    mentionedTaskIds: extractMatches(text, taskIdExpression),
    headingCollisions: collisions,
  };
}
