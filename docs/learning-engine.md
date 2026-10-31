# Chapter learning engine

A chapter is one portable folder. Its master `chapter.config.json` defines topics, six hexagon axes, question banks, evidence policy, completion and routes. Markdown contains lesson content and mounting markers. The learning runtime owns questions, stats and recommendations independently of the Markdown compiler.

```text
myFolder/
  chapter.config.json
  chapter.md
  lessons/
    foundations.md
    next.md
```

See the complete working example in [`content/reader-demo`](../content/reader-demo/chapter.config.json).

## Build and try it

```sh
npm ci
npm run build:learning
npm run serve:learning
# Open http://127.0.0.1:4322
# Or open dist/learning/chapter.html directly; keep the output folder together.
```

The in-house compiler is the default and needs Node 24. To build another folder or choose a trusted compiler adapter:

```sh
npm run build -- myFolder dist/myChapter
npm run build -- myFolder dist/myChapter ./my-compiler.js
node compiler/cli.ts myFolder/chapter.md
```

The command discovers the nearest `chapter.config.json` and builds all declared pages under that folder's `out/`. Watch mode for chapter folders is not available yet. Other compilers must preserve the learning markers and embed their assets.

## Markdown mounts

Put markers on their own lines, outside code fences:

```html
<div data-learning-quiz="chapter-check"></div>
<div data-learning-stats></div>
<div data-learning-next></div>
```

A page's `quizzes` array declares exactly which quiz IDs appear there, each once. Every page must include exactly one stats and one next marker. The build checks the rendered DOM, so a compiler that strips a marker fails with an actionable error. Questions and controls are entirely separate from mr-md's own quiz selectors. A page can have no quiz and still display the shared chapter profile and recommendation.

The student reads a single-column chapter, with questions embedded where the author placed them. After all required checks are answered, the **Complete chapter** button opens a modal containing the hexagon and recommended next lesson. The reader can close it and continue reading. The in-house reader retains its theme and accent controls; no skills panel appears alongside the lesson.

## Master config

The versioned contract is [`shared/learning/types.ts`](../shared/learning/types.ts). Its main fields are:

- `id`, `revision`, `title`, `entry`: chapter identity and entry Markdown file.
- `cover` (optional): `label` (up to 48 characters), `color` (a six-digit hex color) and `artwork` (`"orbit"` or `"none"`). Color is a default; a color chosen in the reader takes precedence. The chapter heading and introductory paragraph come from the Markdown.
- `pages`: all Markdown files, titles and quiz IDs. Each question bank belongs to exactly one page.
- `topics`: stable topic IDs and student-facing labels.
- `hexagon.axes`: exactly six chapter-specific axes, each with one or more topic IDs, `average` or `weakest` aggregation and `minEvidence` (distinct answered questions).
- `hexagon.evidence`: `first` or `latest` response per question. A hint multiplies a correct response's contribution by `hintedCredit` (0–1).
- `hexagon.evidenceWindow`: number of most recent distinct questions to include per topic, after choosing first/latest responses. The reader demo uses five; the fractions fixture uses one so fresh practice evidence replaces the initial estimate. Increase this to require a broader sample. Responses are ordered by saved event order, not device clock.
- `hexagon.bands`: ascending exclusive numeric thresholds and labels. Values internally run from 0 to 100; the student sees topic bands and the hexagon, without a total mark.
- `quizzes`: questions, answers, topic links, weights, hints and explanations.
- `completion.quizzes`: all questions in these checks must have a saved response before recommendations appear. The hexagon appears in the completion pop-up, with unknown skills labeled as not explored. Completion means answered, not mastered.
- `routing`: priority rules and a required fallback, each pointing at a declared Markdown file.

The stats calculation weights question contributions within each topic, then combines topic estimates for each axis. An axis remains unknown until all its topics have evidence and its minimum question count is reached. Unknown axes never satisfy numeric comparisons or weakest conditions. Missing evidence is not a zero.

Supported questions: `single`, `multiple`, `numeric`, `ordering`. Single uses an option index; multiple uses an exact set of option indices; ordering uses all indices in the correct sequence. Numeric answers are strings, including fractions, with optional absolute tolerance and simplest-form checks. There is no implicit partial credit. `level: "hots"` marks a reasoning question using any supported response type.

## Rules: AND, OR, and weakest areas

```json
{
  "id": "equivalence-support",
  "priority": 50,
  "when": {
    "all": [
      { "weakest": "equivalence" },
      { "any": [
        { "axis": "equivalence", "op": "<", "value": 50 },
        { "axis": "reasoning", "op": "<", "value": 60 }
      ] }
    ]
  },
  "file": "lessons/foundations.md",
  "reason": "Revisit equivalent fractions before applying them."
}
```

`all` means AND (`&&`); `any` means OR (`||`). They nest to a maximum depth of 16. Comparisons support `<`, `<=`, `>`, `>=`, `==`. Config is data; expressions are never evaluated as JavaScript. Highest priority wins; equal priorities retain config order. All tied weakest axes qualify, so priority/order resolves the tie. A required fallback handles incomplete topic evidence or unmatched conditions after chapter completion. Recommendations guide rather than lock navigation; lesson links remain available. A destination can itself contain questions and update the same chapter profile. Recommendations recalculate after every saved response; a card avoids linking back to the page already open.

All paths are relative `.md` paths inside the master folder. Unknown references, duplicate IDs, escaping paths/symlinks, malformed answers, unsupported conditions, missing destination files or lost markers fail the build. All pages are compiled before any output is written. Links are rewritten to relative `.html` destinations, including from nested folders.

## Persistence and limits

Responses save before feedback and stats update. Storage failure stays visible and does not advance evidence. Progress is stored locally under the chapter ID and revision; an existing local profile from an earlier build is still read, but the reader no longer asks students to manage profiles. Reloading or navigating preserves answers and topic stats. Invalid saved data is retained and further writes are blocked. Revision changes start a new history; no implicit migration is performed.

The example routes a learner who needs more practice with equal parts to a short review; other results lead to the next idea. More advanced content can be added as declared pages in the same folder.

The output works without network when opened as local files; it makes no runtime requests. For reliable shared storage across browsers, serve the output on one consistent local origin. Offline reopening of an HTTP URL after its server stops requires a service worker/installation flow; this build does not add one. Answer data is inspectable and local evidence is not secure exam evidence. Sync and teacher dashboards remain separate work.

## Verification

Run `npm test` and `npm run typecheck` after making changes.

## Reader-independent engine boundary

`student/learning/controller.ts` exposes saved evidence and results to the reader. Create it with the validated chapter config, a storage implementation and a student profile; `submit(questionId, response, hinted)` validates and saves an attempt before advancing state, while `results()` returns completion, axis values and labels, and the next route. The reader uses this controller, and `shared/learning/engine.ts` owns grading, stats and rule evaluation. Failed writes leave results unchanged. The skills dialog is available on follow-up lessons after chapter completion.

The [fractions fixture](../content/learning-fractions/chapter.config.json) also demonstrates per-topic practice destinations.
