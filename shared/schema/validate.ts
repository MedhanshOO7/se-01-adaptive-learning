// Structural + cross-reference validation for a chapter bundle. Content correctness
// (is the answer actually right? is the prose pedagogically sound?) still needs human
// review — this only proves the bundle is well-formed and internally consistent.

import {
  SCHEMA_VERSION,
  type Issue,
  type Manifest,
  type Question,
  type QuizFile,
  type SkillGraph,
  type ChapterBundle,
} from './types.ts';

const DIFFICULTIES = new Set(['intro', 'core', 'stretch']);

const isObject = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const unique = (xs: string[]) => new Set(xs).size === xs.length;

function checkQuestion(q: unknown, path: string, knownSkills: Set<string>, issues: Issue[]) {
  if (!isObject(q)) {
    issues.push({ path, message: 'Expected a question object.' });
    return;
  }
  if (!isText(q.q)) issues.push({ path: `${path}.q`, message: 'Required nonempty prompt.' });
  if (!Array.isArray(q.options) || q.options.length < 2 || !q.options.every(isText)) {
    issues.push({ path: `${path}.options`, message: 'Provide at least 2 nonempty options.' });
  }
  const optionCount = Array.isArray(q.options) ? q.options.length : 0;
  if (!Number.isInteger(q.answer) || (q.answer as number) < 0 || (q.answer as number) >= optionCount) {
    issues.push({ path: `${path}.answer`, message: 'Answer must be a 0-based index into options.' });
  }
  if (q.explanation !== undefined && !isText(q.explanation)) {
    issues.push({ path: `${path}.explanation`, message: 'Explanation must be a nonempty string.' });
  }
  if (q.difficulty !== undefined && !DIFFICULTIES.has(q.difficulty as string)) {
    issues.push({ path: `${path}.difficulty`, message: 'Difficulty must be intro, core, or stretch.' });
  }
  if (q.skill !== undefined) {
    if (!isText(q.skill)) {
      issues.push({ path: `${path}.skill`, message: 'Skill must be a nonempty skill id.' });
    } else if (!knownSkills.has(q.skill)) {
      issues.push({ path: `${path}.skill`, message: `Unknown skill id "${q.skill}".` });
    }
  }
}

export function validateSkillGraph(graph: unknown): Issue[] {
  const issues: Issue[] = [];
  if (!isObject(graph)) return [{ path: 'skills', message: 'Expected an object.' }];
  if (graph.schemaVersion !== SCHEMA_VERSION) {
    issues.push({ path: 'skills.schemaVersion', message: `Supported schema version is ${SCHEMA_VERSION}.` });
  }
  if (!Array.isArray(graph.skills) || graph.skills.length === 0) {
    issues.push({ path: 'skills.skills', message: 'Provide at least one skill.' });
    return issues;
  }
  const ids = graph.skills.map((s: any) => (isObject(s) ? s.id : undefined));
  if (!ids.every(isText) || !unique(ids as string[])) {
    issues.push({ path: 'skills.skills', message: 'Skill IDs must be unique nonempty strings.' });
  }
  const known = new Set(ids.filter(isText) as string[]);
  graph.skills.forEach((s: any, i: number) => {
    const path = `skills.skills[${i}]`;
    if (!isObject(s)) { issues.push({ path, message: 'Expected a skill object.' }); return; }
    if (!isText(s.label)) issues.push({ path: `${path}.label`, message: 'Required nonempty label.' });
    if (!Array.isArray(s.prerequisiteIds) || !s.prerequisiteIds.every(isText)) {
      issues.push({ path: `${path}.prerequisiteIds`, message: 'Expected an array of skill ids.' });
    } else {
      s.prerequisiteIds.forEach((pid: string, j: number) => {
        if (!known.has(pid)) {
          issues.push({ path: `${path}.prerequisiteIds[${j}]`, message: `Unknown prerequisite "${pid}".` });
        }
        if (pid === s.id) {
          issues.push({ path: `${path}.prerequisiteIds[${j}]`, message: 'A skill cannot be its own prerequisite.' });
        }
      });
    }
  });
  if (!isObject(graph.prereqPool)) {
    issues.push({ path: 'skills.prereqPool', message: 'Expected an object keyed by skill id.' });
  } else {
    for (const [skillId, pool] of Object.entries(graph.prereqPool)) {
      const path = `skills.prereqPool.${skillId}`;
      if (!known.has(skillId)) issues.push({ path, message: `Unknown skill id "${skillId}".` });
      if (!Array.isArray(pool) || pool.length === 0) {
        issues.push({ path, message: 'Prerequisite pool must be a nonempty array.' });
        continue;
      }
      pool.forEach((q, i) => checkQuestion(q, `${path}[${i}]`, known, issues));
    }
  }
  return issues;
}

