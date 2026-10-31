import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { buildLearningChapter } from '../teacher/learning/build.ts';
import { loadCompiler } from '../compiler/index.ts';
import { validateConfig } from '../shared/learning/validate.ts';

const source = await readFile(new URL('./Journey-Inside-the-Atom.md', import.meta.url), 'utf8');
const marker = /<!-- SE01_CONFIG\s*\n([\s\S]*?)\nSE01_CONFIG -->/g;
const matches = [...source.matchAll(marker)];
if (matches.length !== 1) throw new Error('Expected exactly one SE01_CONFIG block in the chapter Markdown');
const config: unknown = JSON.parse(matches[0][1]);
validateConfig(config);
const stage = await mkdtemp(join(tmpdir(), 'se01-atom-'));
try {
  await writeFile(join(stage, 'chapter.md'), source.replace(marker, ''));
  await writeFile(join(stage, 'chapter.config.json'), JSON.stringify(config, null, 2));
  for (const page of config.pages) {
    if (page.file === config.entry) continue;
    if (!page.file.startsWith('tracks/') || page.quizzes.length !== 1) throw new Error(`Unsupported generated track: ${page.file}`);
    const route = config.routing.rules.find(rule => rule.file === page.file) ?? config.routing.fallback;
    const lesson = `# ${page.title}\n\n${route.reason}\n\nReturn to the chapter whenever you need to review the ideas, then try these questions.\n\n<div data-learning-quiz="${page.quizzes[0]}"></div>\n\n[Return to the chapter and try the checks again](../chapter.md). Your saved answers stay on this device and your profile updates when you answer again.\n\n<div data-learning-stats></div>\n\n<div data-learning-next></div>\n`;
    const target = join(stage, page.file);
    await mkdir(join(target, '..'), { recursive: true });
    await writeFile(target, lesson);
  }
  const output = resolve('dist/e2e-playground');
  const entry = await buildLearningChapter(stage, output, await loadCompiler());
  console.log(`Built ${entry}`);
} finally { await rm(stage, { recursive: true, force: true }); }
