// Automated stage-1 authoring: a chapter PDF in, a validated chapter bundle out, then built
// to the offline student HTML. One command does the whole teacher → student hand-off.
//
//   ANTHROPIC_API_KEY=sk-... node teacher/author-chapter/generate.ts <chapter.pdf> [slug]
//
// The LLM (Claude) reads the PDF and returns the lesson markdown, a skill graph with
// prerequisite questions, and skill-tagged quizzes. We write them, validate against the
// shared schema, and then run the build (which needs Bun for mr-md).

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { validateBundle, type Manifest, type QuizFile, type SkillGraph } from '../../shared/schema/index.ts';
import { loadBundle } from '../build/load.ts';
import { buildChapter } from '../build/build.ts';

const MODEL = 'claude-opus-5-5';

interface Generated {
  title: string;
  slug: string;
  language: string;
  chapterMarkdown: string;
  skills: SkillGraph;
  quizzes: { path: string; file: QuizFile }[];
}

const SYSTEM = `You convert a source lesson (a PDF) into an SE-01 "chapter bundle" for an
offline adaptive-learning app. You output ONLY a single JSON object, no prose, no code fence.

The JSON has this exact shape:
{
  "title": string,
  "slug": string,                     // kebab-case, derived from the title
  "language": "en",
  "chapterMarkdown": string,          // the lesson, in mr-md markdown (see rules)
  "skills": {
    "schemaVersion": 1,
    "skills": [ { "id": kebab-id, "label": string, "prerequisiteIds": [ids...] } ],
    "prereqPool": { "<skill-id>": [ Question, ... ] }   // remediation questions
  },
  "quizzes": [ { "path": "quiz/1.json", "file": {
    "schemaVersion": 1, "id": kebab-id, "title": string, "questions": [ Question, ... ] } } ]
}

A Question is: { "q": string, "options": [>=2 strings], "answer": 0-based-index-into-options,
"explanation": string, "skill": "<an id present in skills.skills>", "difficulty": "intro"|"core"|"stretch" }.

Rules:
- Draw ONLY on the PDF's content. Do not invent facts. If the PDF is unclear, keep it simple.
- Design a small skill graph (3-6 skills). "prerequisiteIds" are the skills a student must
  understand first — these drive the app stepping back when a student struggles, so set them
  thoughtfully. No cycles; a skill is never its own prerequisite.
- For EVERY skill that has prerequisites, put 1-3 "intro" questions for each prerequisite skill
  into prereqPool, keyed by that prerequisite's id. This is the remediation material.
- Inline quiz questions are usually "core"; prereqPool questions are "intro".
- Every question's "skill" must be an id you declared in skills.skills.
- chapterMarkdown is mr-md markdown: YAML frontmatter (title, slug, description, status: unread),
  then prose with headings, a worked example, an optional callout (> [!tip]), and it MUST end
  with a quiz reference line: ![Check your understanding](quiz/1.json)`;

async function generate(pdfPath: string, slugOverride?: string): Promise<Generated> {
  const client = new Anthropic(); // resolves ANTHROPIC_API_KEY / auth profile
  const pdfB64 = readFileSync(pdfPath).toString('base64');

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: pdfB64 } },
          {
            type: 'text',
            text:
              'Turn this chapter into the JSON bundle described in the system prompt.' +
              (slugOverride ? ` Use the slug "${slugOverride}".` : '') +
              ' Output only the JSON object.',
          },
        ],
      },
    ],
  });

  const text = response.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('');
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1); // tolerate stray wrapping
  try {
    return JSON.parse(json) as Generated;
  } catch {
    throw new Error('Model did not return valid JSON. Raw response:\n' + text.slice(0, 2000));
  }
}

function writeBundle(outDir: string, g: Generated): Manifest {
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
  return manifest;
}

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error('Usage: ANTHROPIC_API_KEY=... node teacher/author-chapter/generate.ts <chapter.pdf> [slug]');
    process.exit(1);
  }
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
    console.error('Set ANTHROPIC_API_KEY (your Claude API key) first, e.g.\n  export ANTHROPIC_API_KEY=sk-ant-...');
    process.exit(1);
  }

  console.log(`• Reading ${basename(pdfPath)} and generating the chapter with ${MODEL}…`);
  const g = await generate(pdfPath, process.argv[3]);

  const outDir = resolve('content', g.slug);
  writeBundle(outDir, g);
  console.log(`• Wrote bundle → ${outDir}`);

  const issues = validateBundle(await loadBundle(outDir));
  if (issues.length) {
    console.error(`✗ Generated bundle has ${issues.length} issue(s) — review/fix and re-run the build:`);
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
