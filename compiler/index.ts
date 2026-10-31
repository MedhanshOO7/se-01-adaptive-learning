import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import engine from './engine.ts';
import { verifyQuizMounts } from './quiz-mounts.ts';
import type { CompileInput, MarkdownCompiler } from './types.ts';

export type { CompileInput, MarkdownCompiler } from './types.ts';

/** Use mr-md by default, or load a trusted local adapter module. */
export async function loadCompiler(modulePath?: string): Promise<MarkdownCompiler> {
  if (!modulePath) return engine;
  const { default: compiler } = await import(pathToFileURL(resolve(modulePath)).href);
  if (!compiler || typeof compiler.name !== 'string' || typeof compiler.compile !== 'function') {
    throw new Error('Compiler module must default-export an object with name and compile(input).');
  }
  return compiler;
}

/** The only rendering operation the chapter builder needs. */
export async function compileMarkdown(input: CompileInput, compiler: MarkdownCompiler = engine): Promise<string> {
  const html = await compiler.compile(input);
  if (typeof html !== 'string' || !html.trim()) {
    throw new Error(`Compiler "${compiler.name}" returned empty or invalid HTML.`);
  }
  await verifyQuizMounts(input.lessonPath, html, compiler.name);
  return html;
}
