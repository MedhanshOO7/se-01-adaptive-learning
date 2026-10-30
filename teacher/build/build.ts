// Stage 1→2 build: a validated chapter bundle → a standalone, offline student HTML file.
//
//   1. load + validate the bundle (fail fast on a broken contract)
//   2. run mr-md to render the lesson + quizzes to standalone HTML
//   3. inject the student runtime + config (quizzes, skill graph, secret) into that HTML
//
// mr-md needs Bun on the build machine; the produced HTML needs nothing (students run offline).

import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
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

function runMrMd(lessonPath: string, outDir: string): void {
  const result = spawnSync('bunx', ['mr-md', 'build', lessonPath, '--out', outDir], {
    stdio: 'inherit',
    encoding: 'utf8',
  });
  if (result.error && (result.error as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new Error(
      'mr-md needs Bun, which was not found on PATH.\n' +
        'Install it (https://bun.sh) and re-run the build. The student runtime and schema ' +
        'do not need Bun; only this render step does.',
    );
  }
  if (result.status !== 0) throw new Error(`mr-md build failed with exit code ${result.status}.`);
}

/** Newest .html under a directory (mr-md's output filename isn't fixed across versions). */
function newestHtml(dir: string): string {
  const htmls = readdirSync(dir)
    .filter((f) => f.endsWith('.html') && f !== 'demo.html') // demo.html is our own artifact
    .map((f) => join(dir, f));
  if (htmls.length === 0) throw new Error(`mr-md produced no .html file in ${dir}.`);
  return htmls.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
}

export async function buildChapter(bundleDir: string, outDir: string): Promise<string> {
  const bundle = await loadBundle(bundleDir);
  const issues = validateBundle(bundle);
  if (issues.length) {
    throw new Error(`Bundle is invalid:\n${issues.map((i) => `  ${i.path}: ${i.message}`).join('\n')}`);
  }

  mkdirSync(outDir, { recursive: true });
  const secret = resolveSecret(outDir);
  const runtimeJs = await bundleRuntime();

  runMrMd(join(bundleDir, bundle.manifest.lesson), outDir);

  const htmlPath = newestHtml(outDir);
  const injected = injectRuntime(readFileSync(htmlPath, 'utf8'), buildConfig(bundle, secret), runtimeJs);
  writeFileSync(htmlPath, injected);
  return htmlPath;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bundleDir = resolve(process.argv[2] ?? 'content/fractions');
  const outDir = resolve(process.argv[3] ?? 'dist');
  const htmlPath = await buildChapter(bundleDir, outDir);
  console.log(`✓ built ${basename(htmlPath)} → ${htmlPath}`);
}
