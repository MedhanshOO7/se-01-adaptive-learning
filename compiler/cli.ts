#!/usr/bin/env bun
import { access, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { findLearningRoot, buildLearningChapter } from '../teacher/learning/build.ts';
import { watchWithPreview } from './preview.ts';
import { compileMarkdown, loadCompiler } from './index.ts';

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: compile <file.md> [-w | --watch] [--compiler <adapter>]');
    return;
  }
  const compilerIndex = args.indexOf('--compiler');
  let compilerPath: string | undefined;
  if (compilerIndex !== -1) {
    compilerPath = args[compilerIndex + 1];
    if (!compilerPath || compilerPath.startsWith('-')) throw new Error('--compiler requires an adapter path.');
    args.splice(compilerIndex, 2);
  }
  const flags = args.filter((arg) => arg.startsWith('-'));
  const files = args.filter((arg) => !arg.startsWith('-'));
  if (files.length !== 1 || flags.some((flag) => !['-w', '--watch', '-watch'].includes(flag))) {
    throw new Error('Usage: compile <file.md> [-w | --watch | -watch]');
  }
  const lessonPath = resolve(files[0]);
  if (extname(lessonPath).toLowerCase() !== '.md' || !(await stat(lessonPath)).isFile()) {
    throw new Error('Please provide an existing Markdown file (.md).');
  }
  const input = { lessonPath, bundleDir: dirname(lessonPath) };
  const engine = await loadCompiler(compilerPath);
  const learningRoot = await findLearningRoot(lessonPath);
  if (learningRoot) {
    if (flags.length) throw new Error('Learning chapters: rebuild after editing the chapter or its configuration.');
    const output = await buildLearningChapter(learningRoot, join(learningRoot, 'out'), engine);
    console.log(`Built learning chapter → ${output}`);
    return;
  }
  if (flags.length) {
    const hasPreview = await access(join(input.bundleDir, 'se01-preview.js')).then(() => true, () => false);
    if (hasPreview || !engine.watch) {
      console.log(`Watching ${lessonPath} with ${engine.name}. Press Ctrl+C to stop.`);
      await watchWithPreview(input, engine);
      return;
    }
    if (!engine.watch) throw new Error(`Compiler "${engine.name}" does not support watch mode.`);
    console.log(`Watching ${lessonPath} with ${engine.name}. Press Ctrl+C to stop.`);
    await engine.watch(input);
  } else {
    const html = await compileMarkdown(input, engine);
    const output = lessonPath.slice(0, -extname(lessonPath).length) + '.html';
    await writeFile(output, html);
    console.log(`Compiled ${lessonPath} → ${output}`);
  }
}

main().catch((error: Error) => { console.error(`compile: ${error.message}`); process.exitCode = 1; });
