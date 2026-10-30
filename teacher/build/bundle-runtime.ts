// Bundle the student runtime (student/runtime/index.ts + its imports) into a single,
// minified, browser-ready IIFE. The build injects the result into mr-md's HTML output.

import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const entry = resolve(here, '../../student/runtime/index.ts');

/** Returns the bundled runtime JS as a string (no file written). */
export async function bundleRuntime(): Promise<string> {
  const result = await build({
    entryPoints: [entry],
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: 'es2022',
    minify: true,
    write: false,
  });
  return result.outputFiles[0].text;
}

// Allow running directly: `node teacher/build/bundle-runtime.ts` prints size.
if (import.meta.url === `file://${process.argv[1]}`) {
  const js = await bundleRuntime();
  console.log(`✓ student runtime bundled — ${(js.length / 1024).toFixed(1)} KB`);
}
