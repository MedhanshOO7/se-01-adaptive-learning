/** Versioned, compiler-independent chapter learning contract. */
export interface Topic { id: string; label: string }
export interface Axis {
  id: string; label: string; topics: string[];
  aggregation: 'average' | 'weakest';
  minEvidence: number;
}
export type Response = number | number[] | string;
export interface Question {
  id: string; type: 'single' | 'multiple' | 'numeric' | 'ordering';
  prompt: string; topics: string[]; weight: number;
  level?: 'foundation' | 'core' | 'hots';
  options?: string[]; answer: Response;
  tolerance?: number; simplestForm?: boolean;
  hint?: string; explanation: string;
}
export interface Quiz { id: string; title: string; questions: Question[] }
export type Condition =
  | { all: Condition[] } | { any: Condition[] }
  | { axis: string; op: '<' | '<=' | '>' | '>=' | '=='; value: number }
  | { weakest: string };
export interface ChapterConfig {
  schemaVersion: 1; id: string; revision: string; title: string;
  entry: string;
  /** Optional chapter cover defaults; a reader's saved color takes precedence. */
  cover?: { label?: string; color?: string; artwork?: 'orbit' | 'none' };
  pages: { file: string; title: string; quizzes: string[] }[];
  topics: Topic[];
  hexagon: {
    axes: Axis[];
    evidence: 'first' | 'latest';
    hintedCredit: number;
    evidenceWindow: number;
    bands: { below: number; label: string }[];
  };
  quizzes: Quiz[];
  completion: { quizzes: string[] };
  routing: {
    rules: { id: string; priority: number; when: Condition; file: string; reason: string }[];
    fallback: { file: string; reason: string };
  };
}
export interface Attempt {
  questionId: string; response: Response; hinted: boolean; at: string;
}
export interface AxisStat { id: string; label: string; value: number | null; evidence: number }
export interface LearningState { schemaVersion: 1; attempts: Attempt[] }
