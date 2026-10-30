# SE-01 — Build plan

**Goal:** A teacher curates one chapter; a student reads it and practises **fully offline**,
and the app steps back to prerequisites when the student struggles. All personalization runs
on-device from a tamper-resistant local record.

**Architecture:** see [`README.md`](README.md). Teacher side (authoring) + student side
(offline runtime) + a shared bundle schema. Renderer is mr-md. Full design rationale is in
[`docs/`](docs/).

## Status

| Part | State |
| --- | --- |
| `shared/schema` — bundle contract (types + validators) | ✅ done, tested |
| `content/fractions` — sample chapter bundle | ✅ done, validates |
| `student/runtime` — tamper-evident store, grading, adaptation | ✅ done; pure logic tested |
| `student/runtime` — browser glue (IndexedDB, mr-md DOM hook) | ✅ written, typechecked |
| `teacher/build` — validate + bundle runtime + inject | ✅ done; injection tested |
| `teacher/build` — mr-md render step | ⏳ needs **Bun** installed to run end-to-end |
| `teacher/author-chapter` — PDF → bundle skill (stage 1) | ⬜ not started |
| Docs reconciled to this architecture | 🟡 README/PLAN/quiz doc updated; design docs kept as background |

## Now

1. **Install Bun** and run `npm run build` to render `content/fractions` end-to-end; confirm
   the standalone HTML opens offline, records answers, and serves a prerequisite question on a
   wrong *equivalent fractions* answer.
2. **Teacher authoring skill** (`teacher/author-chapter/`): take an uploaded PDF, extract it,
   and generate a `chapter.md` + `quiz/*.json` + `skills.json` that pass `npm run validate`.

## Next

- A second chapter to exercise the skill graph more deeply; translations (Hindi, Punjabi).
- A simple teacher review step before publishing a bundle.

## Later (upscale path)

- Split `shared` / `teacher` / `student` into workspaces.
- Add an optional sync backend so progress can reach a teacher dashboard when online.
