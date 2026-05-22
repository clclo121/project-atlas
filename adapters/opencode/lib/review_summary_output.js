import { outputText, withHumanApplyMessage } from "./run_project_atlas.js";

export function reviewSummaryOutput(result) {
  const text = outputText(result);
  if (result.exitCode !== 0) {
    return /No proposal found/i.test(text) ? "No proposal is waiting for review." : text;
  }
  if (!/proposal_id:/i.test(text)) {
    return text;
  }
  return /can_apply:\s*yes/i.test(text) ? withHumanApplyMessage(text) : text;
}
