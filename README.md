# SE-01 — Offline Adaptive Learning

Students read a curated lesson, practise, and are nudged toward the right next question
based on what they got wrong — **entirely offline**. Teachers prepare chapters once, with
AI help; students never need to go online.

Pilot content: Class 6 **equivalent fractions** (English).

## Two sides, one contract

The project has a **teacher side** (authoring) and a **student side** (offline learning).
They meet at exactly one thing: a **chapter bundle**, built into a standalone HTML file.

```
compiler/       replaceable Markdown-to-HTML compiler adapters
teacher/        authoring — turns a chapter bundle into offline student HTML (needs Bun for mr-md)
student/        the offline runtime bundled into that HTML (quiz capture, store, adaptation)
shared/schema/  the bundle contract both sides depend on (types + validators)
content/        chapter bundles (the hand-off artifact) — e.g. content/fractions
docs/           design docs
```

`teacher/` and `student/` never import from each other — only from `shared/`.

## Teacher AI skills

- [Dependency depth](skills/dependency-depth/SKILL.md) turns a topic Markdown file into
  linked theory notes that explain each layer using more fundamental ideas.
  The result is a draft for teacher review, not a published chapter bundle.
- [Author a chapter](teacher/author-chapter/SKILL.md) prepares a validated chapter bundle
  for the offline student app.

## The three stages

1. **Author (teacher, online + AI).** Produce a chapter bundle: `chapter.md` (the lesson,
   in [mr-md](https://github.com/chirayuChhabra/mr-md) markdown), `quiz/*.json` (curated
   questions, each tagged with a skill), and `skills.json` (a **skill graph** with
   prerequisite edges + a pool of prerequisite questions).
2. **Build → read (stage 1→2).** A replaceable compiler (mr-md by default) renders the bundle to standalone interactive HTML;
   the build injects the student runtime. The student reads it and answers the quizzes.
3. **Adapt (offline).** Each answer is graded and written to a **tamper-resistant local
   store**. On a wrong answer the runtime steps back along the skill graph and serves a
   **prerequisite** question instead of repeating the same one (e.g. miss *equivalent
   fractions* → practise *multiplying both terms* first). No AI or network at this stage.

## Develop

Requires Node ≥ 22 (24+ recommended — TypeScript runs directly). Building the HTML also
needs [Bun](https://bun.sh) for mr-md; nothing else does.

```sh
npm install
npm test            # schema, tamper-evident store, and adaptation logic
npm run typecheck
npm run validate    # validate content/fractions against the schema
npm run build       # content/fractions -> dist/ (needs Bun for the mr-md render step)
```

The build also accepts other compiler adapters; see [the compiler contract](compiler/README.md). Alternative compilers need compatible quiz integration for adaptive evidence.

To compile an individual Markdown file or preview it live, see [compiler commands](compiler/README.md).

## How the quiz layer works

Quizzes are authored with **mr-md's own quiz block** (single-answer multiple-choice). mr-md
renders a static quiz; our injected runtime adds the parts it doesn't do — skill-tagged
evidence capture, the encrypted append-only store, and prerequisite adaptation — by
observing mr-md's quiz DOM. See [`docs/quiz-and-evidence.md`](docs/quiz-and-evidence.md).

**Tamper-resistance is record integrity, not exam security.** The store encrypts attempts
and hash-chains them so edits are detected, but a local-only app has no server to hold the
key and the answer key ships in the page. It deters casual tampering; it is not formal
assessment security.

## Credits & licensing

Design docs originate from the SE-01 planning effort. The lesson renderer is
[mr-md](https://github.com/chirayuChhabra/mr-md) by Chirayu Chhabra (PolyForm
Noncommercial — fine for educational/non-profit use; revisit before any commercial use).
