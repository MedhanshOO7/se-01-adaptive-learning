# Quiz, evidence, and adaptation

How answering a question becomes a tamper-resistant record and drives prerequisite practice.
(This replaces the earlier standalone 7-type quiz engine, which is not used — quizzes are
authored with mr-md's quiz block and the evidence/adaptation layer is built on top.)

## Authoring

A quiz is an mr-md quiz file (`content/<chapter>/quiz/*.json`), referenced from the lesson
with `![caption](quiz/1.json)`. Each question is single-answer multiple choice:

```json
{
  "q": "Which fraction is equivalent to 1/2?",
  "options": ["2/4", "1/4", "2/3"],
  "answer": 0,
  "explanation": "Multiplying both parts of 1/2 by 2 gives 2/4.",
  "skill": "equivalence",
  "difficulty": "core"
}
```

`skill` and `difficulty` are our additions on top of mr-md's shape. `skill` must exist in the
chapter's `skills.json`; `shared/schema` validates this. `difficulty` is `intro | core |
stretch`.

## Capturing answers (no fork of mr-md)

mr-md's quiz client is one delegated `document` click listener over `.bk-opt` buttons inside
`.bk-question` (id `...-q<N>`) within `.bk-quiz` (which carries a base64 answer key in
`.bk-quiz-data`). The student runtime adds its **own** document listener alongside it
(`student/runtime/dom.ts`): on a click it maps the DOM question back to the authored question
(by document order), grades it, and appends an evidence event. Follow-up questions are rendered
in the same `.bk-*` markup, so mr-md styles them and our listener captures them too.

## The tamper-resistant store (`student/runtime/store.ts`)

Attempts are append-only and form an HMAC **hash chain** (each event's `hash` covers its
fields plus the previous event's `hash`); each record is encrypted at rest with AES-GCM
(Web Crypto). Editing, deleting, or reordering an event breaks the chain and is reported on the
next read. Browser storage is IndexedDB, with an in-memory fallback.

**Limit:** a local-only app has no server to hold the key, and the answer key is in the page.
This protects *record integrity* against casual tampering — it is **not** exam security.

An `EvidenceEvent` records: event id, chapter + revision, quiz id, question index, skill,
selected option, correct?, attempt number, whether it was the first (independent) attempt,
timestamp, and the hash-chain fields.

## Adaptation (`student/runtime/adaptation.ts`)

On a wrong answer the runtime walks the chapter's **skill graph** from the missed skill to its
prerequisites (nearest first) and serves a prerequisite question from the pool in `skills.json`
— instead of repeating the same question. If the student already showed that prerequisite, it
is skipped; if no prerequisite question remains, it falls back to a fresh question on the same
skill. Selection is transparent and rule-based, and carries a short reason shown to the student.

Example: missing *equivalent fractions* (prerequisites: *equal parts*, *multiplying both
terms*) prompts a question on one of those prerequisites first.
