/**
 * Review Stage Prompts - LLM-based Correction
 * @module
 */

import type { FlaggedIndicator } from '../types.ts';

/**
 * Review system prompt (optimized)
 */
export function generateReviewSystemPrompt(): string {
  return `Review flagged indicator classifications. Choose action:

confirm: Flag incorrect, keep classification
fix: Apply minimal correction (provide diff)
escalate: Needs human review

 CONTEXT:
 • Current value includes classification + reasoning from router/specialist stages
 • Use reasoning to understand why decisions were made
 • Consider reasoning when determining if fix is needed

 DIFF FORMAT (fix only):
 {"family"?: "...", "indicator_type"?: "...", "temporal_aggregation"?: "...", "is_monetary"?: true|false, "heat_map_orientation"?: "..."}

 RULES:
 • Prefer confirm if current classification conforms to taxonomy rules
 • Use fix with minimal fields changed; do not add unrelated changes
 • Escalate only if ambiguous after applying rules/examples

OUTPUT: JSON array. Each: {"indicator_id":"...","action":"confirm|fix|escalate","diff":{...},"reason":"...","confidence":0-1}`;
}

/**
 * Generate user prompt for flagged indicators (optimized)
 */
export function generateReviewUserPrompt(
  flaggedIndicators: Array<FlaggedIndicator & { name: string }>
): string {
  const flaggedList = flaggedIndicators
    .map((f, idx) => {
      return `${idx + 1}. ${f.name} (${f.indicator_id})\n   Flag: ${
        f.flag_type
      }\n   Reason: ${f.flag_reason}${
        f.current_value ? `\n   Current: ${f.current_value}` : ''
      }${f.expected_value ? `\n   Expected: ${f.expected_value}` : ''}`;
    })
    .join('\n\n');

  return `Review ${flaggedIndicators.length} flagged indicator${
    flaggedIndicators.length === 1 ? '' : 's'
  }:

${flaggedList}

IMPORTANT: Return exactly ${flaggedIndicators.length} results in the SAME ORDER as above.
For each result, copy the EXACT indicator_id shown in parentheses above.

Return JSON array: [{"indicator_id":"<copy exact ID>","action":"confirm|fix|escalate","diff":{...},"reason":"...","confidence":0-1}]`;
}
