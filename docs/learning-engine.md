# Chapter quiz and learning engine

This worktree supplies the chapter contract and the reader-independent quiz engine. The in-house renderer and UI are being developed in the separate worktree; connect them when those changes are merged.

The [fractions chapter](../content/learning-fractions/chapter.config.json) is an example master file. It defines chapter pages, quizzes, topics, six hexagon axes, evidence policy, completion and conditional routes. Markdown files and route destinations live in the same folder.

## Integration

- `shared/learning/types.ts` defines the versioned chapter, question, attempt and result types.
- `shared/learning/validate.ts` validates the master file and cross-references; `teacher/learning/load.ts` also verifies lesson files stay inside the chapter folder.
- `shared/learning/engine.ts` grades single choice, multiple choice, numeric/fraction and ordering responses, derives topic stats, evaluates completion, and chooses a destination using nested `all`/`any`, comparisons and `weakest` rules.
- `student/learning/controller.ts` provides the UI boundary. Construct `createLearningController(config, storage, profile)`, call `submit(questionId, response, hinted)`, and render `results()`. A result contains `completed`, six `axes` with labels, values and evidence counts, and `next` with a file and reason or `null`.

A `null` axis value means insufficient evidence, not zero. Save must succeed before a response affects stats or routing. State is local to a chapter ID, revision and profile. The engine accepts a browser-compatible storage object; it does not render or dictate a reader UI.

For lesson integration, the current reader worktree uses `data-learning-quiz`, `data-learning-stats`, and `data-learning-next` markers. The reader must use the controller instead of duplicating grading, stats or routing. This worktree does not contain the reader runtime or compiler integration; those need to be wired together during the merge. The current master format and core algorithms match the inspected reader worktree, but its UI still needs to be connected to this controller.

Run `npm test` and `npm run typecheck` for the engine tests. The example thresholds are configurable prototype rules, not validated measures of mastery.
