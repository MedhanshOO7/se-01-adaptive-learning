import { test } from 'node:test';
import assert from 'node:assert/strict';
import { openEventStore, memoryBackend } from '../student/runtime/store.ts';
import { localStorageBackend } from '../student/runtime/idb.ts';
import { chooseRemediation, prerequisitesOf } from '../student/runtime/adaptation.ts';
import { loadBundle } from '../teacher/build/load.ts';

const storeOpts = { secret: 'test-secret', chapterId: 'c', chapterRevision: '1' };

test('store appends an append-only, verifiable hash chain', async () => {
  const backend = memoryBackend();
  const store = await openEventStore({ backend, ...storeOpts });
  await store.append({ quizId: 'q1', questionIndex: 0, skillId: 'equivalence', selectedOption: 0, correct: true });
  const second = await store.append({ quizId: 'q1', questionIndex: 1, skillId: 'simplify', selectedOption: 2, correct: false });

  const events = await store.list();
  assert.equal(events.length, 2);
  assert.equal(events[1].prevHash, events[0].hash);
  assert.equal(second.attemptNumber, 1);
  assert.equal(second.independent, true);
  assert.deepEqual(await store.verify(), { ok: true });
});

test('concurrent appends stay serialized and keep the chain intact', async () => {
  const store = await openEventStore({ backend: memoryBackend(), ...storeOpts });
  // Fire both before awaiting either — the race a double/fast click would cause.
  await Promise.all([
    store.append({ quizId: 'q1', questionIndex: 0, skillId: 's', selectedOption: 0, correct: true }),
    store.append({ quizId: 'q1', questionIndex: 1, skillId: 's', selectedOption: 0, correct: true }),
  ]);
  const events = await store.list();
  assert.equal(events.length, 2);
  assert.equal(events[1].prevHash, events[0].hash);
  assert.deepEqual(await store.verify(), { ok: true });
});

test('localStorage backend persists the chain across a reopen (file:// fallback)', async () => {
  const m = new Map<string, string>();
  const ls = {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, String(v)),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: (i: number) => [...m.keys()][i] ?? null,
    get length() { return m.size; },
  } as Storage;

  const s1 = await openEventStore({ backend: localStorageBackend('se01:c', ls), ...storeOpts });
  await s1.append({ quizId: 'q1', questionIndex: 0, skillId: 's', selectedOption: 0, correct: true });

  // Simulate reopening the page: a fresh backend/store over the same storage.
  const s2 = await openEventStore({ backend: localStorageBackend('se01:c', ls), ...storeOpts });
  const events = await s2.list();
  assert.equal(events.length, 1);
  assert.equal(events[0].correct, true);
  assert.deepEqual(await s2.verify(), { ok: true });
});

test('a second attempt at the same question is not independent', async () => {
  const store = await openEventStore({ backend: memoryBackend(), ...storeOpts });
  await store.append({ quizId: 'q1', questionIndex: 0, skillId: 's', selectedOption: 1, correct: false });
  const retry = await store.append({ quizId: 'q1', questionIndex: 0, skillId: 's', selectedOption: 0, correct: true });
  assert.equal(retry.attemptNumber, 2);
  assert.equal(retry.independent, false);
});

test('reordering stored records is detected', async () => {
  const backend = memoryBackend();
  const store = await openEventStore({ backend, ...storeOpts });
  await store.append({ quizId: 'q1', questionIndex: 0, skillId: 's', selectedOption: 0, correct: true });
  await store.append({ quizId: 'q1', questionIndex: 1, skillId: 's', selectedOption: 0, correct: true });

  const records = await backend.getAll();
  const tampered = memoryBackend([records[1], records[0]]); // swap order
  const reopened = await openEventStore({ backend: tampered, ...storeOpts });
  const result = await reopened.verify();
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.brokenAt, 0);
});

test('editing a stored event (via a wrong secret) is detected', async () => {
  const backend = memoryBackend();
  const store = await openEventStore({ backend, ...storeOpts });
  await store.append({ quizId: 'q1', questionIndex: 0, skillId: 's', selectedOption: 0, correct: true });
  // A different secret cannot decrypt/verify the chain — stands in for an outside edit.
  const forged = await openEventStore({ backend, ...storeOpts, secret: 'other-secret' });
  const result = await forged.verify();
  assert.equal(result.ok, false);
});

test('adaptation steps back to a prerequisite skill, not a repeat', async () => {
  const { skillGraph } = await loadBundle('content/fractions');
  assert.deepEqual(prerequisitesOf(skillGraph, 'equivalence'), ['equal-parts', 'multiply-both']);

  const remediation = chooseRemediation(skillGraph, 'equivalence');
  assert.ok(remediation, 'expected a remediation question');
  assert.notEqual(remediation!.skillId, 'equivalence'); // stepped back, did not repeat
  assert.ok(['equal-parts', 'multiply-both'].includes(remediation!.skillId));
  assert.equal(remediation!.question.skill, remediation!.skillId);
});

test('adaptation falls back to reinforcement when a skill has no prerequisites', () => {
  const { } = {};
  const graph = {
    schemaVersion: 1 as const,
    skills: [{ id: 'root', label: 'Root', prerequisiteIds: [] }],
    prereqPool: { root: [{ q: 'again?', options: ['a', 'b'], answer: 0, skill: 'root' }] },
  };
  const r = chooseRemediation(graph, 'root');
  assert.equal(r?.skillId, 'root');
});
