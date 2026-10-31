// Validate a chapter, compile its Markdown, then inject the student runtime.

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { compileMarkdown, loadCompiler, type MarkdownCompiler } from '../../compiler/index.ts';
import { loadBundle } from './load.ts';
import { bundleRuntime } from './bundle-runtime.ts';
import { validateBundle, type ChapterBundle } from '../../shared/schema/index.ts';
import type { InjectedConfig } from '../../student/runtime/index.ts';

/** Build the `window.__SE01__` config the runtime reads. */
export function buildConfig(bundle: ChapterBundle, secret: string): InjectedConfig {
  return {
    chapterId: bundle.manifest.id,
    chapterRevision: bundle.manifest.revision,
    quizzes: bundle.quizzes,
    skillGraph: bundle.skillGraph,
    secret,
  };
}

/** Inject the config + runtime as two scripts immediately before </body> (or append). */
export function injectRuntime(html: string, config: InjectedConfig, runtimeJs: string): string {
  const configScript = `<script>window.__SE01__=${JSON.stringify(config)};</script>`;
  const runtimeScript = `<script>${runtimeJs}</script>`;
  const marker = /<\/body>/i;
  const payload = `${configScript}\n${runtimeScript}\n`;
  return marker.test(html) ? html.replace(marker, `${payload}</body>`) : html + payload;
}

/** A stable per-bundle secret so rebuilds keep existing students' chains readable. */
function resolveSecret(outDir: string): string {
  const file = join(outDir, '.se01-secret');
  if (existsSync(file)) return readFileSync(file, 'utf8').trim();
  const secret = globalThis.crypto.randomUUID() + globalThis.crypto.randomUUID();
  mkdirSync(outDir, { recursive: true });
  writeFileSync(file, secret);
  return secret;
}

export async function buildChapter(bundleDir: string, outDir: string, compiler?: MarkdownCompiler): Promise<string> {
  const bundle = await loadBundle(bundleDir);
  const issues = validateBundle(bundle);
  if (issues.length) {
    throw new Error(`Bundle is invalid:\n${issues.map((i) => `  ${i.path}: ${i.message}`).join('\n')}`);
  }

  mkdirSync(outDir, { recursive: true });
  const secret = resolveSecret(outDir);
  const runtimeJs = await bundleRuntime();

  const html = await compileMarkdown({ lessonPath: resolve(bundleDir, bundle.manifest.lesson), bundleDir: resolve(bundleDir) }, compiler);
  const htmlPath = join(outDir, `${basename(bundle.manifest.lesson, '.md')}.html`);
  const injected = injectRuntime(html, buildConfig(bundle, secret), runtimeJs);
  writeFileSync(htmlPath, injected);
  return htmlPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bundleDir = resolve(process.argv[2] ?? 'content/fractions');
  const outDir = resolve(process.argv[3] ?? 'dist');
  const compiler = await loadCompiler(process.argv[4]);
  const htmlPath = await buildChapter(bundleDir, outDir, compiler);
  console.log(`✓ built ${basename(htmlPath)} → ${htmlPath}`);
}
