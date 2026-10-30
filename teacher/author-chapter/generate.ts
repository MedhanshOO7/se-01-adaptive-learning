// Automated stage-1 authoring: a chapter source (PDF or .md/.txt) in, a validated chapter
// bundle out, then built to the offline student HTML. One command, teacher → student.
//
//   OPENCODE_API_KEY=... [OPENCODE_MODEL=...] node teacher/author-chapter/generate.ts <source> [slug]
//
// Uses the free OpenCode Zen gateway. Run `npm run models` to see available models and set
// OPENCODE_MODEL. Free models are text-only, so PDFs are extracted to text first (extract.ts).

import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { validateBundle, type Manifest, type QuizFile, type SkillGraph } from '../../shared/schema/index.ts';
import { loadBundle } from '../build/load.ts';
import { buildChapter } from '../build/build.ts';
import { extractSource } from './extract.ts';
import { chat } from './opencode.ts';

// beam-free: free, structured-output + reasoning, 1M context / 131k output — the strongest
// free model for turning a lesson into a structured bundle (run `npm run models` for the list).
const MODEL = process.env.OPENCODE_MODEL ?? 'beam-free';

interface Generated {
  title: string;
  slug: string;
  language: string;
  chapterMarkdown: string;
  skills: SkillGraph;
  quizzes: { path: string; file: QuizFile }[];
}

const SYSTEM = `You convert a source lesson (plain text) into an SE-01 "chapter bundle" for an
offline adaptive-learning app. Output ONLY a single JSON object — no prose, no markdown fence.

Shape:
{
  "title": string,
  "slug": string,                     // kebab-case, from the title
  "language": "en",
  "chapterMarkdown": string,          // the lesson, in mr-md markdown (see rules)
  "skills": {
    "schemaVersion": 1,
    "skills": [ { "id": kebab-id, "label": string, "prerequisiteIds": [ids...] } ],
    "prereqPool": { "<skill-id>": [ Question, ... ] }
  },
  "quizzes": [ { "path": "quiz/1.json", "file": {
    "schemaVersion": 1, "id": kebab-id, "title": string, "questions": [ Question, ... ] } } ]
}

A Question is: { "q": string, "options": [>=2 strings], "answer": 0-based-index-into-options,
"explanation": string, "skill": "<an id in skills.skills>", "difficulty": "intro"|"core"|"stretch" }.

Rules:
- Draw ONLY on the source text. Do not invent facts.
- Design a small skill graph (3-6 skills). "prerequisiteIds" are what a student must learn
  first — these drive the app stepping back when a student struggles. No cycles; a skill is
  never its own prerequisite.
- For EVERY skill that has prerequisites, put 1-3 "intro" questions for each prerequisite skill
  into prereqPool, keyed by that prerequisite's id.
- Inline quiz questions are usually "core"; prereqPool questions are "intro".
- Every question's "skill" must be an id declared in skills.skills.
- chapterMarkdown is mr-md markdown: YAML frontmatter (title, slug, description, status: unread),
  prose with headings and a worked example, optionally a callout (> [!tip]), and it MUST end
  with: ![Check your understanding](quiz/1.json)`;

async function generate(sourceText: string, slugOverride?: string): Promise<Generated> {
  const raw = await chat({
    model: MODEL,
    maxTokens: Number(process.env.OPENCODE_MAX_TOKENS ?? 8000),
    messages: [
      { role: 'system', content: SYSTEM },
      {
        role: 'user',
        content:
          'Source lesson:\n\n' +
          sourceText.slice(0, 40000) + // keep within free-model context limits
          '\n\nReturn ONLY the JSON bundle.' +
          (slugOverride ? ` Use the slug "${slugOverride}".` : ''),
      },
    ],
  });
  const json = raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1); // tolerate stray wrapping
  try {
    return JSON.parse(json) as Generated;
  } catch {
    throw new Error('Model did not return valid JSON. Raw response:\n' + raw.slice(0, 2000));
  }
}

function writeBundle(outDir: string, g: Generated): void {
  mkdirSync(join(outDir, 'quiz'), { recursive: true });
  const w = (rel: string, data: unknown) =>
    writeFileSync(join(outDir, rel), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');

  w('chapter.md', g.chapterMarkdown);
  w('skills.json', g.skills);
  for (const q of g.quizzes) w(q.path, q.file);
  const manifest: Manifest = {
    schemaVersion: 1,
    id: g.slug,
    revision: '1',
    title: g.title,
    language: g.language || 'en',
    lesson: 'chapter.md',
    quizzes: g.quizzes.map((q) => q.path),
    skills: 'skills.json',
  };
  w('manifest.json', manifest);
}

async function main() {
  const source = process.argv[2];
  if (!source) {
    console.error('Usage: OPENCODE_API_KEY=... node teacher/author-chapter/generate.ts <source.pdf|.md|.txt> [slug]');
    process.exit(1);
  }

  console.log(`• Extracting ${basename(source)}…`);
  const text = await extractSource(source);

  console.log(`• Generating the chapter with ${MODEL} (OpenCode Zen)…`);
  const g = await generate(text, process.argv[3]);

  const outDir = resolve('content', g.slug);
  writeBundle(outDir, g);
  console.log(`• Wrote bundle → ${outDir}`);

  const issues = validateBundle(await loadBundle(outDir));
  if (issues.length) {
    console.error(`✗ Generated bundle has ${issues.length} issue(s) — review/fix (or try another model) and re-run:`);
    for (const i of issues) console.error(`  ${i.path}: ${i.message}`);
    process.exit(1);
  }
  console.log('✓ Bundle valid.');

  try {
    const htmlPath = await buildChapter(outDir, resolve('dist'));
    console.log(`✓ Built student lesson → ${htmlPath}`);
  } catch (err) {
    console.warn(`• Bundle saved, but the render step did not run:\n  ${(err as Error).message}`);
  }
}

main();
