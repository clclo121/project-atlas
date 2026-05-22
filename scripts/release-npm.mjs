#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

process.chdir(repoRoot);

const args = new Set(process.argv.slice(2));

if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: node scripts/release-npm.mjs [--verify-only] [--skip-global-install-check] [--skip-tag]

Options:
  --verify-only               Run release checks only. Do not push, publish, or tag.
  --skip-global-install-check Skip npm install -g and post-publish CLI smoke checks.
  --skip-tag                  Skip git tag creation and tag push after publish.

This script assumes the release version has already been written to package.json and CHANGELOG.md.`);
  process.exit(0);
}

const verifyOnly = args.has("--verify-only");
const skipGlobalInstallCheck = args.has("--skip-global-install-check");
const skipTag = args.has("--skip-tag");

const packageJson = JSON.parse(readFileSync(path.join(repoRoot, "package.json"), "utf8"));
const packageName = packageJson.name;
const packageVersion = packageJson.version;
const globalBinDir = path.join(capture("npm", ["prefix", "-g"]), "bin");
const globalCli = path.join(globalBinDir, packageName);
const globalMcp = path.join(globalBinDir, `${packageName}-mcp`);
const releaseTag = `v${packageVersion}`;

const verifyCommands = [
  ["npm", ["run", "verify"]],
  ["npm", ["run", "pack:dry-run"]],
  ["node", ["dist/index.js", "--help"]],
  ["node", ["dist/index.js", "init", "--help"]],
  ["node", ["dist/index.js", "context", "--help"]],
  ["node", ["dist/index.js", "propose", "--help"]],
  ["node", ["dist/index.js", "remember", "--help"]],
  ["node", ["dist/index.js", "check", "--help"]],
  ["node", ["dist/index.js", "apply", "--help"]],
  ["node", ["dist/mcp.js", "--help"]],
];

function fail(message) {
  console.error(`release-npm: ${message}`);
  process.exit(1);
}

function run(command, commandArgs, extraOptions = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: "inherit",
    encoding: "utf8",
    ...extraOptions,
  });
  if (result.status !== 0) {
    fail(`command failed: ${command} ${commandArgs.join(" ")}`);
  }
}

function capture(command, commandArgs, extraOptions = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    ...extraOptions,
  });
  if (result.status !== 0) {
    const stderr = (result.stderr || "").trim();
    fail(`command failed: ${command} ${commandArgs.join(" ")}${stderr ? `\n${stderr}` : ""}`);
  }
  return (result.stdout || "").trim();
}

function maybeCapture(command, commandArgs, extraOptions = {}) {
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
    ...extraOptions,
  });
  return {
    ok: result.status === 0,
    stdout: (result.stdout || "").trim(),
    stderr: (result.stderr || "").trim(),
    status: result.status,
  };
}

function compareSemver(left, right) {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10));
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10));
  const length = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;
    if (leftValue > rightValue) return 1;
    if (leftValue < rightValue) return -1;
  }
  return 0;
}

function ensureCleanWorktree(stage) {
  const status = capture("git", ["status", "--short"]);
  if (status) {
    fail(`working tree is not clean during ${stage}:\n${status}`);
  }
}

function ensureReleaseState() {
  ensureCleanWorktree("preflight");

  const branch = capture("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  if (branch !== "main") {
    fail(`release must run on main. current branch: ${branch}`);
  }

  const remoteStatus = capture("git", ["rev-list", "--left-right", "--count", "origin/main...HEAD"]);
  const [behindCount, aheadCount] = remoteStatus.split(/\s+/).map((value) => Number.parseInt(value, 10));
  if (behindCount > 0) {
    fail(`local main is behind origin/main by ${behindCount} commit(s). pull or rebase first.`);
  }

  const publishedVersionResult = maybeCapture("npm", ["view", packageName, "version"]);
  if (publishedVersionResult.ok && publishedVersionResult.stdout) {
    const publishedVersion = publishedVersionResult.stdout;
    if (compareSemver(packageVersion, publishedVersion) <= 0) {
      fail(`package.json version ${packageVersion} must be greater than npm registry version ${publishedVersion}.`);
    }
  }

  const changelog = readFileSync(path.join(repoRoot, "CHANGELOG.md"), "utf8");
  if (!new RegExp(`^## ${escapeRegExp(packageVersion)}\\b`, "m").test(changelog)) {
    fail(`CHANGELOG.md must contain a section for ${packageVersion}.`);
  }

  if (!existsSync(path.join(repoRoot, "dist", "index.js")) || !existsSync(path.join(repoRoot, "dist", "mcp.js"))) {
    fail("dist outputs are missing. run npm test or npm run build first.");
  }

  return { aheadCount };
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function runVerifySuite() {
  for (const [command, commandArgs] of verifyCommands) {
    run(command, commandArgs);
  }
  ensureCleanWorktree("post-verify");
}

function runGlobalInstallChecks() {
  run("npm", ["install", "-g", `${packageName}@${packageVersion}`]);
  run(globalCli, ["--help"]);
  run(globalMcp, ["--help"]);
}

function ensureTag() {
  const localTagResult = maybeCapture("git", ["rev-parse", "-q", "--verify", `refs/tags/${releaseTag}`]);
  if (localTagResult.ok) {
    const taggedCommit = localTagResult.stdout;
    const headCommit = capture("git", ["rev-parse", "HEAD"]);
    if (taggedCommit !== headCommit) {
      fail(`local tag ${releaseTag} already exists but does not point to HEAD.`);
    }
  } else {
    run("git", ["tag", releaseTag]);
  }
  run("git", ["push", "origin", "tag", releaseTag]);
}

function runPostPublishChecks() {
  const registryVersion = capture("npm", ["view", packageName, "version"]);
  if (registryVersion !== packageVersion) {
    fail(`npm registry returned version ${registryVersion}, expected ${packageVersion}.`);
  }

  const distTags = capture("npm", ["view", packageName, "dist-tags", "--json"]);
  console.log(distTags);

  if (!skipGlobalInstallCheck) {
    runGlobalInstallChecks();
  }
}

const { aheadCount } = ensureReleaseState();
runVerifySuite();

if (verifyOnly) {
  console.log(`release-npm: verify-only checks passed for ${packageName}@${packageVersion}`);
  process.exit(0);
}

if (aheadCount > 0) {
  run("git", ["push", "origin", "main"]);
}

console.log("release-npm: running npm publish");
run("npm", ["publish"]);
runPostPublishChecks();

if (!skipTag) {
  ensureTag();
}

console.log(`release-npm: published ${packageName}@${packageVersion}`);
