import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { wireRuntime, type RuntimeConfig } from '../student/runtime/dom.ts';
import { openEventStore, memoryBackend } from '../student/runtime/store.ts';
import { loadBundle } from '../teacher/build/load.ts';

function quizMarkup(answers: number[], blockIdx = 0): string {
  const questions = answers
    .map(
      (_, qi) => `<div class="bk-question" id="quiz-${blockIdx}-q${qi}">
        <button class="bk-opt" data-opt-idx="0">A</button>
        <button class="bk-opt" data-opt-idx="1">B</button>
        <button class="bk-opt" data-opt-idx="2">C</button>
        <div id="quiz-${blockIdx}-q${qi}-exp" hidden></div></div>`,
    )
    .join('');
  const data = Buffer.from(JSON.stringify(answers)).toString('base64');
  return `<div class="bk-quiz"><div class="bk-quiz-data" hidden>${data}</div>${questions}</div>`;
}

async function setup() {
  const bundle = await loadBundle('content/fractions');
  const dom = new JSDOM(`<body>${quizMarkup(bundle.quizzes[0].questions.map((q) => q.answer))}</body>`);
  const g = globalThis as any;
  g.document = dom.window.document;
  const store = await openEventStore({ backend: memoryBackend(), secret: 's', chapterId: 'c', chapterRevision: '1' });
  const config: RuntimeConfig = { chapterId: 'c', chapterRevision: '1', quizzes: bundle.quizzes, skillGraph: bundle.skillGraph };
  wireRuntime(config, store);
  return { dom, store, config };
}

function clickOption(doc: Document, questionId: string, optIdx: number) {
  const btn = doc.querySelector(`#${questionId} .bk-opt[data-opt-idx="${optIdx}"]`) as any;
  btn.dispatchEvent(new (btn.ownerDocument.defaultView as any).MouseEvent('click', { bubbles: true }));
}

test('a wrong answer injects a prerequisite follow-up (personalization)', async () => {
  const { dom, store } = await setup();
  const doc = dom.window.document;

  // q0 is the "equivalence" question; its correct answer is 0 — click a wrong option.
  clickOption(doc, 'quiz-0-q0', 2);
  await new Promise((r) => setTimeout(r, 20)); // let the async append + render settle

  const followup = doc.querySelector('.bk-quiz[data-se01-prereq]');
  assert.ok(followup, 'expected a prerequisite follow-up to be injected');
  const skill = (followup as any).dataset.skill;
  assert.ok(['equal-parts', 'multiply-both'].includes(skill), `stepped back to a prerequisite, got ${skill}`);

  const events = await store.list();
  assert.equal(events.length, 1);
  assert.equal(events[0].correct, false);
  assert.equal(events[0].skillId, 'equivalence');
});

test('a correct answer injects no follow-up', async () => {
  const { dom, store } = await setup();
  const doc = dom.window.document;
  clickOption(doc, 'quiz-0-q0', 0); // correct
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(doc.querySelector('.bk-quiz[data-se01-prereq]'), null);
  assert.equal((await store.list())[0].correct, true);
});
