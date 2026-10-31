import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { compileMarkdown } from '../compiler/index.ts';

const mount = '<div data-se01-quiz="fractions-1"></div>';

test('compiler preserves quiz mounts and detects removed or duplicate mounts', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'se01-mount-'));
  const lessonPath = join(dir, 'lesson.md');
  const input = { lessonPath, bundleDir: dir };
  try {
    await writeFile(lessonPath, `# Lesson\n\n${mount}\n\n\`\`\`html\n${mount}\n\`\`\`\n`);
    assert.equal(await compileMarkdown(input, { name: 'test', compile: () => `<body>${mount}</body>` }), `<body>${mount}</body>`);
    await assert.rejects(compileMarkdown(input, { name: 'strips html', compile: () => '<body></body>' }), /must preserve quiz mount/);
    await assert.rejects(compileMarkdown(input, { name: 'duplicates', compile: () => `<body>${mount}${mount}</body>` }), /found 2/);
    await writeFile(lessonPath, `${mount}\n${mount}\n`);
    await assert.rejects(compileMarkdown(input, { name: 'test', compile: () => mount }), /Duplicate quiz mount ID/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
