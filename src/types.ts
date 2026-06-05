export type ProposalStatus = "proposed" | "blocked_sensitive" | "applied";
export type OutputFormat = "markdown" | "json";
export type MemoryType = "decision" | "experience" | "project_fact";
export type ReviewDepth = "standard" | "deep";

export interface ScanResult {
  schema_version: string;
  mode: "full" | "changed";
  review_depth: ReviewDepth;
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
  facts: ProjectFacts;
  candidates: {
    domains: Candidate[];
    workflows: Candidate[];
    integrations: Candidate[];
    risks: Candidate[];
    contracts?: Candidate[];
    quality?: Candidate[];
  };
  evidence_plan: EvidencePlanItem[];
  review_plan: ReviewPlanItem[];
  sensitive_config_findings: SensitiveFinding[];
  external_evidence: ExternalEvidenceItem[];
  external_evidence_warnings?: CheckItem[];
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
  source_files?: string[];
  confidence?: number;
  category?: string;
  fact_ids?: string[];
}

export interface ProjectFacts {
  package_json?: {
    path: string;
    name?: string;
    bin: string[];
    scripts: string[];
    files: string[];
    exports: string[];
  };
  mcp_tools: FactItem[];
  adapter_assets: FactItem[];
  schemas: FactItem[];
  tests: FactItem[];
}

export interface FactItem {
  id: string;
  type: string;
  path: string;
  name: string;
  summary?: string;
}

export interface EvidencePlanItem {
  target: string;
  candidate_category: string;
  recommended_files: string[];
  required_evidence_types: string[];
  reason: string;
  missing_evidence: string[];
  confidence: number;
}

export interface ReviewPlanItem {
  target: string;
  review_depth: "deep";
  focus: string[];
  required_external_evidence: string[];
  risk_flags: string[];
  related_facts: string[];
  recommended_files: string[];
  confidence: number;
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
  generated_at?: string;
  base_commit?: string;
  tool_version?: string;
  coverage_summary?: string;
}

export interface ProposalOperation {
  type: "replace_file";
  path: string;
  content: string;
  source_files?: string[];
  source_hashes?: Record<string, string>;
  target_current_hash: string;
}

export interface Proposal {
  proposal_id: string;
  schema_version: string;
  base_commit: string;
  worktree_diff_hash: string;
  source_files: string[];
  source_hashes: Record<string, string>;
  target_files: string[];
  operations: ProposalOperation[];
  created_at: string;
  expires_at: string;
  reason: string;
  update_reason_summary?: string;
  external_evidence: ExternalEvidenceItem[];
  evidence_plan_summary?: EvidencePlanItem[];
  quality_score?: QualityScore;
  coverage_score?: CoverageScore;
  proposal_quality_findings?: CheckItem[];
  sensitive_scan_result: "passed" | "blocked";
  proposal_status: ProposalStatus;
  proposal_hash: string;
  applied_hash?: string;
  applied_at?: string;
}

export interface QualityScore {
  score: number;
  rating: "good" | "warning" | "poor";
  items: QualityScoreItem[];
}

export interface QualityScoreItem {
  target: string;
  score: number;
  deductions: string[];
}

export interface CoverageScore {
  score: number;
  rating: "good" | "warning" | "poor";
  items: CoverageScoreItem[];
}

export interface CoverageScoreItem {
  target: string;
  score: number;
  planned_files: string[];
  actual_files: string[];
  missing_files: string[];
  missing_evidence_types: string[];
  external_warnings: string[];
  deductions: string[];
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

export interface MemoryCandidateItem {
  target: string;
  memory_type: MemoryType;
  topic: string;
  scope: string;
  confidence: number;
  summary: string;
  body: string;
  owner?: string;
  related_docs?: string[];
}

export interface MemoryCandidateInput {
  schema_version: string;
  source_files: string[];
  memories: MemoryCandidateItem[];
}

export interface CheckItem {
  level: "error" | "warning";
  rule_id: string;
  path: string;
  message: string;
  suggestion: string;
}

export interface CheckResult {
  schema_version: string;
  repo: string;
  ok: boolean;
  items: CheckItem[];
}

export interface ContextItem {
  source: string;
  source_type: "openspec_change" | "openspec_spec" | "knowledge";
  priority: number;
  content: string;
  metadata?: {
    memory_type?: MemoryType;
    topic?: string;
    scope?: string;
    confidence?: number;
    owner?: string;
    related_docs?: string[];
  };
}
