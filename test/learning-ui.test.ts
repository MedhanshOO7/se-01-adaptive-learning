import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { compileLearningPage, loadLearningConfig } from '../teacher/learning/build.ts';
import { validateConfig } from '../shared/learning/validate.ts';
import compiler from '../compiler/in-house.ts';

const root = 'content/reader-demo';
test('reader opens as a lesson, saves four question types and presents a real recommendation', async () => {
  const html = await compileLearningPage(root, 'chapter.md', compiler);
  const dom = new JSDOM(html, { url: 'https://lesson.test/chapter.html', runScripts: 'dangerously' });
  const d = dom.window.document;
  assert.equal(d.querySelector('h1')?.textContent, 'Fractions: parts of a whole');
  assert.ok(d.querySelector('.le-hero #theme'));
  assert.equal(d.querySelector('.le-header'), null);
  assert.equal(d.querySelector('.le-settings'), null);
  const dialog = d.querySelector<HTMLDialogElement>('.le-dialog')!;
  assert.equal(dialog.open, false);
  assert.ok(dialog.querySelector('[data-learning-stats] svg'));
  assert.equal(dialog.querySelector('.le-shape'), null);
  assert.equal(dialog.querySelectorAll('.le-skill-list li').length, 6);
  assert.equal(d.querySelector('.le-content [data-learning-stats]'), null);
  const finish = d.querySelector<HTMLButtonElement>('.le-finish-button')!;
  assert.equal(finish.disabled, true);
  const theme = d.querySelector<HTMLButtonElement>('#theme')!;
  assert.equal(theme.getAttribute('aria-label'), 'Switch to dark mode');
  theme.click();
  assert.equal(d.documentElement.dataset.theme, 'dark');
  assert.equal(theme.getAttribute('aria-label'), 'Switch to light mode');
  assert.ok(d.querySelector<HTMLInputElement>('#accent[aria-label]'));
  const config = await loadLearningConfig(root);
  for (const q of config.quizzes[0].questions) {
    const f = d.querySelector('fieldset:not([hidden])')!;
    if (q.type === 'single') (f.querySelectorAll('input')[q.answer as number] as HTMLInputElement).click();
    else if (q.type === 'multiple') (q.answer as number[]).forEach(i => (f.querySelectorAll('input')[i] as HTMLInputElement).click());
    else if (q.type === 'ordering') f.querySelectorAll('select').forEach((s, i) => s.value = String((q.answer as number[])[i]));
    else (f.querySelector('input') as HTMLInputElement).value = String(q.answer);
    f.querySelector<HTMLButtonElement>('.le-primary')!.click();
    d.querySelector<HTMLButtonElement>('.le-forward')!.click();
  }
  assert.equal(dialog.open, false);
  assert.equal(finish.disabled, false);
  finish.click();
  assert.equal(dialog.open, true);
  assert.match(d.querySelector('.le-next a')!.getAttribute('href')!, /next\.html$/);
  assert.match(d.querySelector('.le-next h2')!.textContent!, /Adding fractions/);
  assert.ok(dialog.querySelector('.le-shape'));
  assert.match(d.querySelector('.le-result-intro')!.textContent!, /A look at your learning/i);
  assert.ok(dom.window.localStorage.getItem('se01-learning:1:reader-demo:1:student'));
  d.querySelector<HTMLButtonElement>('.le-close')!.click();
  assert.equal(dialog.open, false);
  finish.click();
  assert.equal(dialog.open, true);
  dom.window.close();
});

test('chapter build rejects a compiler that loses learning markers', async () => {
  await assert.rejects(compileLearningPage(root, 'chapter.md', { name: 'broken', compile: () => '<h1>Missing</h1>' }), /marker/);
});

 test('chapter cover settings customize the heading and preserve saved color preferences', async () => {
  const html = await compileLearningPage(root, 'chapter.md', compiler);
  const base = await loadLearningConfig(root);
  const config = structuredClone(base);
  config.cover = { label: 'LESSON 1', color: '#194356', artwork: 'none' };
  validateConfig(config);
  const { mountLearning } = await import('../student/learning/runtime.ts');
  const { JSDOM } = await import('jsdom');
  const dom = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://lesson.test/' });
  mountLearning(dom.window.document, config, 'chapter.md');
  assert.equal(dom.window.document.querySelector('.le-hero-label')?.textContent, 'LESSON 1');
  assert.equal(dom.window.document.querySelector('.le-hero-art'), null);
  assert.equal(dom.window.document.documentElement.style.getPropertyValue('--accent'), '#194356');
  dom.window.close();
  const saved = new JSDOM(html.replace(/<script[\s\S]*?<\/script>/g, ''), { url: 'https://lesson.test/' });
  saved.window.localStorage.setItem('se01-reader-accent', '#b27a36');
  saved.window.document.documentElement.style.setProperty('--accent', '#b27a36');
  mountLearning(saved.window.document, config, 'chapter.md');
  assert.equal(saved.window.document.documentElement.style.getPropertyValue('--accent'), '#b27a36');
  saved.window.close();
  config.cover.color = 'red';
  assert.throws(() => validateConfig(config), /cover.color/);
});

test('ordering moves repeated choices and allows a checked incorrect order to advance', async () => {
  const html = await compileLearningPage(root, 'chapter.md', compiler);
  const dom = new JSDOM(html, { url: 'https://ordering.test/', runScripts: 'dangerously' });
  const d = dom.window.document;
  const fields = d.querySelectorAll('fieldset');
  const order = fields[2];
  const choices = order.querySelectorAll('select');
  const change = (index: number, value: string) => {
    choices[index].value = value;
    choices[index].dispatchEvent(new dom.window.Event('change', { bubbles: true }));
  };
  change(0, '1'); change(1, '0'); change(2, '2');
  change(1, '1');
  assert.deepEqual([...choices].map(s => s.value), ['0', '1', '2']);
  (order.querySelector('.le-primary') as HTMLButtonElement).click();
  assert.match(order.querySelector('.le-feedback')!.textContent!, /practice/i);
  // Move to the ordering question using the saved preceding questions.
  const fields0 = fields[0]; (fields0.querySelector('input') as HTMLInputElement).click(); (fields0.querySelector('.le-primary') as HTMLButtonElement).click();
  (d.querySelector('.le-forward') as HTMLButtonElement).click();
  (fields[1].querySelector('input') as HTMLInputElement).click(); (fields[1].querySelector('.le-primary') as HTMLButtonElement).click();
  (d.querySelector('.le-forward') as HTMLButtonElement).click();
  assert.equal((d.querySelector('.le-forward') as HTMLButtonElement).disabled, false);
  (d.querySelector('.le-forward') as HTMLButtonElement).click();
  assert.equal(fields[3].hidden, false);
  dom.window.close();
});
