import type { MemoryType } from "./types.js";

export interface KnowledgeMetadata {
  kb_schema?: string;
  source_files: string[];
  source_hashes: Record<string, string>;
  generated_by?: string;
  review_status?: string;
  memory_type?: MemoryType;
  topic?: string;
  scope?: string;
  confidence?: number;
  owner?: string;
  related_docs?: string[];
}

export function parseFrontmatter(content: string): { metadata: KnowledgeMetadata | null; body: string } {
  if (!content.startsWith("---\n")) {
    return { metadata: null, body: content };
  }
  const end = content.indexOf("\n---", 4);
  if (end < 0) {
    return { metadata: null, body: content };
  }
  const raw = content.slice(4, end).split(/\r?\n/);
  const body = content.slice(end + 4).replace(/^\r?\n/, "");
  const metadata: KnowledgeMetadata = { source_files: [], source_hashes: {} };
  let section: "source_files" | "source_hashes" | "related_docs" | "" = "";
  for (const line of raw) {
    if (!line.trim()) {
      continue;
    }
    if (/^[A-Za-z0-9_]+:\s*$/.test(line)) {
      const key = line.replace(":", "").trim();
      section = key === "source_files" || key === "source_hashes" || key === "related_docs" ? key : "";
      continue;
    }
    if ((section === "source_files" || section === "related_docs") && line.trim().startsWith("- ")) {
      const item = line.trim().slice(2).trim();
      if (section === "source_files") metadata.source_files.push(item);
      if (section === "related_docs") metadata.related_docs = [...(metadata.related_docs ?? []), item];
      continue;
    }
    if (section === "source_hashes" && line.startsWith("  ")) {
      const index = line.indexOf(":");
      if (index > 0) {
        metadata.source_hashes[line.slice(0, index).trim()] = line.slice(index + 1).trim();
      }
      continue;
    }
    const index = line.indexOf(":");
    if (index > 0) {
      const key = line.slice(0, index).trim();
      const value = line.slice(index + 1).trim();
      section = "";
      if (key === "kb_schema") metadata.kb_schema = value;
      if (key === "generated_by") metadata.generated_by = value;
      if (key === "review_status") metadata.review_status = value;
      if (key === "memory_type" && isMemoryType(value)) metadata.memory_type = value;
      if (key === "topic") metadata.topic = value;
      if (key === "scope") metadata.scope = value;
      if (key === "confidence") {
        const confidence = Number(value);
        if (Number.isFinite(confidence)) metadata.confidence = confidence;
      }
      if (key === "owner") metadata.owner = value;
    }
  }
  return { metadata, body };
}

export function buildFrontmatter(metadata: KnowledgeMetadata): string {
  const lines = ["---", `kb_schema: ${metadata.kb_schema ?? "1"}`, "source_files:"];
  for (const source of metadata.source_files) {
    lines.push(`  - ${source}`);
  }
  lines.push("source_hashes:");
  for (const [source, hash] of Object.entries(metadata.source_hashes)) {
    lines.push(`  ${source}: ${hash}`);
  }
  lines.push(`generated_by: ${metadata.generated_by ?? "project-atlas"}`);
  lines.push(`review_status: ${metadata.review_status ?? "draft"}`);
  if (metadata.memory_type) lines.push(`memory_type: ${metadata.memory_type}`);
  if (metadata.topic) lines.push(`topic: ${metadata.topic}`);
  if (metadata.scope) lines.push(`scope: ${metadata.scope}`);
  if (metadata.confidence !== undefined) lines.push(`confidence: ${metadata.confidence}`);
  if (metadata.owner) lines.push(`owner: ${metadata.owner}`);
  if (metadata.related_docs?.length) {
    lines.push("related_docs:");
    for (const doc of metadata.related_docs) {
      lines.push(`  - ${doc}`);
    }
  }
  lines.push("---", "");
  return lines.join("\n");
}

export function ensureKnowledgeFrontmatter(content: string, metadata: KnowledgeMetadata): string {
  if (content.startsWith("---\n")) {
    return content;
  }
  return `${buildFrontmatter(metadata)}${content}`;
}

export function hasFrontmatter(content: string): boolean {
  return /^---\r?\n/.test(content) && /\r?\n---(?:\r?\n|$)/.test(content);
}

function isMemoryType(value: string): value is MemoryType {
  return value === "decision" || value === "experience" || value === "project_fact";
}
