# Stack & decisions

Why the project is built the way it is. Each entry is a decision, what we chose, what we
chose it over, and why. The guiding constraint behind almost all of them: **the student
experience must work fully offline**, and the build should stay small but upscalable.

## Language & build

| Decision | Chosen | Over | Why |
| --- | --- | --- | --- |
| Language | **TypeScript** everywhere | Plain JS | The teacher↔student contract (`shared/schema`) is the heart of the system; types catch bundle/field mistakes before they reach a student. |
| Running TS | **Node 24 native type-stripping** (`node file.ts`) | `ts-node`, a `tsc` build step | Node 24 runs `.ts` directly, so the schema/teacher code needs no build. Simplest thing that works. |
| Browser bundler | **esbuild** (one call, IIFE) | webpack / rollup / vite | The student runtime is a handful of modules; esbuild bundles+minifies to one 6 KB script with zero config. The heavier bundlers earn nothing here. |
| Repo layout | **one repo, `teacher/` + `student/` + `shared/` folders** | separate repos; npm workspaces | Real boundaries (the two sides only share `shared/`) without monorepo tooling. Promotable to workspaces later without moving code. |

## Product shape

| Decision | Chosen | Over | Why |
| --- | --- | --- | --- |
| Where learning runs | **fully offline on-device**; online only for teacher authoring | an online/server-backed app | Core requirement: students may lack reliable internet. AI/content prep happens once, online; the student loop never needs the network. |
| Lesson renderer | **mr-md** | our own `markdown-studio`; a custom renderer | mr-md is a richer interactive-lesson framework (quizzes, simulations, LaTeX, callouts). Reuse over reinvention. We **retired markdown-studio**. Trade-offs: mr-md needs **Bun** to build, and is **PolyForm Noncommercial** licensed (fine for this educational use; revisit before commercial use). |
| Quiz authoring | **mr-md's own quiz block** + our evidence/skill layer on top | forking mr-md; the earlier 7-type SE-01 quiz engine (removed) | Keeps authoring simple (one format) and avoids maintaining a fork. We hook mr-md's quiz DOM from an injected script — no fork needed. Limit: single-answer MCQ only. |
| Adaptation engine | **transparent rule-based skill-graph prerequisite traversal, on-device** | an LLM at learn time | Must run offline, cost nothing per answer, and be explainable to a teacher. A wrong answer steps back along `prerequisiteIds` to a remediation question. |

## Data & storage

| Decision | Chosen | Over | Why |
| --- | --- | --- | --- |
| Attempt log | **event-sourced, append-only** | storing running totals | State is rebuilt by replaying events; supports integrity checks and gives adaptation real evidence (independent vs. retried attempts, per-skill). |
| Tamper resistance | **AES-GCM encryption + HMAC hash-chain** over events | trusting the client; a server-validated score | A local-only app has no server to hold the key, so this protects **record integrity** (edits/reordering are detected), not exam secrecy. Stated honestly as a limit. |
| Storage backend | **IndexedDB → localStorage → memory** (first that works) | IndexedDB only | Chrome blocks IndexedDB on `file://`; the localStorage fallback keeps progress when a student just saves and reopens the HTML. Memory is the last-resort (with a warning). |
| Serving locally | **a tiny http server (`npm run serve`)** | opening the file via `file://` | Over `http://localhost`, IndexedDB persists reliably; `file://` does not. |

## Teacher authoring (the one online part)

| Decision | Chosen | Over | Why |
| --- | --- | --- | --- |
| LLM access | **provider-agnostic OpenAI-compatible gateway** — OpenRouter (default) or OpenCode Zen | the Anthropic SDK (first version) | The user has a free gateway key; we switched to whatever key is present. Raw `fetch`, no SDK — simplest and works across providers. |
| Model choice | **auto-pick the best *free* model** (free + structured output + reasoning + largest context) | hard-coding one id | Free catalogs change often; a hard-coded id goes stale (it did). `npm run models` ranks the live list; generation auto-selects. |
| PDF handling | **extract to text (unpdf), then send text** | sending the PDF natively | Free models are text-only; extracting first works with any of them. (`.md`/`.txt` sources also accepted.) |
| Output safety | **validate every generation against `shared/schema` before building** | trusting the model output | Free models are weaker; a malformed bundle is rejected before it can reach a student. |
| Secrets | **`.env`, gitignored, loaded via `node --env-file-if-exists`** | a dotenv dependency; committing config | Node loads `.env` natively. The key once got committed and was scrubbed from history; `.env` is now ignored. |

## Still deferred (see `docs/later-addons.md`)

Teacher web UI, a sync backend + real multi-student dashboard, image/asset inlining for
fully-offline media, richer question types, and additional chapters/languages.
