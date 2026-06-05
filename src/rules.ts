export interface EntryRule {
  type: string;
  pattern: RegExp;
  requiresJava?: boolean;
}

export interface SensitiveRule {
  rule_id: string;
  rule_category: string;
  pattern: RegExp;
}

export const entryTypes = ["controller", "service", "feign", "tasks", "mq", "remote", "config", "cli", "mcp", "adapter", "commands", "tools", "schema", "docs", "tests", "build"];

export const entryRules: EntryRule[] = [
  { type: "build", pattern: /(^|\/)(package-lock\.json|package\.json|pom\.xml|tsconfig\.json|vite\.config\.[cm]?[jt]s|webpack\.config\.[cm]?[jt]s)$/ },
  { type: "schema", pattern: /^schema\/.*\.json$/ },
  { type: "commands", pattern: /\/commands\// },
  { type: "tools", pattern: /\/tools\// },
  { type: "adapter", pattern: /^adapters\// },
  { type: "docs", pattern: /(^|\/)(README|CHANGELOG|CONTRIBUTING|SECURITY|AGENTS)\.md$|^docs\//i },
  { type: "tests", pattern: /(^|\/)(test|tests|__tests__)\/|\.test\.[cm]?[jt]s$|\.spec\.[cm]?[jt]s$|Test\.java$/ },
  { type: "mcp", pattern: /(^|\/)(mcp|server)\.[cm]?[jt]s$|Mcp.*\.java$/ },
  { type: "cli", pattern: /(^|\/)(index|cli|main)\.[cm]?[jt]s$|bin\// },
  { type: "controller", pattern: /\/controller\/|Controller\.java$/, requiresJava: true },
  { type: "service", pattern: /\/service\/|Service(Impl)?\.java$/, requiresJava: true },
  { type: "feign", pattern: /\/feign\/|Feign(Service)?(Impl)?\.java$/, requiresJava: true },
  { type: "tasks", pattern: /\/tasks\/|Task\.java$|Scheduled.*\.java$/, requiresJava: true },
  { type: "mq", pattern: /\/mq\/|Consumer\.java$|Producer\.java$/, requiresJava: true },
  { type: "remote", pattern: /\/remote\/|Remote.*\.java$/, requiresJava: true },
  { type: "config", pattern: /\/config\/|Config(uration)?\.java$/, requiresJava: true },
];

export const sensitiveRules: SensitiveRule[] = [
  { rule_id: "builtin.secret.password", rule_category: "secret", pattern: /(?:^|\n)\s*[\w.-]*password[\w.-]*\s*[:=]\s*["']?[^"'\s]{3,}/i },
  { rule_id: "builtin.secret.token", rule_category: "secret", pattern: /(?:^|\n)\s*[\w.-]*(?:token|refresh_token|access_token)[\w.-]*\s*[:=]\s*["']?[^"'\s]{8,}/i },
  { rule_id: "builtin.secret.api-key", rule_category: "secret", pattern: /(?:api[_-]?key|apikey)\s*[:=]\s*["']?[^"'\s]{8,}/i },
  { rule_id: "builtin.secret.access-key", rule_category: "secret", pattern: /accessKey(Id|Secret)?\s*[:=]\s*["']?[^"'\s]{8,}/i },
  { rule_id: "builtin.secret.generic", rule_category: "secret", pattern: /(?:^|\n)\s*[\w.-]*secret[\w.-]*\s*[:=]\s*["']?[^"'\s]{8,}/i },
  { rule_id: "builtin.secret.authorization", rule_category: "secret", pattern: /authorization\s*[:=]\s*["']?(?:bearer|basic)\s+[^"'\s]{8,}/i },
  { rule_id: "builtin.secret.cookie", rule_category: "secret", pattern: /cookie\s*[:=]\s*["']?[^"'\n]*(?:session|token|auth)[^"'\n]{8,}/i },
  { rule_id: "builtin.secret.npm-token", rule_category: "secret", pattern: /\/\/[^/\s]+\/:_authToken\s*=\s*[^"'\s]{8,}/i },
  { rule_id: "builtin.secret.private-key", rule_category: "secret", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |)?PRIVATE KEY-----/i },
  { rule_id: "builtin.secret.datasource-url", rule_category: "secret", pattern: /(jdbc|mongodb|redis|postgres|mysql):\/\/[^/\s:@]+:[^@\s]+@/i },
];

export function sensitiveRuleMatches(content: string): Array<{ rule_id: string; rule_category: string }> {
  const matches: Array<{ rule_id: string; rule_category: string }> = [];
  for (const rule of sensitiveRules) {
    if (rule.pattern.test(content)) {
      matches.push({ rule_id: rule.rule_id, rule_category: rule.rule_category });
    }
  }
  return matches;
}
