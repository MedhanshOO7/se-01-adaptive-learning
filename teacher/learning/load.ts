import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { validateConfig } from '../../shared/learning/validate.ts';
import type { ChapterConfig } from '../../shared/learning/types.ts';

/** Load the master chapter contract and verify that all lesson targets exist inside it. */
export async function loadLearningConfig(root: string): Promise<ChapterConfig> {
  const data: unknown = JSON.parse(await readFile(resolve(root, 'chapter.config.json'), 'utf8'));
  validateConfig(data);
  const base = await realpath(root);
  for (const page of data.pages) {
    const file = await realpath(resolve(base, page.file));
    if (!file.startsWith(base + sep) || !(await stat(file)).isFile()) {
      throw new Error(`Page must be a file inside the chapter folder: ${page.file}`);
    }
  }
  return data;
}
