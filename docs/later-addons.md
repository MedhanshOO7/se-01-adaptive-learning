# Later add-ons

Deferred features, parked deliberately so the current build stays small. Pull one into
`PLAN.md` when it's time to build it.

## Teacher web UI

A teacher-facing page: upload a chapter PDF, watch the bundle generate, **review** the
proposed skill graph + questions + answer keys, edit/regenerate items, then publish. Today
the teacher side is the `author-chapter` skill + the `npm run author` pipeline (PDF →
validated bundle → built HTML) with no GUI — this is the GUI on top of that same pipeline and
schema. Slots in as `teacher/app/`. Bigger scope; needs a review/edit UX and a publish step.

## Sync backend + teacher dashboard

Optional online sync so a student's (currently local, offline) attempt log can reach a teacher
dashboard showing per-skill gaps. The store is already event-sourced and integrity-checked;
this adds an outbox + a server that dedups by `eventId` and validates. Turns the local-only
app into the full teacher↔student loop from the design docs.

## More content & languages

- A second chapter to exercise the skill graph more deeply.
- Hindi and Punjabi variants (keep skill `id`s stable across languages so progress survives a
  language switch).

## Richer question types

mr-md's quiz block is single-answer MCQ only. If we need numeric / fraction-equivalence /
multi-select inputs, either extend the runtime's quiz renderer or revisit a dedicated quiz
engine (the earlier 7-type engine was removed; see `docs/quiz-and-evidence.md`).
