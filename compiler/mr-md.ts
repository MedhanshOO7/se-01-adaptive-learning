import { spawn, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import type { MarkdownCompiler } from './types.ts';

/** mr-md owns rendering; the caller owns the final output and runtime injection. */
export const mrMdCompiler: MarkdownCompiler = {
  name: 'mr-md',
  async watch({ lessonPath }) {
    await new Promise<void>((resolve, reject) => {
      const child = spawn('bunx', ['mr-md', 'dev', lessonPath], { stdio: 'inherit' });
      child.on('error', (error) => reject(new Error(`Could not start mr-md: ${error.message}`)));
      child.on('exit', (code, signal) => {
        if (code === 0 || signal === 'SIGINT' || signal === 'SIGTERM') resolve();
        else reject(new Error(`mr-md dev failed (${signal ?? `exit code ${code}`}).`));
      });
    });
  },
  compile({ lessonPath, bundleDir }) {
    const dir = mkdtempSync(join(tmpdir(), 'se01-mr-md-'));
    try {
      const copy = join(dir, 'bundle');
      cpSync(bundleDir, copy, { recursive: true, filter: (path) => path !== join(bundleDir, 'out') });
      const lesson = join(copy, relative(bundleDir, lessonPath));
      const result = spawnSync('bunx', ['mr-md', 'build', lesson], { stdio: 'inherit' });
      if (result.error) {
        if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new Error('mr-md needs Bun (bunx) on PATH. Install https://bun.sh and re-run the build.');
        }
        throw new Error(`Could not start mr-md: ${result.error.message}`);
      }
      if (result.status !== 0) throw new Error(`mr-md build failed (${result.signal ?? `exit code ${result.status}`}).`);
      const output = join(dirname(lesson), 'out');
      const files = readdirSync(output).filter((file) => file.endsWith('.html'));
      if (files.length !== 1) throw new Error(`mr-md must produce exactly one HTML file; found ${files.length}.`);
      return readFileSync(join(output, files[0]), 'utf8');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  },
};

export default mrMdCompiler;
