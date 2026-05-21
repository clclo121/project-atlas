#!/usr/bin/env node
import { McpServer, StdioServerTransport } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import { runCliCapture } from "./core.js";

const help = [
  "Usage: project-kb-mcp",
  "",
  "Starts the local stdio MCP server for project-kb.",
  "",
  "Tools:",
  "  project_kb_scan",
  "  project_kb_context",
  "  project_kb_stale",
  "  project_kb_propose",
  "  project_kb_review_summary",
  "",
  "No apply tool is exposed. A human must run project-kb apply in a terminal.",
].join("\n");

if (process.argv.includes("--help") || process.argv.includes("-h")) {
  console.log(help);
  process.exit(0);
}

const server = new McpServer({
  name: "project-kb-core",
  version: "0.1.0",
});

server.registerTool(
  "project_kb_scan",
  {
    title: "Project KB Scan",
    description: "Scan project shape and optional external code evidence. This tool does not write knowledge files.",
    inputSchema: z.object({
      repo: z.string().optional().describe("Git repository path. Defaults to the MCP server working directory."),
      mode: z.enum(["full", "changed"]).optional().describe("Scan mode. Defaults to full."),
      external_evidence_file: z.string().optional().describe("JSON file with external repo map or code graph evidence."),
    }),
  },
  async ({ repo, mode, external_evidence_file }) =>
    cliTool([
      "scan",
      "--repo",
      repo || process.cwd(),
      "--mode",
      mode || "full",
      ...flag("external-evidence-file", external_evidence_file),
    ]),
);

server.registerTool(
  "project_kb_context",
  {
    title: "Project KB Context",
    description: "Read a compact project-kb context pack. This tool never writes files.",
    inputSchema: z.object({
      repo: z.string().optional().describe("Git repository path. Defaults to the MCP server working directory."),
      query: z.string().optional().describe("One or more keywords. Any keyword may match."),
      source_file: z.string().optional().describe("Return knowledge docs whose source_files include this path."),
      budget: z.number().int().positive().optional().describe("Maximum context characters. Defaults to 8000."),
      format: z.enum(["markdown", "json"]).optional().describe("Output format. Defaults to markdown."),
    }),
  },
  async ({ repo, query, source_file, budget, format }) =>
    cliTool([
      "context",
      "--repo",
      repo || process.cwd(),
      ...flag("query", query),
      ...flag("source-file", source_file),
      ...flag("budget", budget),
      ...flag("format", format),
    ]),
);

server.registerTool(
  "project_kb_stale",
  {
    title: "Project KB Stale",
    description: "Check knowledge docs against source file hashes. This tool never writes files.",
    inputSchema: z.object({
      repo: z.string().optional().describe("Git repository path. Defaults to the MCP server working directory."),
      format: z.enum(["markdown", "json"]).optional().describe("Output format. Defaults to markdown."),
    }),
  },
  async ({ repo, format }) => cliTool(["stale", "--repo", repo || process.cwd(), ...flag("format", format)]),
);

server.registerTool(
  "project_kb_propose",
  {
    title: "Project KB Propose",
    description: "Create reviewable knowledge update evidence. This tool cannot apply the proposal.",
    inputSchema: z.object({
      repo: z.string().optional().describe("Git repository path. Defaults to the MCP server working directory."),
      updates_file: z.string().optional().describe("JSON file with source_files, external_evidence, and updates."),
      target: z.string().optional().describe("Single target under knowledge/**."),
      content_file: z.string().optional().describe("Markdown content for a single target."),
      external_evidence_file: z.string().optional().describe("JSON file with external repo map or code graph evidence."),
      reason: z.string().optional().describe("Human-readable proposal reason."),
      inherit_source_metadata: z.boolean().optional().describe("Merge existing target source_files into the proposal."),
    }),
  },
  async ({ repo, updates_file, target, content_file, external_evidence_file, reason, inherit_source_metadata }) => {
    const output = await cliTool([
      "propose",
      "--repo",
      repo || process.cwd(),
      ...flag("updates-file", updates_file),
      ...flag("target", target),
      ...flag("content-file", content_file),
      ...flag("external-evidence-file", external_evidence_file),
      ...flag("reason", reason),
      ...(inherit_source_metadata ? ["--inherit-source-metadata"] : []),
    ]);
    return appendText(output, "\nNo apply tool is available. A human must run project-kb apply in a terminal.");
  },
);

server.registerTool(
  "project_kb_review_summary",
  {
    title: "Project KB Review Summary",
    description: "Print reviewer-friendly proposal evidence. This tool never applies proposals.",
    inputSchema: z.object({
      repo: z.string().optional().describe("Git repository path. Defaults to the MCP server working directory."),
      proposal_id: z.string().optional().describe("Proposal id. Defaults to latest.json."),
    }),
  },
  async ({ repo, proposal_id }) => cliTool(["review-summary", "--repo", repo || process.cwd(), ...flag("proposal-id", proposal_id)]),
);

const transport = new StdioServerTransport();
await server.connect(transport);

type ToolResult = {
  isError?: boolean;
  content: Array<{ type: "text"; text: string }>;
};

let cliQueue: Promise<void> = Promise.resolve();

async function cliTool(args: string[]): Promise<ToolResult> {
  const run = async (): Promise<ToolResult> => {
    try {
      return { content: [{ type: "text", text: await runCliCapture(args) }] };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { isError: true, content: [{ type: "text", text: message }] };
    }
  };
  const result = cliQueue.then(run, run);
  cliQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function appendText(result: ToolResult, text: string): ToolResult {
  return {
    ...result,
    content: result.content.map((item, index) => (index === 0 ? { ...item, text: `${item.text}${text}` } : item)),
  };
}

function flag(name: string, value: string | number | undefined): string[] {
  if (value === undefined || value === "") {
    return [];
  }
  return [`--${name}`, String(value)];
}
