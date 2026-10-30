// Load a chapter bundle from disk into the in-memory shape the schema validates and the
// build consumes. Teacher-side only (uses Node fs); the student runtime never loads bundles.

import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ChapterBundle, Manifest, QuizFile, SkillGraph } from '../../shared/schema/index.ts';

async function readJson<T>(path: string): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T;
  } catch (err) {
    throw new Error(`Could not read JSON at ${path}: ${(err as Error).message}`);
  }
}

/** Read `manifest.json`, the skill graph, and every listed quiz from a bundle directory. */
export async function loadBundle(bundleDir: string): Promise<ChapterBundle> {
  const manifest = await readJson<Manifest>(join(bundleDir, 'manifest.json'));
  const skillGraph = await readJson<SkillGraph>(join(bundleDir, manifest.skills ?? 'skills.json'));
  const quizPaths = Array.isArray(manifest.quizzes) ? manifest.quizzes : [];
  const quizzes = await Promise.all(quizPaths.map((p) => readJson<QuizFile>(join(bundleDir, p))));
  return { manifest, skillGraph, quizzes };
}
