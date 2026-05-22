import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { pathToFileURL } from "node:url";

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
  const dir = mkdtempSync(path.join(tmpdir(), "project-atlas-test-"));
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

function writeMemoryCandidateFile(repo, override = {}) {
  const candidateFile = path.join(repo, `memory-candidate-${Math.floor(Math.random() * 100000)}.json`);
  const payload = {
    schema_version: "1.0",
    source_files: ["README.md"],
    memories: [
      {
        target: "knowledge/decisions/source-review.md",
        memory_type: "decision",
        topic: "source review",
        scope: "project",
        confidence: 0.92,
        summary: "Source review must be traceable.",
        body: "Source review memories must keep source files and hashes before they enter shared knowledge.",
        owner: "platform-team",
        related_docs: ["knowledge/project/overview.md"],
      },
    ],
    ...override,
  };
  writeFileSync(candidateFile, JSON.stringify(payload, null, 2), "utf8");
  return candidateFile;
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
  assert.match(help.stdout, /Usage: project-atlas <command>/);
  assert.match(help.stdout, /init/);
  assert.match(help.stdout, /review-summary/);

  const contextHelp = runProjectKb(["context", "--help"], { cwd: projectRoot });
  assert.equal(contextHelp.status, 0, `context help should pass\nstdout:\n${contextHelp.stdout}\nstderr:\n${contextHelp.stderr}`);
  assert.match(contextHelp.stdout, /Usage: project-atlas context/);
  assert.match(contextHelp.stdout, /--repo/);
  assert.match(contextHelp.stdout, /--query/);
  assert.match(contextHelp.stdout, /--source-file/);
  assert.match(contextHelp.stdout, /--budget/);
  assert.match(contextHelp.stdout, /--format/);
  assert.match(contextHelp.stdout, /--memory-type/);
  assert.match(contextHelp.stdout, /--topic/);
  assert.match(contextHelp.stdout, /--scope/);

  const initHelp = runProjectKb(["init", "--help"], { cwd: projectRoot });
  assert.equal(initHelp.status, 0, `init help should pass\nstdout:\n${initHelp.stdout}\nstderr:\n${initHelp.stderr}`);
  assert.match(initHelp.stdout, /--template/);

  const proposeHelp = runProjectKb(["propose", "--help"], { cwd: projectRoot });
  assert.equal(proposeHelp.status, 0, `propose help should pass\nstdout:\n${proposeHelp.stdout}\nstderr:\n${proposeHelp.stderr}`);
  assert.match(proposeHelp.stdout, /--inherit-source-metadata/);

  const rememberHelp = runProjectKb(["remember", "--help"], { cwd: projectRoot });
  assert.equal(rememberHelp.status, 0, `remember help should pass\nstdout:\n${rememberHelp.stdout}\nstderr:\n${rememberHelp.stderr}`);
  assert.match(rememberHelp.stdout, /--candidate-file/);
  assert.match(rememberHelp.stdout, /--replace-existing/);

  const checkHelp = runProjectKb(["check", "--help"], { cwd: projectRoot });
  assert.equal(checkHelp.status, 0, `check help should pass\nstdout:\n${checkHelp.stdout}\nstderr:\n${checkHelp.stderr}`);
  assert.match(checkHelp.stdout, /Usage: project-atlas check/);

  const unknownCommand = runProjectKb(["unknown"], { cwd: projectRoot });
  assert.notEqual(unknownCommand.status, 0, "unknown command should fail");
  assert.match(unknownCommand.stderr, /Unknown command: unknown/);
  assert.match(unknownCommand.stderr, /Run `project-atlas --help`/);
  assert.doesNotMatch(unknownCommand.stderr, /at runCli/);

  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const unknownFlag = runProjectKb(["scan", "--repo", repo, "--bad"], { cwd: repo });
    assert.notEqual(unknownFlag.status, 0, "unknown flag should fail");
    assert.match(unknownFlag.stderr, /Unknown option: --bad/);
    assert.match(unknownFlag.stderr, /Usage: project-atlas scan/);

    const missingRequired = runProjectKb(["hash", "--repo", repo], { cwd: repo });
    assert.notEqual(missingRequired.status, 0, "missing required flag should fail");
    assert.match(missingRequired.stderr, /--path is required/);
    assert.match(missingRequired.stderr, /Usage: project-atlas hash/);

    const invalidFormat = runProjectKb(["context", "--repo", repo, "--format", "xml"], { cwd: repo });
    assert.notEqual(invalidFormat.status, 0, "invalid format should fail");
    assert.match(invalidFormat.stderr, /--format must be markdown or json/);

    const invalidBudget = runProjectKb(["context", "--repo", repo, "--budget", "abc"], { cwd: repo });
    assert.notEqual(invalidBudget.status, 0, "invalid budget should fail");
    assert.match(invalidBudget.stderr, /--budget must be a positive number/);

    const invalidMemoryType = runProjectKb(["context", "--repo", repo, "--memory-type", "personal"], { cwd: repo });
    assert.notEqual(invalidMemoryType.status, 0, "invalid memory type should fail");
    assert.match(invalidMemoryType.stderr, /--memory-type must be decision, experience, or project_fact/);
  } finally {
    cleanup(repo);
  }
});

