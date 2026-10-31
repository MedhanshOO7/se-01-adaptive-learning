import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { JSDOM } from 'jsdom';
import { compileMarkdown } from '../compiler/index.ts';
import compiler from '../compiler/in-house.ts';
import { buildChapter } from '../teacher/build/build.ts';

test('in-house compiler renders lesson, quiz interactions and reader controls offline', async () => {
  const html = await compileMarkdown({ lessonPath: resolve('content/fractions/chapter.md'), bundleDir: resolve('content/fractions') }, compiler);
  const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'https://example.test/' });
  const doc = dom.window.document;
  assert.equal(doc.querySelector('h1')?.textContent, 'Equivalent fractions');
  assert.equal(doc.querySelectorAll('.bk-question').length, 3);
  const options = doc.querySelectorAll<HTMLButtonElement>('.bk-question .bk-opt');
  options[1].click();
  assert.ok(options[1].classList.contains('wrong'));
  assert.ok(options[0].classList.contains('correct'));
  assert.equal(doc.querySelector<HTMLElement>('.bk-exp')?.hidden, false);
  doc.querySelector<HTMLButtonElement>('#theme')!.click();
  assert.equal(doc.documentElement.dataset.theme, 'dark');
  const color = doc.querySelector<HTMLInputElement>('#accent')!;
  color.value = '#123456'; color.dispatchEvent(new dom.window.Event('input'));
  assert.equal(doc.documentElement.style.getPropertyValue('--accent'), '#123456');
  dom.window.close();
});

test('build injects runtime into in-house output and preserves mounts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'se01-render-'));
  try {
    const out = await buildChapter('content/fractions', dir, compiler);
    const html = await readFile(out, 'utf8');
    assert.match(html, /window\.__SE01__=/);
    assert.match(html, /bk-quiz-data/);
    const lessonPath = join(dir, 'mount.md');
    await writeFile(lessonPath, '# Test\n\n<div data-se01-quiz="test-1"></div>\n');
    assert.match(await compileMarkdown({ lessonPath, bundleDir: dir }, compiler), /data-se01-quiz="test-1"/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
