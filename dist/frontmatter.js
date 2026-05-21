export function parseFrontmatter(content) {
    if (!content.startsWith("---\n")) {
        return { metadata: null, body: content };
    }
    const end = content.indexOf("\n---", 4);
    if (end < 0) {
        return { metadata: null, body: content };
    }
    const raw = content.slice(4, end).split(/\r?\n/);
    const body = content.slice(end + 4).replace(/^\r?\n/, "");
    const metadata = { source_files: [], source_hashes: {} };
    let section = "";
    for (const line of raw) {
        if (!line.trim()) {
            continue;
        }
        if (/^[A-Za-z0-9_]+:\s*$/.test(line)) {
            const key = line.replace(":", "").trim();
            section = key === "source_files" || key === "source_hashes" ? key : "";
            continue;
        }
        if (section === "source_files" && line.trim().startsWith("- ")) {
            metadata.source_files.push(line.trim().slice(2).trim());
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
            if (key === "kb_schema")
                metadata.kb_schema = value;
            if (key === "generated_by")
                metadata.generated_by = value;
            if (key === "review_status")
                metadata.review_status = value;
        }
    }
    return { metadata, body };
}
export function buildFrontmatter(metadata) {
    const lines = ["---", `kb_schema: ${metadata.kb_schema ?? "1"}`, "source_files:"];
    for (const source of metadata.source_files) {
        lines.push(`  - ${source}`);
    }
    lines.push("source_hashes:");
    for (const [source, hash] of Object.entries(metadata.source_hashes)) {
        lines.push(`  ${source}: ${hash}`);
    }
    lines.push(`generated_by: ${metadata.generated_by ?? "project-kb"}`);
    lines.push(`review_status: ${metadata.review_status ?? "draft"}`);
    lines.push("---", "");
    return lines.join("\n");
}
export function ensureKnowledgeFrontmatter(content, metadata) {
    if (content.startsWith("---\n")) {
        return content;
    }
    return `${buildFrontmatter(metadata)}${content}`;
}