export function validateQuizFile(quiz: unknown, knownSkills: Set<string>, label = 'quiz'): Issue[] {
  const issues: Issue[] = [];
  if (!isObject(quiz)) return [{ path: label, message: 'Expected an object.' }];
  if (quiz.schemaVersion !== SCHEMA_VERSION) {
    issues.push({ path: `${label}.schemaVersion`, message: `Supported schema version is ${SCHEMA_VERSION}.` });
  }
  if (!isText(quiz.id)) issues.push({ path: `${label}.id`, message: 'Required nonempty id.' });
  if (quiz.title !== undefined && !isText(quiz.title)) {
    issues.push({ path: `${label}.title`, message: 'Title must be a nonempty string.' });
  }
  if (!Array.isArray(quiz.questions) || quiz.questions.length === 0) {
    issues.push({ path: `${label}.questions`, message: 'Provide at least one question.' });
    return issues;
  }
  quiz.questions.forEach((q, i) => checkQuestion(q, `${label}.questions[${i}]`, knownSkills, issues));
  return issues;
}

export function validateManifest(manifest: unknown): Issue[] {
  const issues: Issue[] = [];
  if (!isObject(manifest)) return [{ path: 'manifest', message: 'Expected an object.' }];
  if (manifest.schemaVersion !== SCHEMA_VERSION) {
    issues.push({ path: 'manifest.schemaVersion', message: `Supported schema version is ${SCHEMA_VERSION}.` });
  }
  for (const key of ['id', 'revision', 'title', 'language', 'lesson', 'skills'] as const) {
    if (!isText(manifest[key])) issues.push({ path: `manifest.${key}`, message: 'Required nonempty string.' });
  }
  if (!Array.isArray(manifest.quizzes) || manifest.quizzes.length === 0 || !manifest.quizzes.every(isText)) {
    issues.push({ path: 'manifest.quizzes', message: 'Provide at least one quiz file path.' });
  }
  return issues;
}

/** Validate a fully-loaded bundle: each part is well-formed and all references resolve. */
export function validateBundle(bundle: ChapterBundle): Issue[] {
  const issues: Issue[] = [];
  issues.push(...validateManifest(bundle.manifest));
  issues.push(...validateSkillGraph(bundle.skillGraph));
  const known = new Set((bundle.skillGraph?.skills ?? []).map((s) => s.id));
  bundle.quizzes.forEach((quiz, i) => {
    const label = `quizzes[${i}](${quiz?.id ?? '?'})`;
    issues.push(...validateQuizFile(quiz, known, label));
  });
  // Manifest quiz count should match the loaded quizzes.
  if (bundle.manifest?.quizzes && bundle.manifest.quizzes.length !== bundle.quizzes.length) {
    issues.push({
      path: 'manifest.quizzes',
      message: `Manifest lists ${bundle.manifest.quizzes.length} quizzes but ${bundle.quizzes.length} were loaded.`,
    });
  }
  return issues;
}

export class BundleValidationError extends Error {
  issues: Issue[];
  constructor(issues: Issue[]) {
    super(issues.map((e) => `${e.path}: ${e.message}`).join('\n'));
    this.name = 'BundleValidationError';
    this.issues = issues;
  }
}

export function assertBundle(bundle: ChapterBundle): ChapterBundle {
  const issues = validateBundle(bundle);
  if (issues.length) throw new BundleValidationError(issues);
  return bundle;
}
