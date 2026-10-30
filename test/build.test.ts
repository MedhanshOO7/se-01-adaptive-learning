import { test } from 'node:test';
import assert from 'node:assert/strict';
import { injectRuntime, buildConfig } from '../teacher/build/build.ts';
import { loadBundle } from '../teacher/build/load.ts';

test('injectRuntime inserts config + runtime before </body>', async () => {
  const bundle = await loadBundle('content/fractions');
  const config = buildConfig(bundle, 'secret');
  const html = '<html><body><main>lesson</main></body></html>';
  const out = injectRuntime(html, config, 'console.log("rt")');

  assert.ok(out.includes('window.__SE01__='));
  assert.ok(out.includes('console.log("rt")'));
  // Scripts land inside <body>, before the closing tag.
  assert.ok(out.indexOf('window.__SE01__') < out.indexOf('</body>'));
  assert.ok(out.indexOf('<main>lesson</main>') < out.indexOf('window.__SE01__'));
});

test('injected config carries the quizzes and skill graph the runtime needs', async () => {
  const bundle = await loadBundle('content/fractions');
  const config = buildConfig(bundle, 'secret');
  assert.equal(config.chapterId, 'equivalent-fractions');
  assert.equal(config.quizzes[0].questions[0].skill, 'equivalence');
  assert.ok(config.skillGraph.skills.some((s) => s.id === 'multiply-both'));
});

test('injectRuntime appends when no </body> is present', async () => {
  const bundle = await loadBundle('content/fractions');
  const out = injectRuntime('<div>x</div>', buildConfig(bundle, 's'), 'RT_MARKER');
  assert.ok(out.includes('RT_MARKER'));
  assert.ok(out.startsWith('<div>x</div>'));
});
