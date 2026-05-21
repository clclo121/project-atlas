import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";

const projectRoot = path.resolve(import.meta.dirname, "..");
const cli = path.join(projectRoot, "dist/index.js");

function runProjectKb(args, options = {}) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd: options.cwd,
    input: options.input,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  });
}

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    input: options.input,
    encoding: "utf8",
    env: { ...process.env, FORCE_COLOR: "0" },
  });
}

function runProjectKbWithTty(args, options = {}) {
  const payload = JSON.stringify({
    node: process.execPath,
    cli,
    args,
    cwd: options.cwd,
    input: options.input ?? "",
    mutatePath: options.mutatePath,
    mutateContent: options.mutateContent,
  });
  return run(
    "python3",
    [
      "-c",
      String.raw`
import json
import os
import pty
import select
import sys
import time

payload = json.loads(sys.argv[1])
pid, fd = pty.fork()
if pid == 0:
    os.chdir(payload["cwd"])
    os.execvp(payload["node"], [payload["node"], payload["cli"], *payload["args"]])

if payload.get("mutatePath"):
    time.sleep(0.4)
    with open(payload["mutatePath"], "w", encoding="utf-8") as handle:
        handle.write(payload.get("mutateContent", "changed\n"))

if payload.get("input"):
    os.write(fd, payload["input"].encode("utf-8"))

out = bytearray()
status = 1
while True:
    ready, _, _ = select.select([fd], [], [], 0.1)
    if fd in ready:
        try:
            chunk = os.read(fd, 4096)
        except OSError:
            chunk = b""
        if chunk:
            out.extend(chunk)
    child, raw_status = os.waitpid(pid, os.WNOHANG)
    if child:
        status = os.waitstatus_to_exitcode(raw_status)
        break

sys.stdout.buffer.write(out)
sys.exit(status)
`,
      payload,
    ],
    { cwd: options.cwd },
  );
}

function makeRepo() {
  const dir = mkdtempSync(path.join(tmpdir(), "project-kb-test-"));
  run("git", ["init"], { cwd: dir });
  run("git", ["config", "user.email", "kb@example.test"], { cwd: dir });
  run("git", ["config", "user.name", "KB Test"], { cwd: dir });
  writeFileSync(path.join(dir, "README.md"), "# Demo\n\nProject introduction.\n", "utf8");
  run("git", ["add", "README.md"], { cwd: dir });
  run("git", ["commit", "-m", "init"], { cwd: dir });
  return dir;
}

function makeJavaRepo() {
  const repo = makeRepo();
  mkdirSync(path.join(repo, "src/main/java/com/example/controller"), { recursive: true });
  mkdirSync(path.join(repo, "src/main/java/com/example/service"), { recursive: true });
  mkdirSync(path.join(repo, "src/main/resources"), { recursive: true });
  writeFileSync(
    path.join(repo, "pom.xml"),
    [
      "<project>",
      "  <modelVersion>4.0.0</modelVersion>",
      "  <groupId>com.example</groupId>",
      "  <artifactId>demo-goods</artifactId>",
      "  <version>1.0.0</version>",
      "</project>",
      "",
    ].join("\n"),
    "utf8",
  );
  writeFileSync(
    path.join(repo, "src/main/java/com/example/controller/GoodsController.java"),
    "package com.example.controller;\npublic class GoodsController {}\n",
    "utf8",
  );
  writeFileSync(
    path.join(repo, "src/main/java/com/example/service/PrecisionOrderService.java"),
    "package com.example.service;\npublic class PrecisionOrderService {}\n",
    "utf8",
  );
  writeFileSync(
    path.join(repo, "src/main/resources/application-test.yml"),
    "spring:\n  application:\n    name: demo-goods\nsecret: should-not-leak\n",
    "utf8",
  );
  run("git", ["add", "."], { cwd: repo });
  run("git", ["commit", "-m", "java fixture"], { cwd: repo });
  return repo;
}

function cleanup(dir) {
  rmSync(dir, { recursive: true, force: true });
}

