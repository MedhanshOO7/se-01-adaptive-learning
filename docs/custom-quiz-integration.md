# Custom quiz engine with mr-md

## Decision to consider

Keep mr-md for lesson rendering and make SE-01's quiz engine a separate student-side runtime. Place a stable marker in the lesson, then mount the engine there after the teacher build has rendered the Markdown. The engine owns question types, interaction, grading, attempts and evidence; the compiler only needs to preserve a mount point. This does not require mr-md's quiz JSON format or `.bk-quiz` DOM.

For example, a teacher could write:

```md
## Check your understanding

<div data-se01-quiz="equivalent-fractions"></div>
```

The chapter manifest would reference an SE-01 quiz file containing a matching stable ID. The teacher build would validate it, render the lesson with mr-md, bundle the quiz data and runtime into the output, and validate that each marker resolves exactly once. The student runtime would find the marker and render the appropriate question. A submitted response would produce a versioned attempt/evidence record and invoke adaptation, entirely offline.

The compiler now checks preservation of the marker shown above and rejects duplicate declared IDs. The quiz engine and its schema are not implemented. Quiz types, grading, assessment modes and evidence format still need to be designed.

## What was checked

On 31 October 2026, a local `bunx --no-install mr-md build` using cached mr-md `4.0.0-alpha.1` preserved the example empty `div` and its `data-se01-quiz` attribute in the output HTML. This proves the marker survives that build, not that an engine has been mounted or that every mr-md version and authoring context works. mr-md sanitizes lesson HTML, so do not depend on inline scripts or arbitrary custom elements surviving; inject trusted runtime code in the teacher build, as it already does. Pin and test the actual compiler version: the current `bunx mr-md` invocation does not pin one in this repository.

The raw mr-md development preview and `compile` command currently do not inject SE-01's runtime. A teacher preview for custom quizzes must go through an SE-01 build/preview path or gain equivalent runtime injection. Also verify actual offline output: mr-md output currently may reference external fonts and KaTeX styles.

## Work needed in this repository

1. Define a versioned, compiler-independent quiz format with stable quiz and question IDs, response types, scoring rules and skill metadata. Keep old mr-md quiz files supported during migration if existing lessons need them.
2. Update `shared/schema` and `teacher/build/load.ts` to validate and load that format. Reject duplicate, missing or unknown marker IDs and mismatches with the manifest. Use stable IDs rather than DOM order.
3. Implement the engine's renderer, response handling and grading. Keep its selectors and event handling separate from mr-md's `.bk-*` quiz handler.
4. Replace the current `selectedOption: number`-only evidence contract with versioned responses and results suitable for different question types. Update storage, replay, adaptation, teacher reporting and migration together; do not silently reinterpret old records.
5. Bundle the engine, quiz data and required assets into the teacher's output. Escape embedded data safely for a script context. Preserve and test offline operation. Define what data belongs on the device: answers included in an offline pack are inspectable, so this is not secure high-stakes assessment.
6. Add a build-backed teacher preview and integration tests using the real pinned mr-md version: marker placement, multiple quizzes, invalid references, grading, reload, adaptation, and no network access. Decide explicitly whether and how existing mr-md quizzes coexist.

The current coupling is visible in `student/runtime/dom.ts`, which maps `.bk-quiz` elements to metadata by document order, and `shared/schema/types.ts`, which represents answers as a single option index. Merely swapping the compiler or injecting a new UI does not remove that coupling.

## If we switch compilers later

`compiler/index.ts` already supports a trusted compiler adapter and `teacher/build/build.ts` accepts one. This is a selection mechanism, not full compatibility: an alternative must render the lesson features we use, preserve the marker, embed its own required assets, and work with the SE-01 build and runtime. In particular, simulations, math, callouts, media, styles, navigation, asset paths and watch/preview behavior need individual verification. Existing mr-md quiz blocks also need migration or an explicit compatibility adapter.

A compiler-independent marker plus quiz contract limits the quiz migration to verifying marker preservation and build integration. If a renderer removes the marker, its adapter can transform an SE-01 authoring directive into a safe placeholder or add it after rendering, with tests for location and duplicate IDs. A wholesale swap should follow a feature and offline parity spike; it is not necessary to enable custom questions.
