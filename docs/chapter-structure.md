# Chapter structure

The authoritative shape of a chapter — both the **source bundle** a teacher produces and the
**offline artifact** a student receives. The TypeScript contract is `shared/schema/types.ts`
and the validator is `shared/schema/validate.ts`; this doc is the human-readable version.

## 1. Source bundle (on disk, `content/<slug>/`)

What the teacher authors (or the `author-chapter` skill generates). Validated by
`npm run validate content/<slug>` before anything is built.

```
content/<slug>/
  manifest.json     # what the bundle is + which files make it up
  chapter.md        # the lesson, in mr-md markdown
  skills.json       # the skill graph (prerequisites) + remediation question pool
  quiz/
    1.json          # curated inline quiz(zes), skill-tagged
    2.json          # (optional, for longer chapters)
```

### manifest.json
Pins the bundle's identity and files. `revision` is bumped on any change (attempts record the
revision they ran against).
```json
{ "schemaVersion": 1, "id": "<slug>", "revision": "1", "title": "…", "language": "en",
  "lesson": "chapter.md", "quizzes": ["quiz/1.json"], "skills": "skills.json" }
```

### chapter.md
The lesson in mr-md markdown: YAML frontmatter (`title`, `slug`, `description`, `status`),
prose (headings, lists, a worked example), optional callouts (`> [!tip]`), and one quiz
reference line per quiz file:
```markdown
![Check your understanding](quiz/1.json)
```

### skills.json — the adaptive core
The skill graph drives stage-3 adaptation. Each skill lists the skills a student must
understand **first** (`prerequisiteIds`), and `prereqPool` holds the remediation questions
served when a student misses a skill.
```json
{
  "schemaVersion": 1,
  "skills": [
    { "id": "equal-parts",  "label": "…", "prerequisiteIds": [] },
    { "id": "equivalence",  "label": "…", "prerequisiteIds": ["equal-parts", "multiply-both"] }
  ],
  "prereqPool": {
    "equal-parts": [ { "q": "…", "options": ["…","…"], "answer": 0,
                      "skill": "equal-parts", "difficulty": "intro" } ]
  }
}
```
Rules: unique skill ids; no cycles; a skill is never its own prerequisite; every prerequisite
id resolves; every pooled/quiz `skill` exists in `skills`.

### quiz/*.json
The inline questions shown in the lesson. Single-answer multiple choice (mr-md's quiz shape)
plus our `skill` + `difficulty`.
```json
{ "schemaVersion": 1, "id": "…", "title": "…",
  "questions": [ { "q": "…", "options": ["…","…","…"], "answer": 0,
                  "explanation": "…", "skill": "equivalence", "difficulty": "core" } ] }
```

### A Question (used in quizzes and the prereq pool)
| field | required | meaning |
| --- | --- | --- |
| `q` | ✓ | prompt |
| `options` | ✓ | ≥2 choices |
| `answer` | ✓ | 0-based index into `options` |
| `explanation` | – | shown after answering |
| `skill` | – (expected) | skill id this question gives evidence for |
| `difficulty` | – | `intro` \| `core` \| `stretch` |

## 2. Offline artifact (what the student gets, `dist/…html`)

`mr-md` renders `chapter.md` + its quizzes into **one standalone HTML file**. The build then
injects the student runtime and a `window.__SE01__` config so everything the adaptive loop
needs is embedded — the page runs with no network and no server:

```js
window.__SE01__ = {
  chapterId, chapterRevision,
  quizzes,       // every quiz file (questions, answers, skills, explanations)
  skillGraph,    // skills + prerequisiteIds + prereqPool (remediation questions)
  secret,        // integrity/encryption secret for the local store
}
```

So the offline page carries: the rendered lesson, the inline quizzes **with answer keys and
explanations**, the full skill graph, the prerequisite remediation pool, and the integrity
secret. Nothing is fetched at learn time.

## 3. Student state (written at runtime)

Attempts are stored locally in **IndexedDB** (`se01:<chapterId>`) as an append-only,
AES-GCM-encrypted, HMAC hash-chained log of `EvidenceEvent`s (see `student/runtime/store.ts`).
This survives reload/restart and is the record personalization reads from.

## Offline guarantee & open caveat

Everything required to **learn, be quizzed, adapt to prerequisites, and save progress** is in
the single HTML file + the browser's IndexedDB — fully offline.

**Caveat — assets.** Images/media referenced by the lesson must be **embedded** (inlined /
data-URI'd) into the built HTML, or they won't load offline. Our sample chapter is text-only;
confirm asset inlining before shipping a chapter that uses images. (Tracked in
`docs/later-addons.md`.)
