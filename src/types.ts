export type ProposalStatus = "proposed" | "blocked_sensitive" | "applied";
export type OutputFormat = "markdown" | "json";

export interface ScanResult {
  schema_version: string;
  mode: "full" | "changed";
  repo: string;
  base_commit: string;
  worktree_diff_hash: string;
  changed_files: string[];
  project: {
    name: string;
    maven: PomInfo | Record<string, never>;
    modules: PomInfo[];
  };
  entries: Record<string, Array<{ path: string; name: string }>>;
  knowledge: {
    has_manifest: boolean;
    files: string[];
    empty_sections: string[];
  };
  candidates: {
    domains: Candidate[];
    workflows: Candidate[];
    integrations: Candidate[];
    risks: Candidate[];
  };
  sensitive_config_findings: SensitiveFinding[];
  external_evidence: ExternalEvidenceItem[];
}

export interface PomInfo {
  path: string;
  groupId: string;
  artifactId: string;
  version: string;
  modules: string[];
}

export interface Candidate {
  target: string;
  reason: string;
}

export interface SensitiveFinding {
  path: string;
  rule_id: string;
  rule_category: string;
  action: string;
}

export interface ExternalEvidenceItem {
  source: string;
  source_type: string;
  path: string;
  symbol?: string;
  summary?: string;
  locator?: string;
  confidence?: number;
}

export interface ProposalOperation {
  type: "replace_file";
  path: string;
  content: string;
  target_current_hash: string;
}

export interface Proposal {
  proposal_id: string;
  schema_version: string;
  base_commit: string;
  worktree_diff_hash: string;
  source_files: string[];
  target_files: string[];
  operations: ProposalOperation[];
  created_at: string;
  expires_at: string;
  reason: string;
  external_evidence: ExternalEvidenceItem[];
  sensitive_scan_result: "passed" | "blocked";
  proposal_status: ProposalStatus;
  proposal_hash: string;
  applied_hash?: string;
  applied_at?: string;
}

export interface LatestIndex {
  proposal_id: string;
  proposal_status: ProposalStatus;
  worktree_diff_hash: string;
  proposal_hash: string;
  applied_hash: string;
  updated_at: string;
}

export interface TriggerResult {
  schema_version: string;
  proposal_id: string;
  proposal_hash: string;
  worktree_diff_hash: string;
  applied_hash: string;
  needs_knowledge_update: boolean;
  proposal_status: ProposalStatus;
  updated_at: string;
}

export interface StaleItem {
  path: string;
  status: "fresh" | "stale" | "missing_source" | "missing_metadata";
  source_files: string[];
  details: string[];
  suggestion: string;
}

export interface ContextItem {
  source: string;
  source_type: "openspec_change" | "openspec_spec" | "knowledge";
  priority: number;
  content: string;
}