function initKnowledge(repo) {
  const result = runProjectKb(["init", "--repo", repo], { cwd: repo });
  assert.equal(result.status, 0, `init should pass\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
}

function readSchema(name) {
  return JSON.parse(readFileSync(path.join(projectRoot, "schema", name), "utf8"));
}

function writeExternalEvidenceFile(repo) {
  const evidenceFile = path.join(repo, "external-evidence.json");
  writeFileSync(
    evidenceFile,
    JSON.stringify(
      {
        schema_version: "1.0",
        external_evidence: [
          {
            source: "aider-repo-map",
            source_type: "repo_map",
            path: "src/main/java/com/example/service/PrecisionOrderService.java",
            symbol: "PrecisionOrderService",
            summary: "Precision order service handles order planning.",
            locator: "src/main/java/com/example/service/PrecisionOrderService.java#L1",
            confidence: 0.86,
          },
        ],
      },
      null,
      2,
    ),
    "utf8",
  );
  return evidenceFile;
}

function assertRequiredFields(schema, fields) {
  for (const field of fields) {
    assert.ok(schema.required.includes(field), `${field} should be required`);
    assert.ok(schema.properties[field], `${field} should have a schema property`);
  }
}

function createMcpSession(cwd) {
  const child = spawn(process.execPath, [path.join(projectRoot, "dist/mcp.js")], {
    cwd,
    stdio: ["pipe", "pipe", "pipe"],
    env: { ...process.env, FORCE_COLOR: "0" },
  });
  child.stderr.setEncoding("utf8");
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += chunk;
  });
  child.stdout.setEncoding("utf8");
  let nextId = 1;
  let buffer = "";
  const waiters = new Map();
  child.on("exit", (code, signal) => {
    for (const [id, waiter] of waiters.entries()) {
      waiter({
        id,
        error: {
          message: `MCP server exited before response. code=${code} signal=${signal}\nstderr:\n${stderr}`,
        },
      });
    }
    waiters.clear();
  });
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let newline = buffer.indexOf("\n");
    while (newline >= 0) {
      const line = buffer.slice(0, newline).trim();
      buffer = buffer.slice(newline + 1);
      if (line) {
        const message = JSON.parse(line);
        if (message.id && waiters.has(message.id)) {
          waiters.get(message.id)(message);
          waiters.delete(message.id);
        }
      }
      newline = buffer.indexOf("\n");
    }
  });
  const request = (method, params = {}) => {
    const id = nextId++;
    const payload = { jsonrpc: "2.0", id, method, params };
    return new Promise((resolve, reject) => {
      if (child.exitCode !== null) {
        reject(new Error(`MCP server already exited. code=${child.exitCode}\nstderr:\n${stderr}`));
        return;
      }
      const timer = setTimeout(() => {
        waiters.delete(id);
        reject(new Error(`MCP request timed out: ${method}\nstderr:\n${stderr}`));
      }, 5000);
      waiters.set(id, (message) => {
        clearTimeout(timer);
        resolve(message);
      });
      child.stdin.write(`${JSON.stringify(payload)}\n`);
    });
  };
  const notify = (method, params = {}) => {
    child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  };
  const close = () =>
    new Promise((resolve) => {
      if (child.exitCode !== null || child.signalCode !== null) {
        resolve(child.exitCode);
        return;
      }
      child.once("exit", resolve);
      child.stdin.end();
      setTimeout(() => {
        if (!child.killed) child.kill();
      }, 1000).unref();
    });
  return { request, notify, close, child };
}

test("help output and parameter errors are short and actionable", () => {
  const help = runProjectKb(["--help"], { cwd: projectRoot });
  assert.equal(help.status, 0, `global help should pass\nstdout:\n${help.stdout}\nstderr:\n${help.stderr}`);
  assert.match(help.stdout, /Usage: project-kb <command>/);
  assert.match(help.stdout, /init/);
  assert.match(help.stdout, /review-summary/);

  const contextHelp = runProjectKb(["context", "--help"], { cwd: projectRoot });
  assert.equal(contextHelp.status, 0, `context help should pass\nstdout:\n${contextHelp.stdout}\nstderr:\n${contextHelp.stderr}`);
  assert.match(contextHelp.stdout, /Usage: project-kb context/);
  assert.match(contextHelp.stdout, /--repo/);
  assert.match(contextHelp.stdout, /--query/);
  assert.match(contextHelp.stdout, /--source-file/);
  assert.match(contextHelp.stdout, /--budget/);
  assert.match(contextHelp.stdout, /--format/);

  const initHelp = runProjectKb(["init", "--help"], { cwd: projectRoot });
  assert.equal(initHelp.status, 0, `init help should pass\nstdout:\n${initHelp.stdout}\nstderr:\n${initHelp.stderr}`);
  assert.match(initHelp.stdout, /--template/);

  const proposeHelp = runProjectKb(["propose", "--help"], { cwd: projectRoot });
  assert.equal(proposeHelp.status, 0, `propose help should pass\nstdout:\n${proposeHelp.stdout}\nstderr:\n${proposeHelp.stderr}`);
  assert.match(proposeHelp.stdout, /--inherit-source-metadata/);

  const unknownCommand = runProjectKb(["unknown"], { cwd: projectRoot });
  assert.notEqual(unknownCommand.status, 0, "unknown command should fail");
  assert.match(unknownCommand.stderr, /Unknown command: unknown/);
  assert.match(unknownCommand.stderr, /Run `project-kb --help`/);
  assert.doesNotMatch(unknownCommand.stderr, /at runCli/);

  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const unknownFlag = runProjectKb(["scan", "--repo", repo, "--bad"], { cwd: repo });
    assert.notEqual(unknownFlag.status, 0, "unknown flag should fail");
    assert.match(unknownFlag.stderr, /Unknown option: --bad/);
    assert.match(unknownFlag.stderr, /Usage: project-kb scan/);

    const missingRequired = runProjectKb(["hash", "--repo", repo], { cwd: repo });
    assert.notEqual(missingRequired.status, 0, "missing required flag should fail");
    assert.match(missingRequired.stderr, /--path is required/);
    assert.match(missingRequired.stderr, /Usage: project-kb hash/);

    const invalidFormat = runProjectKb(["context", "--repo", repo, "--format", "xml"], { cwd: repo });
    assert.notEqual(invalidFormat.status, 0, "invalid format should fail");
    assert.match(invalidFormat.stderr, /--format must be markdown or json/);

    const invalidBudget = runProjectKb(["context", "--repo", repo, "--budget", "abc"], { cwd: repo });
    assert.notEqual(invalidBudget.status, 0, "invalid budget should fail");
    assert.match(invalidBudget.stderr, /--budget must be a positive number/);
  } finally {
    cleanup(repo);
  }
});

test("init requires a git repository and creates the knowledge skeleton", () => {
  const nonGit = mkdtempSync(path.join(tmpdir(), "project-kb-nongit-"));
  try {
    const failed = runProjectKb(["init", "--repo", nonGit], { cwd: nonGit });
    assert.notEqual(failed.status, 0, "init should reject non-git directories");
  } finally {
    cleanup(nonGit);
  }

  const repo = makeRepo();
  try {
    initKnowledge(repo);
    for (const rel of [
      "knowledge/README.md",
      "knowledge/index.md",
      "knowledge/manifest.json",
      "knowledge/glossary.md",
      "knowledge/project/overview.md",
      "knowledge/domains",
      "knowledge/workflows",
      "knowledge/contracts",
      "knowledge/integrations",
      "knowledge/quality",
      "knowledge/decisions",
    ]) {
      assert.ok(existsSync(path.join(repo, rel)), `${rel} should exist`);
    }
    const gitignore = readFileSync(path.join(repo, ".gitignore"), "utf8");
    assert.match(gitignore, /\.project-kb\//);
    assert.match(gitignore, /knowledge\/\*\*\/\.kbtmp\.\*/);
    const overview = readFileSync(path.join(repo, "knowledge/project/overview.md"), "utf8");
    assert.match(overview, /kb_schema:/);
    assert.match(overview, /source_files:/);
  } finally {
    cleanup(repo);
  }
});

test("init supports templates without overwriting existing knowledge files", () => {
  const generic = makeRepo();
  try {
    initKnowledge(generic);
    const overview = readFileSync(path.join(generic, "knowledge/project/overview.md"), "utf8");
    assert.match(overview, /generic service/i);
  } finally {
    cleanup(generic);
  }

  const javaRepo = makeRepo();
  try {
    const initialized = runProjectKb(["init", "--repo", javaRepo, "--template", "java-backend"], { cwd: javaRepo });
    assert.equal(initialized.status, 0, `java template init should pass\nstdout:\n${initialized.stdout}\nstderr:\n${initialized.stderr}`);
    const overview = readFileSync(path.join(javaRepo, "knowledge/project/overview.md"), "utf8");
    const domains = readFileSync(path.join(javaRepo, "knowledge/domains/README.md"), "utf8");
    assert.match(overview, /Java backend/i);
    assert.match(domains, /controller/i);
  } finally {
    cleanup(javaRepo);
  }

  const frontendRepo = makeRepo();
  try {
    const initialized = runProjectKb(["init", "--repo", frontendRepo, "--template", "frontend-app"], { cwd: frontendRepo });
    assert.equal(initialized.status, 0, `frontend template init should pass\nstdout:\n${initialized.stdout}\nstderr:\n${initialized.stderr}`);
    const overview = readFileSync(path.join(frontendRepo, "knowledge/project/overview.md"), "utf8");
    const workflows = readFileSync(path.join(frontendRepo, "knowledge/workflows/README.md"), "utf8");
    assert.match(overview, /frontend app/i);
    assert.match(workflows, /routing/i);
  } finally {
    cleanup(frontendRepo);
  }

  const invalid = makeRepo();
  try {
    const result = runProjectKb(["init", "--repo", invalid, "--template", "unknown"], { cwd: invalid });
    assert.notEqual(result.status, 0, "unknown template should fail");
    assert.match(result.stderr, /--template must be generic-service, java-backend, or frontend-app/);
  } finally {
    cleanup(invalid);
  }

  const noOverwrite = makeRepo();
  try {
    mkdirSync(path.join(noOverwrite, "knowledge/project"), { recursive: true });
    writeFileSync(path.join(noOverwrite, "knowledge/project/overview.md"), "# Custom Overview\n", "utf8");
    const initialized = runProjectKb(["init", "--repo", noOverwrite, "--template", "java-backend"], { cwd: noOverwrite });
    assert.equal(initialized.status, 0, `init should pass without overwriting\nstdout:\n${initialized.stdout}\nstderr:\n${initialized.stderr}`);
    assert.equal(readFileSync(path.join(noOverwrite, "knowledge/project/overview.md"), "utf8"), "# Custom Overview\n");
  } finally {
    cleanup(noOverwrite);
  }
});

test("scan reports project shape and redacts sensitive config values", () => {
  const repo = makeJavaRepo();
  try {
    initKnowledge(repo);
    const full = runProjectKb(["scan", "--repo", repo, "--mode", "full"], { cwd: repo });
    assert.equal(full.status, 0, `scan full should pass\nstdout:\n${full.stdout}\nstderr:\n${full.stderr}`);
    const json = JSON.parse(full.stdout);
    assert.equal(json.mode, "full");
    assert.equal(json.project.maven.artifactId, "demo-goods");
    assert.ok(json.entries.controller.some((item) => item.path.endsWith("GoodsController.java")));
    assert.ok(json.knowledge.files.includes("knowledge/manifest.json"));
    assert.ok(json.external_evidence && Array.isArray(json.external_evidence));
    assert.ok(json.sensitive_config_findings.some((item) => item.rule_category === "secret"));
    assert.doesNotMatch(full.stdout, /should-not-leak/);

    writeFileSync(
      path.join(repo, "src/main/java/com/example/service/StoreOwnedGoodsService.java"),
      "package com.example.service;\npublic class StoreOwnedGoodsService {}\n",
      "utf8",
    );
    const changed = runProjectKb(["scan", "--repo", repo, "--mode", "changed"], { cwd: repo });
    assert.equal(changed.status, 0, `scan changed should pass\nstdout:\n${changed.stdout}\nstderr:\n${changed.stderr}`);
    const changedJson = JSON.parse(changed.stdout);
    assert.ok(changedJson.changed_files.includes("src/main/java/com/example/service/StoreOwnedGoodsService.java"));
  } finally {
    cleanup(repo);
  }
});

test("scan imports external evidence and rejects invalid evidence files", () => {
  const repo = makeJavaRepo();
  try {
    initKnowledge(repo);
    const evidenceFile = writeExternalEvidenceFile(repo);
    const full = runProjectKb(["scan", "--repo", repo, "--mode", "full", "--external-evidence-file", evidenceFile], { cwd: repo });
    assert.equal(full.status, 0, `scan with external evidence should pass\nstdout:\n${full.stdout}\nstderr:\n${full.stderr}`);
    const payload = JSON.parse(full.stdout);
    assert.equal(payload.external_evidence.length, 1);
    assert.equal(payload.external_evidence[0].source, "aider-repo-map");
    assert.equal(payload.external_evidence[0].source_type, "repo_map");
    assert.equal(payload.external_evidence[0].path, "src/main/java/com/example/service/PrecisionOrderService.java");

    const invalidJson = path.join(repo, "invalid-evidence.json");
    writeFileSync(invalidJson, "{bad json", "utf8");
    const invalidJsonResult = runProjectKb(["scan", "--repo", repo, "--external-evidence-file", invalidJson], { cwd: repo });
    assert.notEqual(invalidJsonResult.status, 0, "invalid evidence JSON should fail");
    assert.match(invalidJsonResult.stderr, /external evidence file must be valid JSON/);

    const missingField = path.join(repo, "missing-field-evidence.json");
    writeFileSync(missingField, JSON.stringify({ schema_version: "1.0", external_evidence: [{ source: "repo-map", source_type: "repo_map" }] }), "utf8");
    const missingFieldResult = runProjectKb(["scan", "--repo", repo, "--external-evidence-file", missingField], { cwd: repo });
    assert.notEqual(missingFieldResult.status, 0, "missing evidence fields should fail");
    assert.match(missingFieldResult.stderr, /external_evidence item path is required/);
  } finally {
    cleanup(repo);
  }
});

test("context outputs source paths, respects priority, and supports json format", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    mkdirSync(path.join(repo, "openspec/changes/demo/specs/order"), { recursive: true });
    mkdirSync(path.join(repo, "openspec/specs/order"), { recursive: true });
    writeFileSync(path.join(repo, "openspec/changes/demo/proposal.md"), "# 进行中规格\n\norder active context\n", "utf8");
    writeFileSync(path.join(repo, "openspec/specs/order/spec.md"), "# 已归档规格\n\norder archived context\n", "utf8");
    writeFileSync(path.join(repo, "knowledge/domains/order.md"), "# 知识库订单\n\norder knowledge context\n", "utf8");

    const markdown = runProjectKb(["context", "--repo", repo, "--query", "order", "--budget", "400"], { cwd: repo });
    assert.equal(markdown.status, 0, `context markdown should pass\nstdout:\n${markdown.stdout}\nstderr:\n${markdown.stderr}`);
    assert.match(markdown.stdout, /Source: `openspec\/changes\/demo\/proposal.md`/);
    assert.ok(markdown.stdout.indexOf("openspec/changes") < markdown.stdout.indexOf("openspec/specs"));
    assert.ok(markdown.stdout.length < 500, "budget should keep output compact");

    const jsonResult = runProjectKb(["context", "--repo", repo, "--query", "order", "--format", "json"], { cwd: repo });
    assert.equal(jsonResult.status, 0, `context json should pass\nstdout:\n${jsonResult.stdout}\nstderr:\n${jsonResult.stderr}`);
    const payload = JSON.parse(jsonResult.stdout);
    assert.equal(payload.items[0].source, "openspec/changes/demo/proposal.md");
    assert.ok(payload.text.includes("order active context"));
  } finally {
    cleanup(repo);
  }
});

test("context supports multiple keywords, source lookup, source type, and truncation metadata", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    mkdirSync(path.join(repo, "openspec/changes/demo/specs/order"), { recursive: true });
    mkdirSync(path.join(repo, "openspec/specs/payment"), { recursive: true });
    mkdirSync(path.join(repo, "knowledge/domains"), { recursive: true });
    writeFileSync(path.join(repo, "openspec/changes/demo/proposal.md"), "# Order Change\n\norder active context\n", "utf8");
    writeFileSync(path.join(repo, "openspec/specs/payment/spec.md"), "# Payment Spec\n\npayment archived context\n", "utf8");
    writeFileSync(path.join(repo, "other.md"), "# Other\n", "utf8");
    writeFileSync(
      path.join(repo, "knowledge/domains/from-readme.md"),
      [
        "---",
        "kb_schema: 1",
        "source_files:",
        "  - README.md",
        "source_hashes:",
        "  README.md: sha256:missing",
        "generated_by: project-kb",
        "review_status: draft",
        "---",
        "# Readme Knowledge",
        "",
        "inventory notes from readme",
        "",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      path.join(repo, "knowledge/domains/from-other.md"),
      [
        "---",
        "kb_schema: 1",
        "source_files:",
        "  - other.md",
        "source_hashes:",
        "  other.md: sha256:missing",
        "generated_by: project-kb",
        "review_status: draft",
        "---",
        "# Other Knowledge",
        "",
        "other source notes",
        "",
      ].join("\n"),
      "utf8",
    );

    const multi = runProjectKb(["context", "--repo", repo, "--query", "order payment", "--format", "json", "--budget", "120"], { cwd: repo });
    assert.equal(multi.status, 0, `multi keyword context should pass\nstdout:\n${multi.stdout}\nstderr:\n${multi.stderr}`);
    const payload = JSON.parse(multi.stdout);
    assert.equal(payload.truncated, true);
    assert.ok(payload.budget_used <= 120, "budget_used should respect the budget");
    assert.ok(payload.items.some((item) => item.source === "openspec/changes/demo/proposal.md" && item.source_type === "openspec_change"));
    assert.ok(payload.items.some((item) => item.source === "openspec/specs/payment/spec.md" && item.source_type === "openspec_spec"));
    assert.equal(payload.items[0].source_type, "openspec_change");

    const sourceLookup = runProjectKb(["context", "--repo", repo, "--source-file", "README.md", "--format", "json"], { cwd: repo });
    assert.equal(sourceLookup.status, 0, `source lookup should pass\nstdout:\n${sourceLookup.stdout}\nstderr:\n${sourceLookup.stderr}`);
    const sourcePayload = JSON.parse(sourceLookup.stdout);
    assert.deepEqual(
      sourcePayload.items.map((item) => item.source),
      ["knowledge/domains/from-readme.md", "knowledge/project/overview.md"],
    );
    assert.ok(sourcePayload.items.every((item) => item.source_type === "knowledge"));
    assert.ok(!sourcePayload.items.some((item) => item.source === "knowledge/domains/from-other.md"));
  } finally {
    cleanup(repo);
  }
});

test("stale detects fresh, changed, missing, and metadata-less knowledge docs", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const sourceHash = runProjectKb(["hash", "--repo", repo, "--path", "README.md"], { cwd: repo });
    assert.equal(sourceHash.status, 0, `hash should pass\nstdout:\n${sourceHash.stdout}\nstderr:\n${sourceHash.stderr}`);
    mkdirSync(path.join(repo, "knowledge/domains"), { recursive: true });
    writeFileSync(
      path.join(repo, "knowledge/domains/fresh.md"),
      [
        "---",
        "kb_schema: 1",
        "source_files:",
        "  - README.md",
        "source_hashes:",
        `  README.md: ${sourceHash.stdout.trim()}`,
        "generated_by: project-kb",
        "review_status: draft",
        "---",
        "# Fresh",
        "",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(path.join(repo, "knowledge/domains/no-frontmatter.md"), "# No metadata\n", "utf8");
    writeFileSync(
      path.join(repo, "knowledge/domains/missing.md"),
      [
        "---",
        "kb_schema: 1",
        "source_files:",
        "  - missing.md",
        "source_hashes:",
        "  missing.md: sha256:missing",
        "generated_by: project-kb",
        "review_status: draft",
        "---",
        "# Missing",
        "",
      ].join("\n"),
      "utf8",
    );

    let stale = runProjectKb(["stale", "--repo", repo, "--format", "json"], { cwd: repo });
    assert.equal(stale.status, 0, `stale should pass\nstdout:\n${stale.stdout}\nstderr:\n${stale.stderr}`);
    let items = JSON.parse(stale.stdout).items;
    assert.equal(items.find((item) => item.path.endsWith("fresh.md")).status, "fresh");
    assert.equal(items.find((item) => item.path.endsWith("missing.md")).status, "missing_source");
    assert.equal(items.find((item) => item.path.endsWith("no-frontmatter.md")).status, "missing_metadata");
    assert.match(items.find((item) => item.path.endsWith("missing.md")).suggestion, /Check missing source file/);

    writeFileSync(path.join(repo, "README.md"), "# Demo changed\n", "utf8");
    stale = runProjectKb(["stale", "--repo", repo, "--format", "json"], { cwd: repo });
    items = JSON.parse(stale.stdout).items;
    assert.equal(items.find((item) => item.path.endsWith("fresh.md")).status, "stale");
    assert.match(items.find((item) => item.path.endsWith("fresh.md")).suggestion, /project-kb propose/);

    const markdown = runProjectKb(["stale", "--repo", repo], { cwd: repo });
    assert.equal(markdown.status, 0, `stale markdown should pass\nstdout:\n${markdown.stdout}\nstderr:\n${markdown.stderr}`);
    assert.match(markdown.stdout, /Suggestion:/);
  } finally {
    cleanup(repo);
  }
});

test("propose creates multi-file evidence and blocks invalid or sensitive updates", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const updatesFile = path.join(repo, "updates.json");
    writeFileSync(
      updatesFile,
      JSON.stringify(
        {
          source_files: ["README.md"],
          updates: [
            { target: "knowledge/domains/order.md", content: "# 订单域\n\n记录订单规则。\n" },
            { target: "knowledge/workflows/order-flow.md", content: "# 订单流程\n\n记录订单流程。\n" },
          ],
        },
        null,
        2,
      ),
      "utf8",
    );
    const proposed = runProjectKb(["propose", "--repo", repo, "--updates-file", updatesFile, "--reason", "新增订单知识"], { cwd: repo });
    assert.equal(proposed.status, 0, `propose should pass\nstdout:\n${proposed.stdout}\nstderr:\n${proposed.stderr}`);
    const latest = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals/latest.json"), "utf8"));
    assert.equal(latest.proposal_status, "proposed");
    assert.match(latest.proposal_hash, /^sha256:/);
    const proposal = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals", latest.proposal_id, "proposal.json"), "utf8"));
    assert.equal(proposal.operations.length, 2);
    assert.deepEqual(proposal.source_files, ["README.md"]);
    assert.match(proposal.operations[0].content, /source_hashes:/);
    const proposalSchema = readSchema("proposal.schema.json");
    assertRequiredFields(proposalSchema, [
      "proposal_id",
      "schema_version",
      "base_commit",
      "worktree_diff_hash",
      "source_files",
      "target_files",
      "operations",
      "proposal_status",
      "proposal_hash",
    ]);
    for (const field of proposalSchema.required) {
      assert.ok(Object.hasOwn(proposal, field), `proposal should contain ${field}`);
    }
    const trigger = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals", latest.proposal_id, "trigger-result.json"), "utf8"));
    const triggerSchema = readSchema("trigger-result.schema.json");
    assertRequiredFields(triggerSchema, ["proposal_id", "proposal_hash", "worktree_diff_hash", "needs_knowledge_update", "proposal_status", "updated_at"]);
    for (const field of triggerSchema.required) {
      assert.ok(Object.hasOwn(trigger, field), `trigger result should contain ${field}`);
    }

    const invalid = runProjectKb(["propose", "--repo", repo, "--target", "README.md", "--content-file", updatesFile], { cwd: repo });
    assert.notEqual(invalid.status, 0, "invalid target should fail");

    const sensitiveFile = path.join(repo, "sensitive.json");
    writeFileSync(
      sensitiveFile,
      JSON.stringify({
        source_files: ["README.md"],
        updates: [{ target: "knowledge/domains/secret.md", content: "# Secret\n\npassword: secret-value-123456\n" }],
      }),
      "utf8",
    );
    const sensitive = runProjectKb(["propose", "--repo", repo, "--updates-file", sensitiveFile, "--reason", "敏感内容测试"], { cwd: repo });
    assert.equal(sensitive.status, 0, `sensitive proposal should write blocked evidence\nstdout:\n${sensitive.stdout}\nstderr:\n${sensitive.stderr}`);
    const blocked = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals/latest.json"), "utf8"));
    assert.equal(blocked.proposal_status, "blocked_sensitive");
    const blockedText = readFileSync(path.join(repo, ".project-kb/proposals", blocked.proposal_id, "proposal.json"), "utf8");
    assert.doesNotMatch(blockedText, /secret-value-123456/);
  } finally {
    cleanup(repo);
  }
});

test("propose stores external evidence from file and updates-file, and review-summary cites it", () => {
  const repo = makeJavaRepo();
  try {
    initKnowledge(repo);
    const evidenceFile = writeExternalEvidenceFile(repo);
    const updatesFile = path.join(repo, "updates.json");
    writeFileSync(
      updatesFile,
      JSON.stringify({
        source_files: ["README.md"],
        external_evidence: [
          {
            source: "codebase-memory",
            source_type: "code_graph",
            path: "src/main/java/com/example/controller/GoodsController.java",
            summary: "Goods controller exposes goods entry points.",
          },
        ],
        updates: [{ target: "knowledge/domains/order.md", content: "# 订单域\n\n记录订单规则。\n" }],
      }),
      "utf8",
    );
    const proposed = runProjectKb(["propose", "--repo", repo, "--updates-file", updatesFile, "--external-evidence-file", evidenceFile, "--reason", "外部证据测试"], {
      cwd: repo,
    });
    assert.equal(proposed.status, 0, `propose with external evidence should pass\nstdout:\n${proposed.stdout}\nstderr:\n${proposed.stderr}`);
    const latest = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals/latest.json"), "utf8"));
    const proposal = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals", latest.proposal_id, "proposal.json"), "utf8"));
    assert.equal(proposal.external_evidence.length, 2);
    assert.ok(proposal.external_evidence.some((item) => item.source === "aider-repo-map"));
    assert.ok(proposal.external_evidence.some((item) => item.source === "codebase-memory"));

    const summary = runProjectKb(["review-summary", "--repo", repo], { cwd: repo });
    assert.equal(summary.status, 0, `review summary should pass\nstdout:\n${summary.stdout}\nstderr:\n${summary.stderr}`);
    assert.match(summary.stdout, /## External Evidence/);
    assert.match(summary.stdout, /aider-repo-map/);
    assert.match(summary.stdout, /codebase-memory/);
    assert.match(summary.stdout, /PrecisionOrderService.java/);
  } finally {
    cleanup(repo);
  }
});

test("propose can explicitly inherit existing source metadata", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    mkdirSync(path.join(repo, "docs"), { recursive: true });
    mkdirSync(path.join(repo, "knowledge/domains"), { recursive: true });
    writeFileSync(path.join(repo, "docs/new-source.md"), "# New Source\n", "utf8");
    const readmeHash = runProjectKb(["hash", "--repo", repo, "--path", "README.md"], { cwd: repo }).stdout.trim();
    writeFileSync(
      path.join(repo, "knowledge/domains/order.md"),
      [
        "---",
        "kb_schema: 1",
        "source_files:",
        "  - README.md",
        "source_hashes:",
        `  README.md: ${readmeHash}`,
        "generated_by: project-kb",
        "review_status: draft",
        "---",
        "# Existing Order",
        "",
      ].join("\n"),
      "utf8",
    );
    const updatesFile = path.join(repo, "updates.json");
    writeFileSync(
      updatesFile,
      JSON.stringify({
        source_files: ["docs/new-source.md"],
        updates: [{ target: "knowledge/domains/order.md", content: "# Updated Order\n\nnew content\n" }],
      }),
      "utf8",
    );

    const normal = runProjectKb(["propose", "--repo", repo, "--updates-file", updatesFile, "--reason", "默认不继承"], { cwd: repo });
    assert.equal(normal.status, 0, `normal propose should pass\nstdout:\n${normal.stdout}\nstderr:\n${normal.stderr}`);
    let latest = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals/latest.json"), "utf8"));
    let proposal = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals", latest.proposal_id, "proposal.json"), "utf8"));
    assert.match(proposal.operations[0].content, /  - docs\/new-source.md/);
    assert.doesNotMatch(proposal.operations[0].content, /  - README.md/);

    const inherited = runProjectKb(["propose", "--repo", repo, "--updates-file", updatesFile, "--reason", "显式继承", "--inherit-source-metadata"], { cwd: repo });
    assert.equal(inherited.status, 0, `inherited propose should pass\nstdout:\n${inherited.stdout}\nstderr:\n${inherited.stderr}`);
    latest = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals/latest.json"), "utf8"));
    proposal = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals", latest.proposal_id, "proposal.json"), "utf8"));
    assert.match(proposal.operations[0].content, /  - README.md/);
    assert.match(proposal.operations[0].content, /  - docs\/new-source.md/);
    assert.match(proposal.operations[0].content, new RegExp(`README\\.md: ${readmeHash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  } finally {
    cleanup(repo);
  }
});

