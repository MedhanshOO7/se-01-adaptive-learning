---
name: author-chapter
description: Turn an uploaded PDF (or pasted lesson text) into a validated SE-01 chapter bundle — an mr-md chapter.md, skill-tagged quiz/*.json, a skills.json skill graph with prerequisite questions, and a manifest.json — that passes `npm run validate`. Use when a teacher wants to prepare a new chapter for the offline student app.
---

# Authoring a chapter bundle

Produce a **chapter bundle** under `content/<slug>/` that the build turns into the offline
student lesson. This is the teacher (stage-1) side; it runs online with AI help. The output
must pass `npm run validate content/<slug>` before it is considered done.

Read `shared/schema/types.ts` for the exact field shapes — they are the contract, and the
validator in `shared/schema/validate.ts` enforces them.

## Steps

1. **Get the source.** If given a PDF, extract its text first (use the `pdf` skill). If given
   pasted text, use it directly. Show the teacher the extracted source so extraction errors
   don't silently become teaching material.
2. **Confirm scope** with the teacher: subject, grade, chapter title, language (`en`/`hi`/`pa`),
   and the handful of **skills** the chapter teaches.
3. **Design the skill graph** (`skills.json`). List each skill with a stable `id`, a `label`,
   and `prerequisiteIds`. Prerequisites are what a student must understand *first* — these
   edges drive adaptation, so get them right. No cycles; a skill is never its own prerequisite.
4. **Write the lesson** (`chapter.md`) in mr-md markdown (syntax below). Keep it to the
   source's content; explain, give a worked example, then reference the quiz.
5. **Write the quiz** (`quiz/1.json`, add more files if the chapter is long). Each question is
   single-answer multiple choice, tagged with the `skill` it tests and a `difficulty`.
6. **Fill the prerequisite pool** in `skills.json`. For every skill that has prerequisites,
   add a few `intro` questions to `prereqPool` for those prerequisite skills — this is the
   material adaptation serves when a student struggles. Without it, there is nothing to step
   back to.
7. **Write `manifest.json`** listing the lesson, quizzes (in order), and skills file.
8. **Validate and fix:** run `npm run validate content/<slug>` and resolve every issue.
9. **Hand to the teacher to review** correctness, answer keys, and prerequisite edges. AI
   output is a draft, not an approval.

## Two ways to run this

- **Automated (one command):** uses the free **OpenCode Zen** gateway.
  ```sh
  export OPENCODE_API_KEY=...            # free key from opencode.ai
  npm run models                         # see available models; free ones are flagged 🆓
  export OPENCODE_MODEL=<pick one>       # optional; defaults to a free model
  npm run author -- <chapter.pdf|.md|.txt> [slug]
  ```
  This extracts the source to text (PDFs via unpdf — free models are text-only), asks the
  model for the bundle, writes it to `content/<slug>/`, validates, and builds the student HTML.
  Review the result (steps 3 + 9 below) — free models are weaker, so validation may fail and
  you may need to re-run or pick a stronger model.
- **Manual / assisted:** follow the steps below yourself, writing each file. Optional starter:
  `node teacher/author-chapter/scaffold.ts <slug> "<Title>" <lang>` creates the directory with
  placeholder files to fill in.

## mr-md lesson syntax (`chapter.md`)

- **Frontmatter** (YAML): `title`, `slug`, `description`, optional `tags`, `status: unread`.
- **Prose**: ordinary Markdown — headings, lists, bold, inline `code`.
- **Callout**: a blockquote starting with `[!tip]` (`note`/`important`/`warning`/`caution`).
  ```
  > [!tip]
  > Multiplying 1/2 by 2/2 gives 2/4.
  ```
- **Quiz block**: an image-syntax line pointing at the quiz JSON. The bracket text is a caption.
  ```
  ![Check your understanding](quiz/1.json)
  ```
- Images `![alt](path.png)`, video/audio by extension, and `.ts`/`.js` simulations are also
  available but not required.

## Content shapes (must match `shared/schema`)

`quiz/1.json`:
```json
{
  "schemaVersion": 1,
  "id": "unique-quiz-id",
  "title": "Check your understanding",
  "questions": [
    { "q": "…?", "options": ["…", "…", "…"], "answer": 0,
      "explanation": "why", "skill": "<skill id from skills.json>", "difficulty": "core" }
  ]
}
```

`skills.json`:
```json
{
  "schemaVersion": 1,
  "skills": [
    { "id": "equal-parts", "label": "…", "prerequisiteIds": [] },
    { "id": "equivalence", "label": "…", "prerequisiteIds": ["equal-parts"] }
  ],
  "prereqPool": {
    "equal-parts": [ { "q": "…?", "options": ["…","…"], "answer": 0, "skill": "equal-parts", "difficulty": "intro" } ]
  }
}
```

`manifest.json`:
```json
{ "schemaVersion": 1, "id": "<slug>", "revision": "1", "title": "…", "language": "en",
  "lesson": "chapter.md", "quizzes": ["quiz/1.json"], "skills": "skills.json" }
```

## Rules

- Every `skill` referenced by a question (inline or in the pool) must exist in `skills.json`.
- `answer` is a 0-based index into that question's `options`; give at least 2 options.
- `difficulty` is `intro` | `core` | `stretch`. Inline quiz questions are usually `core`;
  prerequisite-pool questions are usually `intro`.
- Keep skill `id`s stable across translations so progress survives a language switch.
- Do not invent facts beyond the source. Flag anything uncertain for the teacher.
