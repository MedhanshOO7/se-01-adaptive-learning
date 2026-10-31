import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { loadLearningConfig } from '../teacher/learning/load.ts';
import { createLearningController } from '../student/learning/controller.ts';

test('reader-independent controller persists evidence, routes weak skills and recovers after practice', async () => {
  const config = await loadLearningConfig('content/learning-fractions');
  const dom = new JSDOM('', { url: 'https://learning.test' });
  const storage = dom.window.localStorage;
  const engine = createLearningController(config, storage, 'student');
  assert.equal(engine.results().completed, false);
  assert.ok(engine.results().axes.every(a => a.value === null));
  assert.equal(engine.submit('missing', 0, false).saved, false);
  const questions = config.quizzes[0].questions;
  assert.equal(engine.submit(questions[3].id, '1/0', false).saved, false);
  for (const [i, q] of questions.entries()) assert.equal(engine.submit(q.id, i === 0 ? 1 : q.answer, false).saved, true);
  assert.equal(engine.results().next?.file, 'lessons/equal-parts.md');
  const resumed = createLearningController(config, storage, 'student');
  assert.equal(resumed.results().next?.file, 'lessons/equal-parts.md');
  assert.equal(resumed.submit('target-equal-parts-question', 0, false).saved, true);
  assert.equal(resumed.results().next?.file, 'lessons/next.md');
  assert.equal(createLearningController(config, storage, 'another-student').results().completed, false);
  dom.window.close();
});

test('failed writes and unreadable evidence never advance results or overwrite saved data', async () => {
  const config = await loadLearningConfig('content/learning-fractions');
  const dom = new JSDOM('', { url: 'https://learning.test' });
  const storage = dom.window.localStorage;
  const corruptKey = 'se01-learning:1:' + config.id + ':' + config.revision + ':corrupt';
  storage.setItem(corruptKey, '{invalid');
  const corrupt = createLearningController(config, storage, 'corrupt');
  assert.match(corrupt.error, /could not be read/);
  assert.equal(corrupt.submit(config.quizzes[0].questions[0].id, 0, false).saved, false);
  assert.equal(storage.getItem(corruptKey), '{invalid');
  const broken = createLearningController(config, storage, 'broken');
  Object.defineProperty(dom.window.Storage.prototype, 'setItem', { value: () => { throw new Error('full'); }, configurable: true });
  assert.equal(broken.submit(config.quizzes[0].questions[0].id, 0, false).saved, false);
  assert.equal(broken.state.attempts.length, 0);
  assert.equal(broken.results().next, null);
  dom.window.close();
});
