import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadBundle } from '../teacher/build/load.ts';
import {
  validateBundle,
  validateSkillGraph,
  validateQuizFile,
  type ChapterBundle,
} from '../shared/schema/index.ts';

test('the sample fractions bundle is valid', async () => {
  const bundle = await loadBundle('content/fractions');
  assert.deepEqual(validateBundle(bundle), []);
});

test('an answer index out of range is rejected', () => {
  const issues = validateQuizFile(
    { schemaVersion: 1, id: 'q', questions: [{ q: 'x', options: ['a', 'b'], answer: 5 }] },
    new Set(),
  );
  assert.ok(issues.some((i) => i.path.endsWith('.answer')));
});

test('a question tagged with an unknown skill is rejected', () => {
  const issues = validateQuizFile(
    { schemaVersion: 1, id: 'q', questions: [{ q: 'x', options: ['a', 'b'], answer: 0, skill: 'ghost' }] },
    new Set(['real']),
  );
  assert.ok(issues.some((i) => i.message.includes('Unknown skill')));
});

test('a prerequisite pointing at a missing skill is rejected', () => {
  const issues = validateSkillGraph({
    schemaVersion: 1,
    skills: [{ id: 'a', label: 'A', prerequisiteIds: ['missing'] }],
    prereqPool: {},
  });
  assert.ok(issues.some((i) => i.message.includes('Unknown prerequisite')));
});

test('a manifest/quiz count mismatch is reported', async () => {
  const bundle = await loadBundle('content/fractions');
  const broken: ChapterBundle = {
    ...bundle,
    manifest: { ...bundle.manifest, quizzes: [...bundle.manifest.quizzes, 'quiz/2.json'] },
  };
  const issues = validateBundle(broken);
  assert.ok(issues.some((i) => i.path === 'manifest.quizzes'));
});