test("apply requires tty confirmation, blocks stale worktree, and records applied hash", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const contentFile = path.join(repo, "content.md");
    writeFileSync(contentFile, "# 协作边界\n\n记录协作边界。\n", "utf8");
    const proposed = runProjectKb(
      ["propose", "--repo", repo, "--target", "knowledge/integrations/upstream.md", "--content-file", contentFile, "--reason", "新增协作边界"],
      { cwd: repo },
    );
    assert.equal(proposed.status, 0, `propose should pass\nstdout:\n${proposed.stdout}\nstderr:\n${proposed.stderr}`);
    let latest = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals/latest.json"), "utf8"));

    const nonTty = runProjectKb(["apply", "--repo", repo, "--proposal-id", latest.proposal_id, "--confirm"], { cwd: repo, input: "yes\n" });
    assert.notEqual(nonTty.status, 0, "non-tty apply should fail");
    assert.ok(!existsSync(path.join(repo, "knowledge/integrations/upstream.md")));

    const cancel = runProjectKbWithTty(["apply", "--repo", repo, "--proposal-id", latest.proposal_id, "--confirm"], {
      cwd: repo,
      input: "no\n",
    });
    assert.notEqual(cancel.status, 0, "cancelled apply should fail");
    assert.ok(!existsSync(path.join(repo, "knowledge/integrations/upstream.md")));

    const staleApply = runProjectKbWithTty(["apply", "--repo", repo, "--proposal-id", latest.proposal_id, "--confirm"], {
      cwd: repo,
      input: "yes\n",
      mutatePath: contentFile,
      mutateContent: "# changed during confirmation\n",
    });
    assert.notEqual(staleApply.status, 0, "apply should fail after worktree changes");
    assert.match(staleApply.stdout + staleApply.stderr, /worktree/);

    const reproposed = runProjectKb(
      ["propose", "--repo", repo, "--target", "knowledge/integrations/upstream.md", "--content-file", contentFile, "--reason", "重新生成协作边界"],
      { cwd: repo },
    );
    assert.equal(reproposed.status, 0, `re-propose should pass\nstdout:\n${reproposed.stdout}\nstderr:\n${reproposed.stderr}`);
    latest = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals/latest.json"), "utf8"));
    const applied = runProjectKbWithTty(["apply", "--repo", repo, "--proposal-id", latest.proposal_id, "--confirm"], {
      cwd: repo,
      input: "yes\n",
    });
    assert.equal(applied.status, 0, `apply should pass\nstdout:\n${applied.stdout}\nstderr:\n${applied.stderr}`);
    assert.ok(existsSync(path.join(repo, "knowledge/integrations/upstream.md")));
    const latestAfter = JSON.parse(readFileSync(path.join(repo, ".project-kb/proposals/latest.json"), "utf8"));
    assert.equal(latestAfter.proposal_status, "applied");
    assert.match(latestAfter.applied_hash, /^sha256:/);
  } finally {
    cleanup(repo);
  }
});

