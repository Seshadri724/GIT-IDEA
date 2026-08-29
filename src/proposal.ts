// Proposal-checking engine: checks proposed changes against active decisions
// for direct contradictions (rejected alternatives) or related precedents.
//
// NOTE: Rejected names in decision records should be concise entity names
// (e.g. "Redis", "GraphQL", "Prisma"), not full sentences, for accurate matching.

import { Decision, DecisionStatus, listDecisions } from './store.js';
import { searchDecisions, tokenize, scopeMatches } from './search.js';

export interface CheckProposalOptions {
  proposal: string;
  scope?: string;
  status?: DecisionStatus | 'any';
}

export interface ProposalConflict {
  decisionId: string;
  decisionTitle: string;
  rejectedName: string;
  reason: string;
}

export interface ProposalCheckResult {
  verdict: 'conflict' | 'related' | 'none';
  explanation: string;
  conflicts: ProposalConflict[];
  matches: Decision[];
}

function hasTokenMatch(targetTokens: string[], candidateTokens: string[]): boolean {
  if (candidateTokens.length === 0) return false;
  // All tokens in candidate (e.g. "redis cache") must appear as whole tokens in target
  return candidateTokens.every((c) => targetTokens.includes(c));
}

export async function checkProposal(
  cwd: string,
  opts: CheckProposalOptions,
): Promise<ProposalCheckResult> {
  const proposalText = (opts.proposal ?? '').trim();
  const proposalTokens = tokenize(proposalText);

  if (proposalTokens.length === 0 && !opts.scope) {
    return {
      verdict: 'none',
      explanation: 'No proposal text or scope provided to check.',
      conflicts: [],
      matches: [],
    };
  }

  // 1. Direct Conflict Detection: scan ALL candidate decisions' rejected lists directly.
  // This avoids decoupling conflict detection from the search ranking/recall bottleneck.
  const allDecisions = await listDecisions(cwd);
  const statusFilter = opts.status ?? 'active';
  const candidateDecisions = allDecisions.filter((d) => {
    if (statusFilter !== 'any' && d.status !== statusFilter) return false;
    if (opts.scope && !scopeMatches(d, opts.scope)) return false;
    return true;
  });

  const conflicts: ProposalConflict[] = [];

  for (const d of candidateDecisions) {
    for (const r of d.rejected) {
      const rTokens = tokenize(r.name);
      if (rTokens.length > 0 && hasTokenMatch(proposalTokens, rTokens)) {
        conflicts.push({
          decisionId: d.id,
          decisionTitle: d.title,
          rejectedName: r.name,
          reason: r.reason,
        });
      }
    }
  }

  if (conflicts.length > 0) {
    const details = conflicts
      .map((c) => `- Decision [${c.decisionId}] "${c.decisionTitle}" rejected **${c.rejectedName}**: ${c.reason}`)
      .join('\n');
    return {
      verdict: 'conflict',
      explanation: `Proposed change directly conflicts with ${conflicts.length} recorded decision(s):\n${details}`,
      conflicts,
      matches: candidateDecisions.filter((d) => conflicts.some((c) => c.decisionId === d.id)),
    };
  }

  // 2. Related Precedents: if no direct conflict, query search for related decisions
  const matches = await searchDecisions(cwd, {
    query: proposalText,
    scope: opts.scope,
    status: opts.status ?? 'active',
  });

  if (matches.length > 0) {
    const details = matches.map((m) => `- [${m.id}] ${m.title} (chose: ${m.chose})`).join('\n');
    return {
      verdict: 'related',
      explanation: `Found ${matches.length} related decision(s) that may provide context:\n${details}`,
      conflicts: [],
      matches,
    };
  }

  return {
    verdict: 'none',
    explanation: 'No conflicting or related decisions found for this proposal.',
    conflicts: [],
    matches: [],
  };
}
