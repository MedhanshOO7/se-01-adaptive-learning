#!/usr/bin/env bun
import { access, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, join, resolve } from 'node:path';
import { watchWithPreview } from './preview.ts';
import { compileMarkdown, loadCompiler } from './index.ts';

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: compile <file.md> [-w | --watch | -watch]');
    return;
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
  const engine = await loadCompiler();
  if (flags.length) {
    const hasPreview = await access(join(input.bundleDir, 'se01-preview.js')).then(() => true, () => false);
    if (hasPreview) {
      console.log(`Watching ${lessonPath} with quiz preview. Press Ctrl+C to stop.`);
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