test("schema files are valid JSON and expose the versioned public shapes", () => {
  const schemaFiles = readdirSync(path.join(projectRoot, "schema")).filter((file) => file.endsWith(".schema.json")).sort();
  assert.deepEqual(schemaFiles, ["context-pack.schema.json", "external-evidence.schema.json", "manifest.schema.json", "proposal.schema.json", "trigger-result.schema.json"]);
  for (const file of schemaFiles) {
    const schema = readSchema(file);
    assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
    assert.equal(schema.type, "object");
    assert.equal(schema.additionalProperties, false);
    assert.equal(schema.properties.schema_version.const, "1.0");
  }
  const externalEvidenceSchema = readSchema("external-evidence.schema.json");
  assertRequiredFields(externalEvidenceSchema, ["schema_version", "external_evidence"]);
  const itemSchema = externalEvidenceSchema.properties.external_evidence.items;
  for (const field of ["source", "source_type", "path"]) {
    assert.ok(itemSchema.required.includes(field), `${field} should be required on external evidence items`);
    assert.ok(itemSchema.properties[field], `${field} should have an item schema property`);
  }
  const proposalSchema = readSchema("proposal.schema.json");
  assert.ok(proposalSchema.properties.external_evidence, "proposal schema should include external_evidence");
});

test("OpenCode adapter exposes only non-apply tools and proposes terminal apply", () => {
  const toolsDir = path.join(projectRoot, "adapters/opencode/tools");
  const tools = readdirSync(toolsDir).filter((file) => file.endsWith(".js")).sort();
  assert.deepEqual(tools, ["project_kb_context.js", "project_kb_propose.js", "project_kb_scan.js"]);
  assert.ok(!tools.some((file) => file.includes("apply")), "adapter must not expose an apply tool");

  const scanTool = readFileSync(path.join(toolsDir, "project_kb_scan.js"), "utf8");
  const contextTool = readFileSync(path.join(toolsDir, "project_kb_context.js"), "utf8");
  const proposeTool = readFileSync(path.join(toolsDir, "project_kb_propose.js"), "utf8");
  assert.match(scanTool, /\["scan", "--repo"/);
  assert.match(contextTool, /\["context", "--repo"/);
  assert.match(proposeTool, /\["propose", "--repo"/);
  assert.match(proposeTool, /No apply tool is available/);
  assert.match(proposeTool, /human must run project-kb apply in a terminal/i);
  assert.doesNotMatch(`${scanTool}\n${contextTool}\n${proposeTool}`, /\["apply", "--repo"/);
});

test("ecosystem adapter docs expose only safe MCP or CLI entrypoints", () => {
  const adapterDirs = ["claude-code", "cursor", "continue"];
  for (const adapter of adapterDirs) {
    const readmePath = path.join(projectRoot, "adapters", adapter, "README.md");
    assert.ok(existsSync(readmePath), `${adapter} README should exist`);
    const text = readFileSync(readmePath, "utf8");
    assert.match(text, /project-kb-mcp|project-kb scan|project-kb context|project-kb propose/);
    assert.doesNotMatch(text, /project_kb_apply/);
    assert.doesNotMatch(text, /"apply"/);
    assert.doesNotMatch(text, /\["apply"/);
    assert.match(text, /apply .*terminal|terminal .*apply|人工.*终端/i);
  }
});

test("MCP server exposes only safe tools and can call scan, context, and propose", async () => {
  const repo = makeJavaRepo();
  const session = createMcpSession(repo);
  try {
    initKnowledge(repo);
    const initialized = await session.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "project-kb-test", version: "1.0.0" },
    });
    assert.ok(initialized.result, `initialize should return a result: ${JSON.stringify(initialized)}`);
    session.notify("notifications/initialized");

    const listed = await session.request("tools/list");
    const toolNames = listed.result.tools.map((tool) => tool.name).sort();
    assert.deepEqual(toolNames, [
      "project_kb_context",
      "project_kb_propose",
      "project_kb_review_summary",
      "project_kb_scan",
      "project_kb_stale",
    ]);
    assert.ok(!toolNames.some((name) => name.includes("apply")), "MCP server must not expose apply");

    const scan = await session.request("tools/call", {
      name: "project_kb_scan",
      arguments: { repo, mode: "full" },
    });
    const scanText = scan.result.content[0].text;
    assert.match(scanText, /"mode": "full"/);
    assert.match(scanText, /demo-goods/);

    const context = await session.request("tools/call", {
      name: "project_kb_context",
      arguments: { repo, query: "Demo", format: "json", budget: 800 },
    });
    assert.match(context.result.content[0].text, /schema_version/);

    const updatesFile = path.join(repo, "mcp-updates.json");
    writeFileSync(
      updatesFile,
      JSON.stringify({
        source_files: ["README.md"],
        updates: [{ target: "knowledge/domains/mcp.md", content: "# MCP 知识\n\n记录 MCP 调用。\n" }],
      }),
      "utf8",
    );
    const propose = await session.request("tools/call", {
      name: "project_kb_propose",
      arguments: { repo, updates_file: updatesFile, reason: "MCP proposal" },
    });
    assert.match(propose.result.content[0].text, /proposal_id:/);
    assert.match(propose.result.content[0].text, /human must run project-kb apply in a terminal/i);
  } finally {
    await session.close();
    cleanup(repo);
  }
});

test("review-summary gives reviewer-friendly markdown evidence", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const updatesFile = path.join(repo, "updates.json");
    writeFileSync(
      updatesFile,
      JSON.stringify({
        source_files: ["README.md"],
        updates: [{ target: "knowledge/domains/order.md", content: "# 订单域\n\n记录订单规则。\n" }],
      }),
      "utf8",
    );
    const proposed = runProjectKb(["propose", "--repo", repo, "--updates-file", updatesFile, "--reason", "review summary 测试"], { cwd: repo });
    assert.equal(proposed.status, 0, `propose should pass\nstdout:\n${proposed.stdout}\nstderr:\n${proposed.stderr}`);
    const summary = runProjectKb(["review-summary", "--repo", repo], { cwd: repo });
    assert.equal(summary.status, 0, `review summary should pass\nstdout:\n${summary.stdout}\nstderr:\n${summary.stderr}`);
    assert.match(summary.stdout, /# Project KB Review Summary/);
    assert.match(summary.stdout, /review summary 测试/);
    assert.match(summary.stdout, /README.md/);
    assert.match(summary.stdout, /knowledge\/domains\/order.md/);
    assert.match(summary.stdout, /stale/i);
    assert.match(summary.stdout, /## Dry Run Summary/);
    assert.match(summary.stdout, /## Review Decision/);
    assert.match(summary.stdout, /## Apply Safety/);
    assert.match(summary.stdout, /can_apply: yes/);
    assert.match(summary.stdout, /project-kb apply/);
  } finally {
    cleanup(repo);
  }
});
