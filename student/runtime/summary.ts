// Derive a learner model from the attempt log: for each skill, what the app has seen and
// concluded. This is the visible "personalization" — the state that decides what comes next.

import type { EvidenceEvent, SkillGraph } from '../../shared/schema/index.ts';

export type SkillStatus = 'solid' | 'needs-work' | 'unseen';

export interface SkillSummary {
  id: string;
  label: string;
  status: SkillStatus;
  attempts: number;
  /** True once answered correctly at least once. */
  learned: boolean;
}

/** One row per skill, in graph order, from the (already integrity-checked) events. */
export function summariseSkills(graph: SkillGraph, events: EvidenceEvent[]): SkillSummary[] {
  return graph.skills.map((skill) => {
    const mine = events.filter((e) => e.skillId === skill.id);
    const learned = mine.some((e) => e.correct);
    const last = mine.at(-1);
    const status: SkillStatus =
      mine.length === 0 ? 'unseen' : learned && last?.correct ? 'solid' : 'needs-work';
    return { id: skill.id, label: skill.label, status, attempts: mine.length, learned };
  });
}
