// Create a starter chapter bundle for the author-chapter skill to fill in.
//   node teacher/author-chapter/scaffold.ts <slug> "<Title>" [language]
//
// Writes content/<slug>/ with template manifest, skills, quiz, and chapter.md. Refuses to
// overwrite an existing bundle. The skeleton is structurally valid (it passes the validator)
// but its content is TODO placeholders — the skill replaces every TODO with real material.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [slug, title, language = 'en'] = process.argv.slice(2);
if (!slug || !title) {
  console.error('Usage: node teacher/author-chapter/scaffold.ts <slug> "<Title>" [language]');
  process.exit(1);
}

const dir = join('content', slug);
if (existsSync(dir)) {
  console.error(`✗ ${dir} already exists — choose another slug or edit it directly.`);
  process.exit(1);
}

mkdirSync(join(dir, 'quiz'), { recursive: true });

const write = (rel: string, data: unknown) =>
  writeFileSync(join(dir, rel), typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n');

write('manifest.json', {
  schemaVersion: 1,
  id: slug,
  revision: '1',
  title,
  language,
  lesson: 'chapter.md',
  quizzes: ['quiz/1.json'],
  skills: 'skills.json',
});

write('skills.json', {
  schemaVersion: 1,
  skills: [
    { id: 'TODO-foundation', label: 'TODO prerequisite skill', prerequisiteIds: [] },
    { id: 'TODO-target', label: 'TODO main skill', prerequisiteIds: ['TODO-foundation'] },
  ],
  prereqPool: {
    'TODO-foundation': [
      { q: 'TODO prerequisite question?', options: ['TODO', 'TODO'], answer: 0, skill: 'TODO-foundation', difficulty: 'intro' },
    ],
  },
});

write('quiz/1.json', {
  schemaVersion: 1,
  id: `${slug}-check`,
  title: 'Check your understanding',
  questions: [
    { q: 'TODO question?', options: ['TODO', 'TODO'], answer: 0, explanation: 'TODO', skill: 'TODO-target', difficulty: 'core' },
  ],
});

write('chapter.md', `---
title: ${title}
slug: ${slug}
description: TODO one-line description.
status: unread
---

# ${title}

TODO: explain the concept, drawing only on the source material.

> [!tip]
> TODO: a helpful note.

## Worked example

TODO.

## Your turn

![Check your understanding](quiz/1.json)
`);

console.log(`✓ scaffolded ${dir} — fill in the TODOs, then run: npm run validate ${dir}`);
