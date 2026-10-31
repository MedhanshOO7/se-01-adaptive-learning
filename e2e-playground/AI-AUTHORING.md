# AI-assisted depth questions

Use this prompt with an AI author who can edit the chapter file. Preparation is online; student use is offline.

> Read `exampleContent/journey-inside-the-atom/chapter-content.md`, `depth-map.md` and `assessment-activities.md`, then edit `e2e-playground/Journey-Inside-the-Atom.md`. Keep the lesson grounded in the supplied source. Add original questions to the relevant depth quizzes in the `SE01_CONFIG` block. Keep the chapter check separate: its latest answers and `chapter-score` topic choose the student's next depth only after the check is complete and **Complete chapter** is pressed. Depth questions must not use the `chapter-score` topic. Preserve existing IDs and schema. Each question needs a unique ID, supported type, valid answer, explanation, weight and relevant topic ID; add useful hints where appropriate. Check scientific accuracy, ambiguity and keys, and flag anything requiring teacher review. Run `npm run build:e2e`, `npm run typecheck`, and `npm test`. Report changes and review needs.

The comment contains the config consumed by the build. See [the engine contract](../docs/learning-engine.md). This prompt does not approve content or calibrate questions.
