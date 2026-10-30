// Stage-3 adaptation: when a student gets a question wrong, don't repeat it — step back to
// a PREREQUISITE skill and ask about that first (e.g. miss "equivalent fractions" → ask about
// "multiplying both terms" or "equal parts"). Transparent, rule-based, runs on-device.

import type { Question, SkillGraph } from '../../shared/schema/index.ts';

export interface Remediation {
  /** The prerequisite skill we stepped back to (or the same skill, as reinforcement). */
  skillId: string;
  /** Human-readable reason, shown to the student so adaptation is not a black box. */
  reason: string;
  question: Question;
}

/** Prerequisite skills of `skillId`, nearest first (breadth-first over the graph). */
export function prerequisitesOf(graph: SkillGraph, skillId: string): string[] {
  const byId = new Map(graph.skills.map((s) => [s.id, s]));
  const order: string[] = [];
  const seen = new Set<string>([skillId]);
  const queue = [...(byId.get(skillId)?.prerequisiteIds ?? [])];
  while (queue.length) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    order.push(id);
    queue.push(...(byId.get(id)?.prerequisiteIds ?? []));
  }
  return order;
}

/**
 * Choose the next remediation question after a wrong answer on `wrongSkillId`.
 * - Walk prerequisites nearest-first; serve the first pool question not already shown
 *   and whose skill the student hasn't already demonstrated.
 * - If no prerequisite question is available, fall back to a fresh question on the same
 *   skill (reinforcement). Returns null when nothing suitable remains.
 */
export function chooseRemediation(
  graph: SkillGraph,
  wrongSkillId: string,
  opts: { shownPrompts?: Set<string>; masteredSkills?: Set<string> } = {},
): Remediation | null {
  const shown = opts.shownPrompts ?? new Set<string>();
  const mastered = opts.masteredSkills ?? new Set<string>();
  const byId = new Map(graph.skills.map((s) => [s.id, s]));

  const pick = (skillId: string): Question | undefined =>
    (graph.prereqPool[skillId] ?? []).find((q) => !shown.has(q.q));

  for (const prereqId of prerequisitesOf(graph, wrongSkillId)) {
    if (mastered.has(prereqId)) continue;
    const question = pick(prereqId);
    if (question) {
      const label = byId.get(prereqId)?.label ?? prereqId;
      return {
        skillId: prereqId,
        reason: `Let's build this up first: ${label.toLowerCase()}.`,
        question,
      };
    }
  }

  const same = pick(wrongSkillId);
  if (same) {
    return { skillId: wrongSkillId, reason: "Let's try a similar one.", question: same };
  }
  return null;
}
