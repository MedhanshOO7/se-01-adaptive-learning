// The teacher↔student contract. A chapter bundle is authored (or AI-generated) on the
// teacher side, validated against these types, built to standalone HTML, and consumed by
// the student runtime offline. Nothing else crosses the boundary.

export const SCHEMA_VERSION = 1 as const;

/** Difficulty band for a question. `core` is the lesson's main check; `intro` questions
 *  seed the prerequisite pool used for remediation; `stretch` extends a confident student. */
export type Difficulty = 'intro' | 'core' | 'stretch';

/** A single multiple-choice question in mr-md's quiz shape, plus our `skill`/`difficulty`
 *  extensions. `answer` is a 0-based index into `options`. */
export interface Question {
  q: string;
  options: string[];
  answer: number;
  explanation?: string;
  /** The skill this question provides evidence for; must exist in the skill graph. */
  skill?: string;
  difficulty?: Difficulty;
}

/** An mr-md quiz file (`quiz/*.json`): the curated questions shown inline in the lesson. */
export interface QuizFile {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  title?: string;
  questions: Question[];
}

/** One node in the skill graph. `prerequisiteIds` point at the skills a student should
 *  understand first; a wrong answer walks these edges to pick remediation (stage 3). */
export interface Skill {
  id: string;
  label: string;
  prerequisiteIds: string[];
}

/** `skills.json`: the skill graph plus the prerequisite question pool, keyed by skill id.
 *  Pool questions are shipped hidden and rendered on demand by the student runtime. */
export interface SkillGraph {
  schemaVersion: typeof SCHEMA_VERSION;
  skills: Skill[];
  prereqPool: Record<string, Question[]>;
}

/** `manifest.json`: pins the exact files and revision that make up one chapter bundle. */
export interface Manifest {
  schemaVersion: typeof SCHEMA_VERSION;
  id: string;
  revision: string;
  title: string;
  /** BCP-47-ish language tag, e.g. 'en', 'hi', 'pa'. One bundle is one language variant. */
  language: string;
  /** Path (relative to the bundle root) of the mr-md lesson markdown. */
  lesson: string;
  /** Ordered paths of the inline quiz files. */
  quizzes: string[];
  /** Path of the skill graph file. */
  skills: string;
  /** Optional content hash, filled by the build to pin attempts to exact content. */
  contentHash?: string;
}

/** A fully-loaded, cross-validated bundle the build and runtime operate on. */
export interface ChapterBundle {
  manifest: Manifest;
  skillGraph: SkillGraph;
  quizzes: QuizFile[];
}

/** One append-only attempt record in the student's local store. Events form a hash chain
 *  (`hash` covers the event fields plus `prevHash`) so edits or reordering are detectable. */
export interface EvidenceEvent {
  eventId: string;
  chapterId: string;
  chapterRevision: string;
  quizId: string;
  questionIndex: number;
  skillId: string | null;
  selectedOption: number;
  correct: boolean;
  /** 1-based attempt count for this (quizId, questionIndex) within the store. */
  attemptNumber: number;
  /** True when this is the first attempt at the question (no prior wrong/remediation). */
  independent: boolean;
  occurredAt: string;
  prevHash: string;
  hash: string;
}

export interface Issue {
  path: string;
  message: string;
}