test("init requires a git repository and creates the knowledge skeleton", () => {
  const nonGit = mkdtempSync(path.join(tmpdir(), "project-atlas-nongit-"));
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
    assert.match(gitignore, /\.project-atlas\//);
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
        "generated_by: project-atlas",
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
        "generated_by: project-atlas",
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

test("context can filter project memories by metadata", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const readmeHash = runProjectKb(["hash", "--repo", repo, "--path", "README.md"], { cwd: repo }).stdout.trim();
    mkdirSync(path.join(repo, "knowledge/decisions"), { recursive: true });
    mkdirSync(path.join(repo, "knowledge/domains"), { recursive: true });
    mkdirSync(path.join(repo, "openspec/changes/demo"), { recursive: true });
    writeFileSync(path.join(repo, "openspec/changes/demo/proposal.md"), "# Payment Change\n\npayment retry active context\n", "utf8");
    writeFileSync(
      path.join(repo, "knowledge/decisions/payment-memory.md"),
      [
        "---",
        "kb_schema: 1",
        "source_files:",
        "  - README.md",
        "source_hashes:",
        `  README.md: ${readmeHash}`,
        "generated_by: project-atlas",
        "review_status: draft",
        "memory_type: decision",
        "topic: payment retry",
        "scope: backend",
        "confidence: 0.88",
        "owner: platform-team",
        "related_docs:",
        "  - knowledge/project/overview.md",
        "---",
        "# Payment Retry",
        "",
        "payment retry memory context",
        "",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      path.join(repo, "knowledge/domains/order-memory.md"),
      [
        "---",
        "kb_schema: 1",
        "source_files:",
        "  - README.md",
        "source_hashes:",
        `  README.md: ${readmeHash}`,
        "generated_by: project-atlas",
        "review_status: draft",
        "memory_type: project_fact",
        "topic: order",
        "scope: backend",
        "confidence: 0.8",
        "---",
        "# Order Memory",
        "",
        "order memory context",
        "",
      ].join("\n"),
      "utf8",
    );

    const result = runProjectKb(
      ["context", "--repo", repo, "--query", "payment", "--memory-type", "decision", "--topic", "retry", "--scope", "backend", "--format", "json"],
      { cwd: repo },
    );
    assert.equal(result.status, 0, `context filter should pass\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`);
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(payload.items.map((item) => item.source), ["knowledge/decisions/payment-memory.md"]);
    assert.equal(payload.items[0].metadata.memory_type, "decision");
    assert.equal(payload.items[0].metadata.topic, "payment retry");
    assert.equal(payload.items[0].metadata.scope, "backend");
    assert.equal(payload.items[0].metadata.confidence, 0.88);
    assert.deepEqual(payload.items[0].metadata.related_docs, ["knowledge/project/overview.md"]);
    assert.doesNotMatch(payload.text, /payment retry active context/);
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
        "generated_by: project-atlas",
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
        "generated_by: project-atlas",
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
    assert.match(items.find((item) => item.path.endsWith("fresh.md")).suggestion, /project-atlas propose/);

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
    const latest = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals/latest.json"), "utf8"));
    assert.equal(latest.proposal_status, "proposed");
    assert.match(latest.proposal_hash, /^sha256:/);
    const proposal = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals", latest.proposal_id, "proposal.json"), "utf8"));
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
    const trigger = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals", latest.proposal_id, "trigger-result.json"), "utf8"));
    const triggerSchema = readSchema("trigger-result.schema.json");
    assertRequiredFields(triggerSchema, ["proposal_id", "proposal_hash", "worktree_diff_hash", "needs_knowledge_update", "proposal_status", "updated_at"]);
    for (const field of triggerSchema.required) {
      assert.ok(Object.hasOwn(trigger, field), `trigger result should contain ${field}`);
    }

    const invalid = runProjectKb(["propose", "--repo", repo, "--target", "README.md", "--content-file", updatesFile], { cwd: repo });
    assert.notEqual(invalid.status, 0, "invalid target should fail");

    const invalidSourceFile = path.join(repo, "invalid-source.json");
    writeFileSync(
      invalidSourceFile,
      JSON.stringify({
        source_files: ["../outside.md"],
        updates: [{ target: "knowledge/domains/invalid-source.md", content: "# Invalid Source\n" }],
      }),
      "utf8",
    );
    const invalidSource = runProjectKb(["propose", "--repo", repo, "--updates-file", invalidSourceFile, "--reason", "bad source"], { cwd: repo });
    assert.notEqual(invalidSource.status, 0, "source paths outside the repo should fail");
    assert.match(invalidSource.stderr, /source_files item must stay inside the repository/);

    const localEvidenceSourceFile = path.join(repo, "local-evidence-source.json");
    writeFileSync(
      localEvidenceSourceFile,
      JSON.stringify({
        source_files: [".project-atlas/proposals/.keep"],
        updates: [{ target: "knowledge/domains/local-evidence.md", content: "# Local Evidence\n" }],
      }),
      "utf8",
    );
    const localEvidenceSource = runProjectKb(["propose", "--repo", repo, "--updates-file", localEvidenceSourceFile, "--reason", "bad local source"], { cwd: repo });
    assert.notEqual(localEvidenceSource.status, 0, "local evidence paths should not be accepted as sources");
    assert.match(localEvidenceSource.stderr, /source_files item cannot reference local evidence or Git metadata paths/);

    const duplicateTargetFile = path.join(repo, "duplicate-target.json");
    writeFileSync(
      duplicateTargetFile,
      JSON.stringify({
        source_files: ["README.md"],
        updates: [
          { target: "knowledge/domains/duplicate.md", content: "# First\n" },
          { target: "knowledge/domains/duplicate.md", content: "# Second\n" },
        ],
      }),
      "utf8",
    );
    const duplicateTarget = runProjectKb(["propose", "--repo", repo, "--updates-file", duplicateTargetFile, "--reason", "duplicate"], { cwd: repo });
    assert.notEqual(duplicateTarget.status, 0, "duplicate proposal targets should fail");
    assert.match(duplicateTarget.stderr, /duplicate proposal target/);

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
    const blocked = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals/latest.json"), "utf8"));
    assert.equal(blocked.proposal_status, "blocked_sensitive");
    const blockedText = readFileSync(path.join(repo, ".project-atlas/proposals", blocked.proposal_id, "proposal.json"), "utf8");
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
    const latest = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals/latest.json"), "utf8"));
    const proposal = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals", latest.proposal_id, "proposal.json"), "utf8"));
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
        "generated_by: project-atlas",
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
    let latest = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals/latest.json"), "utf8"));
    let proposal = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals", latest.proposal_id, "proposal.json"), "utf8"));
    assert.match(proposal.operations[0].content, /  - docs\/new-source.md/);
    assert.doesNotMatch(proposal.operations[0].content, /  - README.md/);

    const inherited = runProjectKb(["propose", "--repo", repo, "--updates-file", updatesFile, "--reason", "显式继承", "--inherit-source-metadata"], { cwd: repo });
    assert.equal(inherited.status, 0, `inherited propose should pass\nstdout:\n${inherited.stdout}\nstderr:\n${inherited.stderr}`);
    latest = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals/latest.json"), "utf8"));
    proposal = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals", latest.proposal_id, "proposal.json"), "utf8"));
    assert.match(proposal.operations[0].content, /  - README.md/);
    assert.match(proposal.operations[0].content, /  - docs\/new-source.md/);
    assert.match(proposal.operations[0].content, new RegExp(`README\\.md: ${readmeHash.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
  } finally {
    cleanup(repo);
  }
});

test("remember creates reviewable memory proposals with metadata", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const candidateFile = writeMemoryCandidateFile(repo);
    const remembered = runProjectKb(["remember", "--repo", repo, "--candidate-file", candidateFile, "--reason", "沉淀项目记忆", "--format", "json"], { cwd: repo });
    assert.equal(remembered.status, 0, `remember should pass\nstdout:\n${remembered.stdout}\nstderr:\n${remembered.stderr}`);
    const output = JSON.parse(remembered.stdout);
    assert.equal(output.proposal_status, "proposed");
    assert.match(output.apply_command, /project-atlas apply/);
    assert.deepEqual(output.target_files, ["knowledge/decisions/source-review.md"]);

    const proposal = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals", output.proposal_id, "proposal.json"), "utf8"));
    const content = proposal.operations[0].content;
    assert.match(content, /memory_type: decision/);
    assert.match(content, /topic: source review/);
    assert.match(content, /scope: project/);
    assert.match(content, /confidence: 0\.92/);
    assert.match(content, /owner: platform-team/);
    assert.match(content, /related_docs:\n  - knowledge\/project\/overview.md/);
    assert.match(content, /# Source review must be traceable\./);
    assert.match(content, /Source review memories must keep source files and hashes/);
    assert.deepEqual(proposal.source_files, ["README.md"]);
    assert.match(proposal.source_hashes["README.md"], /^sha256:/);

    writeFileSync(path.join(repo, "knowledge/decisions/existing.md"), "# Existing\n", "utf8");
    const existingCandidate = writeMemoryCandidateFile(repo, {
      memories: [
        {
          target: "knowledge/decisions/existing.md",
          memory_type: "experience",
          topic: "existing memory",
          scope: "project",
          confidence: 0.6,
          summary: "Existing memory replacement.",
          body: "Existing memory replacement body.",
        },
      ],
    });
    const blocked = runProjectKb(["remember", "--repo", repo, "--candidate-file", existingCandidate, "--reason", "默认不覆盖"], { cwd: repo });
    assert.notEqual(blocked.status, 0, "remember should reject existing targets by default");
    assert.match(blocked.stderr, /already exists/);

    const replaced = runProjectKb(["remember", "--repo", repo, "--candidate-file", existingCandidate, "--reason", "显式覆盖", "--replace-existing"], { cwd: repo });
    assert.equal(replaced.status, 0, `remember replace should pass\nstdout:\n${replaced.stdout}\nstderr:\n${replaced.stderr}`);
    assert.match(replaced.stdout, /proposal_id:/);
  } finally {
    cleanup(repo);
  }
});

test("remember validates memory candidate shape and target safety", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const invalidTarget = writeMemoryCandidateFile(repo, {
      memories: [
        {
          target: "README.md",
          memory_type: "decision",
          topic: "bad target",
          scope: "project",
          confidence: 0.9,
          summary: "Bad target.",
          body: "Bad target body.",
        },
      ],
    });
    const badTargetResult = runProjectKb(["remember", "--repo", repo, "--candidate-file", invalidTarget, "--reason", "bad"], { cwd: repo });
    assert.notEqual(badTargetResult.status, 0, "invalid target should fail");
    assert.match(badTargetResult.stderr, /proposal target must be under knowledge/);

    const invalidConfidence = writeMemoryCandidateFile(repo, {
      memories: [
        {
          target: "knowledge/decisions/bad-confidence.md",
          memory_type: "decision",
          topic: "bad confidence",
          scope: "project",
          confidence: 1.2,
          summary: "Bad confidence.",
          body: "Bad confidence body.",
        },
      ],
    });
    const confidenceResult = runProjectKb(["remember", "--repo", repo, "--candidate-file", invalidConfidence, "--reason", "bad"], { cwd: repo });
    assert.notEqual(confidenceResult.status, 0, "invalid confidence should fail");
    assert.match(confidenceResult.stderr, /confidence must be a number between 0 and 1/);

    const missingField = writeMemoryCandidateFile(repo, {
      memories: [
        {
          target: "knowledge/decisions/missing.md",
          memory_type: "decision",
          scope: "project",
          confidence: 0.8,
          summary: "Missing topic.",
          body: "Missing topic body.",
        },
      ],
    });
    const missingResult = runProjectKb(["remember", "--repo", repo, "--candidate-file", missingField, "--reason", "bad"], { cwd: repo });
    assert.notEqual(missingResult.status, 0, "missing required field should fail");
    assert.match(missingResult.stderr, /memory item topic is required/);

    const injectedFrontmatter = writeMemoryCandidateFile(repo, {
      memories: [
        {
          target: "knowledge/decisions/frontmatter-injection.md",
          memory_type: "decision",
          topic: "safe topic\nreview_status: applied",
          scope: "project",
          confidence: 0.8,
          summary: "Injected metadata.",
          body: "Injected metadata body.",
        },
      ],
    });
    const injectionResult = runProjectKb(["remember", "--repo", repo, "--candidate-file", injectedFrontmatter, "--reason", "bad"], { cwd: repo });
    assert.notEqual(injectionResult.status, 0, "frontmatter scalar injection should fail");
    assert.match(injectionResult.stderr, /memory item topic must not contain line breaks/);

    const outsideSource = writeMemoryCandidateFile(repo, { source_files: ["../outside.md"] });
    const outsideSourceResult = runProjectKb(["remember", "--repo", repo, "--candidate-file", outsideSource, "--reason", "bad"], { cwd: repo });
    assert.notEqual(outsideSourceResult.status, 0, "memory source outside the repo should fail");
    assert.match(outsideSourceResult.stderr, /source_files item must stay inside the repository/);

    const driveSource = writeMemoryCandidateFile(repo, { source_files: ["C:local-only.md"] });
    const driveSourceResult = runProjectKb(["remember", "--repo", repo, "--candidate-file", driveSource, "--reason", "bad"], { cwd: repo });
    assert.notEqual(driveSourceResult.status, 0, "drive-letter source paths should fail");
    assert.match(driveSourceResult.stderr, /source_files item must be a repository-relative path/);

    writeFileSync(path.join(repo, "knowledge/decisions/existing-bool.md"), "# Existing\n", "utf8");
    const existingCandidate = writeMemoryCandidateFile(repo, {
      memories: [
        {
          target: "knowledge/decisions/existing-bool.md",
          memory_type: "decision",
          topic: "existing bool",
          scope: "project",
          confidence: 0.8,
          summary: "Existing bool.",
          body: "Existing bool body.",
        },
      ],
    });
    const booleanValueResult = runProjectKb(["remember", "--repo", repo, "--candidate-file", existingCandidate, "--reason", "bad", "--replace-existing", "false"], { cwd: repo });
    assert.notEqual(booleanValueResult.status, 0, "boolean flags should reject explicit values");
    assert.match(booleanValueResult.stderr, /--replace-existing does not take a value/);

    const duplicateTarget = writeMemoryCandidateFile(repo, {
      memories: [
        {
          target: "knowledge/decisions/duplicate-memory.md",
          memory_type: "decision",
          topic: "duplicate one",
          scope: "project",
          confidence: 0.8,
          summary: "Duplicate one.",
          body: "Duplicate body one.",
        },
        {
          target: "knowledge/decisions/duplicate-memory.md",
          memory_type: "experience",
          topic: "duplicate two",
          scope: "project",
          confidence: 0.7,
          summary: "Duplicate two.",
          body: "Duplicate body two.",
        },
      ],
    });
    const duplicateResult = runProjectKb(["remember", "--repo", repo, "--candidate-file", duplicateTarget, "--reason", "bad"], { cwd: repo });
    assert.notEqual(duplicateResult.status, 0, "duplicate memory targets should fail");
    assert.match(duplicateResult.stderr, /duplicate proposal target/);
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
    let latest = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals/latest.json"), "utf8"));

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
    latest = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals/latest.json"), "utf8"));
    const applied = runProjectKbWithTty(["apply", "--repo", repo, "--proposal-id", latest.proposal_id, "--confirm"], {
      cwd: repo,
      input: "yes\n",
    });
    assert.equal(applied.status, 0, `apply should pass\nstdout:\n${applied.stdout}\nstderr:\n${applied.stderr}`);
    assert.ok(existsSync(path.join(repo, "knowledge/integrations/upstream.md")));
    const latestAfter = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals/latest.json"), "utf8"));
    assert.equal(latestAfter.proposal_status, "applied");
    assert.match(latestAfter.applied_hash, /^sha256:/);
  } finally {
    cleanup(repo);
  }
});

test("apply blocks proposals when source evidence changed after creation", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const updatesFile = path.join(repo, "updates.json");
    writeFileSync(
      updatesFile,
      JSON.stringify({
        source_files: ["README.md"],
        updates: [{ target: "knowledge/domains/source-safety.md", content: "# 来源安全\n\n记录来源校验。\n" }],
      }),
      "utf8",
    );
    const proposed = runProjectKb(["propose", "--repo", repo, "--updates-file", updatesFile, "--reason", "来源变更保护"], { cwd: repo });
    assert.equal(proposed.status, 0, `propose should pass\nstdout:\n${proposed.stdout}\nstderr:\n${proposed.stderr}`);
    const latest = JSON.parse(readFileSync(path.join(repo, ".project-atlas/proposals/latest.json"), "utf8"));

    writeFileSync(path.join(repo, "README.md"), "# Demo\n\nProject introduction changed after proposal.\n", "utf8");
    run("git", ["add", "README.md"], { cwd: repo });
    run("git", ["commit", "-m", "change source evidence"], { cwd: repo });

    const applied = runProjectKbWithTty(["apply", "--repo", repo, "--proposal-id", latest.proposal_id, "--confirm"], {
      cwd: repo,
      input: "yes\n",
    });
    assert.notEqual(applied.status, 0, "apply should fail when source evidence changed after propose");
    assert.match(applied.stdout + applied.stderr, /source|base commit/i);
    assert.ok(!existsSync(path.join(repo, "knowledge/domains/source-safety.md")));
  } finally {
    cleanup(repo);
  }
});

test("schema files are valid JSON and expose the versioned public shapes", () => {
  const schemaFiles = readdirSync(path.join(projectRoot, "schema")).filter((file) => file.endsWith(".schema.json")).sort();
  assert.deepEqual(schemaFiles, [
    "context-pack.schema.json",
    "external-evidence.schema.json",
    "manifest.schema.json",
    "memory-candidate.schema.json",
    "proposal.schema.json",
    "trigger-result.schema.json",
  ]);
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
  assert.ok(proposalSchema.required.includes("source_hashes"), "proposal schema should require source hash snapshots");

  const memoryCandidateSchema = readSchema("memory-candidate.schema.json");
  assertRequiredFields(memoryCandidateSchema, ["schema_version", "source_files", "memories"]);
  const sourcePattern = new RegExp(memoryCandidateSchema.properties.source_files.items.pattern);
  assert.equal(sourcePattern.test("README.md"), true);
  assert.equal(sourcePattern.test(".project-atlas/proposals/.keep"), false);
  assert.equal(sourcePattern.test("C:/local-only.md"), false);
  assert.equal(sourcePattern.test("C:local-only.md"), false);
  assert.equal(sourcePattern.test("..\\outside.md"), false);
  const memoryItemSchema = memoryCandidateSchema.properties.memories.items;
  for (const field of ["target", "memory_type", "topic", "scope", "confidence", "summary", "body"]) {
    assert.ok(memoryItemSchema.required.includes(field), `${field} should be required on memory items`);
  }
});

test("OpenCode adapter exposes only non-apply tools and proposes terminal apply", () => {
  const opencodeDir = path.join(projectRoot, "adapters/opencode");
  const toolsDir = path.join(projectRoot, "adapters/opencode/tools");
  const tools = readdirSync(toolsDir).filter((file) => file.endsWith(".js")).sort();
  assert.deepEqual(tools, [
    "project_atlas_check.js",
    "project_atlas_context.js",
    "project_atlas_propose.js",
    "project_atlas_remember.js",
    "project_atlas_review_summary.js",
    "project_atlas_scan.js",
  ]);
  assert.ok(!tools.some((file) => file.includes("apply")), "adapter must not expose an apply tool");

  const helper = readFileSync(path.join(opencodeDir, "lib/run_project_atlas.js"), "utf8");
  const checkTool = readFileSync(path.join(toolsDir, "project_atlas_check.js"), "utf8");
  const scanTool = readFileSync(path.join(toolsDir, "project_atlas_scan.js"), "utf8");
  const contextTool = readFileSync(path.join(toolsDir, "project_atlas_context.js"), "utf8");
  const proposeTool = readFileSync(path.join(toolsDir, "project_atlas_propose.js"), "utf8");
  const rememberTool = readFileSync(path.join(toolsDir, "project_atlas_remember.js"), "utf8");
  const reviewSummaryTool = readFileSync(path.join(toolsDir, "project_atlas_review_summary.js"), "utf8");
  assert.match(helper, /spawn\("project-atlas"/);
  for (const toolText of [checkTool, scanTool, contextTool, proposeTool, rememberTool, reviewSummaryTool]) {
    assert.match(toolText, /runProjectAtlas/);
    assert.doesNotMatch(toolText, /from "node:child_process"/);
  }
  assert.match(checkTool, /\["check", "--repo"/);
  assert.match(scanTool, /\["scan", "--repo"/);
  assert.match(contextTool, /\["context", "--repo"/);
  assert.match(contextTool, /sourceFile/);
  assert.match(contextTool, /--source-file/);
  assert.match(contextTool, /memoryType/);
  assert.match(contextTool, /--memory-type/);
  assert.match(contextTool, /topic/);
  assert.match(contextTool, /scope/);
  assert.match(contextTool, /format/);
  assert.match(proposeTool, /\["propose", "--repo"/);
  assert.match(rememberTool, /\["remember", "--repo"/);
  assert.match(rememberTool, /sourceFiles/);
  assert.match(rememberTool, /memory_type/);
  assert.match(rememberTool, /replaceExisting/);
  assert.match(reviewSummaryTool, /\["review-summary", "--repo"/);
  assert.match(helper, /No apply tool is available/);
  assert.match(helper, /human must run project-atlas apply in a terminal/i);
  assert.match(proposeTool, /withHumanApplyMessage/);
  assert.match(rememberTool, /withHumanApplyMessage/);
  assert.match(reviewSummaryTool, /reviewSummaryOutput/);
  assert.doesNotMatch(`${helper}\n${checkTool}\n${scanTool}\n${contextTool}\n${proposeTool}\n${rememberTool}\n${reviewSummaryTool}`, /\["apply", "--repo"/);
});

test("OpenCode review summary output preserves real failures and only prompts apply when safe", async () => {
  const { reviewSummaryOutput } = await import(pathToFileURL(path.join(projectRoot, "adapters/opencode/lib/review_summary_output.js")).href);

  assert.equal(
    reviewSummaryOutput({ stdout: "", stderr: "No proposal found. Run project-atlas propose first.", exitCode: 1 }),
    "No proposal is waiting for review.",
  );

  const commandFailure = reviewSummaryOutput({ stdout: "", stderr: "project-atlas: command not found", exitCode: 127 });
  assert.equal(commandFailure, "project-atlas: command not found");
  assert.doesNotMatch(commandFailure, /human must run project-atlas apply/i);

  const blockedSummary = [
    "# Project Atlas Review Summary",
    "",
    "- proposal_id: kb-blocked",
    "",
    "## Apply Safety",
    "- can_apply: no",
    "",
  ].join("\n");
  assert.equal(reviewSummaryOutput({ stdout: blockedSummary, stderr: "", exitCode: 0 }), blockedSummary);

  const safeSummary = [
    "# Project Atlas Review Summary",
    "",
    "- proposal_id: kb-safe",
    "",
    "## Apply Safety",
    "- can_apply: yes",
    "",
  ].join("\n");
  assert.match(reviewSummaryOutput({ stdout: safeSummary, stderr: "", exitCode: 0 }), /human must run project-atlas apply in a terminal/i);
});

test("OpenCode adapter includes kb-generate command with structured generation rules", () => {
  const commandsDir = path.join(projectRoot, "adapters/opencode/commands");
  const commands = readdirSync(commandsDir).filter((file) => file.endsWith(".md")).sort();
  assert.deepEqual(commands, ["kb-check.md", "kb-context.md", "kb-generate.md", "kb-refresh.md", "kb-remember.md", "kb-review.md", "kb-status.md"]);

  const generateCommand = readFileSync(path.join(commandsDir, "kb-generate.md"), "utf8");
  assert.match(generateCommand, /project_atlas_scan/);
  assert.match(generateCommand, /mode=full/);
  assert.match(generateCommand, /project_atlas_propose/);
  assert.match(generateCommand, /knowledge\/project\/overview\.md/);
  assert.match(generateCommand, /knowledge\/glossary\.md/);
  assert.match(generateCommand, /core \+ candidates/i);
  assert.match(generateCommand, /sourceFiles/);
  assert.match(generateCommand, /proposal-level/i);
  assert.match(generateCommand, /source files/i);
  assert.match(generateCommand, /Do not write frontmatter/i);
  assert.match(generateCommand, /Do not apply/i);
  assert.doesNotMatch(generateCommand, /project_atlas_apply/);
  assert.doesNotMatch(generateCommand, /opencode-kb/);

  const readme = readFileSync(path.join(projectRoot, "adapters/opencode/README.md"), "utf8");
  assert.match(readme, /\/kb-generate/);
  assert.match(readme, /first knowledge/i);
});

test("OpenCode adapter includes kb-check and kb-review workflow commands", () => {
  const commandsDir = path.join(projectRoot, "adapters/opencode/commands");
  const checkCommand = readFileSync(path.join(commandsDir, "kb-check.md"), "utf8");
  const reviewCommand = readFileSync(path.join(commandsDir, "kb-review.md"), "utf8");
  const statusCommand = readFileSync(path.join(commandsDir, "kb-status.md"), "utf8");
  const rememberCommand = readFileSync(path.join(commandsDir, "kb-remember.md"), "utf8");
  const contextCommand = readFileSync(path.join(commandsDir, "kb-context.md"), "utf8");
  const refreshCommand = readFileSync(path.join(commandsDir, "kb-refresh.md"), "utf8");

  assert.match(checkCommand, /project_atlas_check/);
  assert.match(checkCommand, /manifest/);
  assert.match(checkCommand, /stale/i);
  assert.match(checkCommand, /duplicate topic/i);
  assert.doesNotMatch(checkCommand, /project_atlas_apply/);

  assert.match(reviewCommand, /project_atlas_review_summary/);
  assert.match(reviewCommand, /latest proposal/i);
  assert.match(reviewCommand, /No proposal/i);
  assert.match(reviewCommand, /apply safety/i);
  assert.match(reviewCommand, /human/i);
  assert.doesNotMatch(reviewCommand, /project_atlas_apply/);

  assert.match(statusCommand, /project_atlas_check/);
  assert.match(statusCommand, /project_atlas_review_summary/);
  assert.match(statusCommand, /当前没有待 review proposal/);
  assert.doesNotMatch(statusCommand, /project_atlas_apply/);

  assert.match(rememberCommand, /project_atlas_remember/);
  assert.match(rememberCommand, /sourceFiles/);
  assert.match(rememberCommand, /memory type/i);
  assert.match(rememberCommand, /proposal/);
  assert.match(rememberCommand, /human/i);
  assert.doesNotMatch(rememberCommand, /project_atlas_apply/);

  assert.match(contextCommand, /query/);
  assert.match(contextCommand, /source file/i);
  assert.match(contextCommand, /memory type/i);
  assert.match(refreshCommand, /sourceFiles/);
  assert.match(refreshCommand, /No stable knowledge changes/i);
  assert.match(refreshCommand, /Do not write generic summaries/i);

  const readme = readFileSync(path.join(projectRoot, "adapters/opencode/README.md"), "utf8");
  assert.match(readme, /\/kb-generate[\s\S]*\/kb-check[\s\S]*\/kb-review/);
  assert.match(readme, /\/kb-refresh[\s\S]*\/kb-check[\s\S]*\/kb-review/);
  assert.match(readme, /\/kb-status/);
  assert.match(readme, /\/kb-remember/);
  assert.doesNotMatch(readme, /\/kb-complete/);
});

test("ecosystem adapter docs expose only safe MCP or CLI entrypoints", () => {
  const adapterDirs = ["claude-code", "cursor", "continue"];
  for (const adapter of adapterDirs) {
    const readmePath = path.join(projectRoot, "adapters", adapter, "README.md");
    assert.ok(existsSync(readmePath), `${adapter} README should exist`);
    const text = readFileSync(readmePath, "utf8");
    assert.match(text, /project-atlas-mcp|project-atlas scan|project-atlas context|project-atlas propose/);
    assert.doesNotMatch(text, /project_atlas_apply/);
    assert.doesNotMatch(text, /"apply"/);
    assert.doesNotMatch(text, /\["apply"/);
    assert.match(text, /apply .*terminal|terminal .*apply|人工.*终端/i);
  }
});

test("MCP server exposes only safe tools and can call scan, context, check, propose, and remember", async () => {
  const repo = makeJavaRepo();
  const session = createMcpSession(repo);
  try {
    initKnowledge(repo);
    const initialized = await session.request("initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "project-atlas-test", version: "1.0.0" },
    });
    assert.ok(initialized.result, `initialize should return a result: ${JSON.stringify(initialized)}`);
    session.notify("notifications/initialized");

    const listed = await session.request("tools/list");
    const toolNames = listed.result.tools.map((tool) => tool.name).sort();
    assert.deepEqual(toolNames, [
      "project_atlas_check",
      "project_atlas_context",
      "project_atlas_propose",
      "project_atlas_remember",
      "project_atlas_review_summary",
      "project_atlas_scan",
      "project_atlas_stale",
    ]);
    assert.ok(!toolNames.some((name) => name.includes("apply")), "MCP server must not expose apply");

    const scan = await session.request("tools/call", {
      name: "project_atlas_scan",
      arguments: { repo, mode: "full" },
    });
    const scanText = scan.result.content[0].text;
    assert.match(scanText, /"mode": "full"/);
    assert.match(scanText, /demo-goods/);

    const context = await session.request("tools/call", {
      name: "project_atlas_context",
      arguments: { repo, query: "Demo", format: "json", budget: 800 },
    });
    assert.match(context.result.content[0].text, /schema_version/);

    const check = await session.request("tools/call", {
      name: "project_atlas_check",
      arguments: { repo, format: "json" },
    });
    assert.match(check.result.content[0].text, /"ok": true/);

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
      name: "project_atlas_propose",
      arguments: { repo, updates_file: updatesFile, reason: "MCP proposal" },
    });
    assert.match(propose.result.content[0].text, /proposal_id:/);
    assert.match(propose.result.content[0].text, /human must run project-atlas apply in a terminal/i);

    const memoryCandidate = writeMemoryCandidateFile(repo, {
      memories: [
        {
          target: "knowledge/decisions/mcp-memory.md",
          memory_type: "experience",
          topic: "mcp memory",
          scope: "project",
          confidence: 0.7,
          summary: "MCP memory proposal.",
          body: "MCP remember only creates proposals.",
        },
      ],
    });
    const remember = await session.request("tools/call", {
      name: "project_atlas_remember",
      arguments: { repo, candidate_file: memoryCandidate, reason: "MCP memory proposal" },
    });
    assert.match(remember.result.content[0].text, /proposal_id:/);
    assert.match(remember.result.content[0].text, /human must run project-atlas apply in a terminal/i);
  } finally {
    await session.close();
    cleanup(repo);
  }
});

test("P3 governance assets define docs site, CI matrix, and release scripts", () => {
  const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));
  assert.equal(packageJson.engines.node, ">=22");
  assert.equal(packageJson.scripts.verify, "npm run lint:types && npm test");
  assert.equal(packageJson.scripts["pack:dry-run"], "npm pack --dry-run");

  const siteFiles = [
    "README.md",
    "agent-quickstart.md",
    "quick-start.md",
    "best-practices.md",
    "team-rollout.md",
    "security-faq.md",
    "release-process.md",
    "publish-now.md",
  ];
  for (const file of siteFiles) {
    const filePath = path.join(projectRoot, "docs/site", file);
    assert.ok(existsSync(filePath), `docs/site/${file} should exist`);
    assert.match(readFileSync(filePath, "utf8"), /project-atlas|Project Atlas|发布|安全|团队|快速开始/i);
  }

  const readme = readFileSync(path.join(projectRoot, "README.md"), "utf8");
  assert.match(readme, /docs\/site\/README\.md/);
  assert.match(readme, /docs\/site\/en\/README\.md/);
  assert.match(readme, /docs\/site\/quick-start\.md/);
  assert.match(readme, /docs\/site\/en\/quick-start\.md/);
  assert.ok(packageJson.files.includes("docs/site"), "npm package should include docs/site because README links to it");
  assert.ok(packageJson.files.includes("CONTRIBUTING.md"), "npm package should include contributing guidance");
  assert.ok(packageJson.files.includes("SECURITY.md"), "npm package should include security policy");

  const agentDocs = [
    path.join(projectRoot, "docs/site/agent-quickstart.md"),
    path.join(projectRoot, "docs/site/en/agent-quickstart.md"),
  ];
  for (const filePath of agentDocs) {
    const agentQuickstart = readFileSync(filePath, "utf8");
    assert.match(agentQuickstart, /project-atlas context/);
    assert.match(agentQuickstart, /project-atlas check/);
    assert.match(agentQuickstart, /project-atlas remember/);
    assert.match(agentQuickstart, /project_atlas_context/);
    assert.match(agentQuickstart, /project_atlas_review_summary/);
    assert.match(agentQuickstart, /project-atlas apply/);
  }

  const englishSiteFiles = [
    "README.md",
    "agent-quickstart.md",
    "quick-start.md",
    "best-practices.md",
    "team-rollout.md",
    "security-faq.md",
    "release-process.md",
    "publish-now.md",
  ];
  for (const file of englishSiteFiles) {
    const filePath = path.join(projectRoot, "docs/site/en", file);
    assert.ok(existsSync(filePath), `docs/site/en/${file} should exist`);
    assert.match(readFileSync(filePath, "utf8"), /Project Atlas|knowledge|agent|release|security|publish/i);
  }

  const ciPath = path.join(projectRoot, ".github/workflows/ci.yml");
  assert.ok(existsSync(ciPath), "CI workflow should exist");
  const ci = readFileSync(ciPath, "utf8");
  assert.match(ci, /push:/);
  assert.match(ci, /pull_request:/);
  assert.match(ci, /workflow_dispatch:/);
  assert.match(ci, /node:\s*\[22,\s*24,\s*26\]/);
  assert.doesNotMatch(ci, /node:\s*\[[^\]]*\b18\b/);
  assert.doesNotMatch(ci, /node:\s*\[[^\]]*\b20\b/);
  assert.match(ci, /actions\/checkout@v6/);
  assert.match(ci, /actions\/setup-node@v6/);
  assert.match(ci, /npm ci/);
  assert.match(ci, /npm run lint:types/);
  assert.match(ci, /npm run build/);
  assert.match(ci, /npm test/);
  assert.match(ci, /npm pack --dry-run/);
});

test("check reports project knowledge health issues in markdown and json", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    const healthy = runProjectKb(["check", "--repo", repo, "--format", "json"], { cwd: repo });
    assert.equal(healthy.status, 0, `healthy check should pass\nstdout:\n${healthy.stdout}\nstderr:\n${healthy.stderr}`);
    const healthyPayload = JSON.parse(healthy.stdout);
    assert.equal(healthyPayload.ok, true);
    assert.equal(healthyPayload.items.filter((item) => item.level === "error").length, 0);

    const readmeHash = runProjectKb(["hash", "--repo", repo, "--path", "README.md"], { cwd: repo }).stdout.trim();
    mkdirSync(path.join(repo, "knowledge/domains"), { recursive: true });
    writeFileSync(path.join(repo, "knowledge/domains/no-metadata.md"), "# No Metadata\n\nMissing metadata.\n", "utf8");
    writeFileSync(
      path.join(repo, "knowledge/domains/stale.md"),
      [
        "---",
        "kb_schema: 1",
        "source_files:",
        "  - README.md",
        "source_hashes:",
        `  README.md: ${readmeHash}`,
        "generated_by: project-atlas",
        "review_status: draft",
        "memory_type: project_fact",
        "topic: duplicate topic",
        "scope: project",
        "confidence: 0.7",
        "---",
        "# Stale",
        "",
        "[Broken](missing.md)",
        "",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(
      path.join(repo, "knowledge/domains/missing-source.md"),
      [
        "---",
        "kb_schema: 1",
        "source_files:",
        "  - docs/missing.md",
        "source_hashes:",
        "  docs/missing.md: sha256:missing",
        "generated_by: project-atlas",
        "review_status: draft",
        "memory_type: project_fact",
        "topic: duplicate topic",
        "scope: project",
        "confidence: 0.7",
        "---",
        "# Missing Source",
        "",
      ].join("\n"),
      "utf8",
    );
    writeFileSync(path.join(repo, "README.md"), "# Demo Changed\n\nProject introduction changed.\n", "utf8");

    const json = runProjectKb(["check", "--repo", repo, "--format", "json"], { cwd: repo });
    assert.equal(json.status, 0, `check json should pass\nstdout:\n${json.stdout}\nstderr:\n${json.stderr}`);
    const payload = JSON.parse(json.stdout);
    assert.equal(payload.ok, false);
    const rules = payload.items.map((item) => item.rule_id);
    for (const rule of ["missing_metadata", "stale_source", "missing_source", "broken_link", "duplicate_topic"]) {
      assert.ok(rules.includes(rule), `${rule} should be reported`);
    }

    const markdown = runProjectKb(["check", "--repo", repo], { cwd: repo });
    assert.equal(markdown.status, 0, `check markdown should pass\nstdout:\n${markdown.stdout}\nstderr:\n${markdown.stderr}`);
    assert.match(markdown.stdout, /# Project Atlas Check/);
    assert.match(markdown.stdout, /ok: no/);
    assert.match(markdown.stdout, /missing_metadata/);
    assert.match(markdown.stdout, /duplicate_topic/);
  } finally {
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
    assert.match(summary.stdout, /# Project Atlas Review Summary/);
    assert.match(summary.stdout, /review summary 测试/);
    assert.match(summary.stdout, /README.md/);
    assert.match(summary.stdout, /knowledge\/domains\/order.md/);
    assert.match(summary.stdout, /stale/i);
    assert.match(summary.stdout, /## Dry Run Summary/);
    assert.match(summary.stdout, /## Review Decision/);
    assert.match(summary.stdout, /## Apply Safety/);
    assert.match(summary.stdout, /can_apply: yes/);
    assert.match(summary.stdout, /project-atlas apply/);
  } finally {
    cleanup(repo);
  }
});

test("review-summary blocks apply when knowledge metadata is missing", () => {
  const repo = makeRepo();
  try {
    initKnowledge(repo);
    mkdirSync(path.join(repo, "knowledge/domains"), { recursive: true });
    writeFileSync(path.join(repo, "knowledge/domains/manual.md"), "# Manual Knowledge\n\nMissing source metadata.\n", "utf8");
    const updatesFile = path.join(repo, "updates.json");
    writeFileSync(
      updatesFile,
      JSON.stringify({
        source_files: ["README.md"],
        updates: [{ target: "knowledge/domains/order.md", content: "# 订单域\n\n记录订单规则。\n" }],
      }),
      "utf8",
    );
    const proposed = runProjectKb(["propose", "--repo", repo, "--updates-file", updatesFile, "--reason", "missing metadata safety"], { cwd: repo });
    assert.equal(proposed.status, 0, `propose should pass\nstdout:\n${proposed.stdout}\nstderr:\n${proposed.stderr}`);
    const summary = runProjectKb(["review-summary", "--repo", repo], { cwd: repo });
    assert.equal(summary.status, 0, `review summary should pass\nstdout:\n${summary.stdout}\nstderr:\n${summary.stderr}`);
    assert.match(summary.stdout, /knowledge\/domains\/manual.md: missing_metadata/);
    assert.match(summary.stdout, /can_apply: no/);
    assert.match(summary.stdout, /missing_metadata_documents: yes/);
  } finally {
    cleanup(repo);
  }
});
