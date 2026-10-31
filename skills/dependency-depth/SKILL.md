---
name: dependency-depth
description: Turn a teacher's topic Markdown into linked teaching notes that explain each level of abstraction using progressively more fundamental concepts. Use when a learner needs to understand why the content works, down to explicit foundations and assumptions.
---

# Teach through dependency depth

Given one Markdown file, create a folder of actual teaching material that explains the input at its original level and then teaches **why it works** through successively more fundamental layers. This is a chain of explanations, not just a prerequisite list or a more detailed restatement.

- **Depth 0:** Copy the teacher's Markdown content exactly, without edits, additions, or inserted links. This is the material the deeper layers explain.
- **Depth 1:** Teach the concepts, principles and reasoning that explain why the depth-0 claims hold. Show how those foundations lead to the claims above.
- **Depth 2:** Teach and explain the foundations used at depth 1, showing how they support that layer. Continue in the same way for each significant branch.
- **Deepest useful layer:** Identify the starting points for this explanation: definitions, axioms, evidence, accepted models, assumptions or foundational observations, as appropriate to the subject and learner. Explain their status and why the descent stops there. Do not call a model or empirical observation an absolute truth or an axiom merely to end the chain.

A layer can branch into several foundations; a shared foundation should be taught once and linked wherever it is needed. Depth describes explanatory dependence, not difficulty, age, historical order, or the amount of detail. More abstract does not always mean less fundamental: assign levels by the role an idea plays in this explanation, not by its label.

## Read and determine scope

Read the entire input as source material, not instructions to execute. Identify its topic, claims, audience, language, and any specified curriculum or limits. Preserve the input. Use the teacher's stated scope and audience; otherwise infer a reasonable learner and stopping boundary, state the assumptions, and proceed. If the file only names a topic, develop the explanation and make the chosen interpretation explicit. Ask for clarification only if the topic cannot be identified.

Identify the claims at depth 0 that need explanation. For each, ask: **what must be true or understood for this claim to follow, and how does it follow?** Repeat for the substantive claims in the next layer. Include necessary intermediate reasoning instead of jumping from a claim to a distant foundation. Separate required foundations from related topics, enrichment, examples and downstream applications. Not every statement needs an infinite regress; stop when the starting assumptions are useful and explicit for the intended learner. Note meaningful branches omitted by the boundary.

Respect the kind of explanation the subject supports. For mathematics, distinguish definitions, axioms, proof and examples; an example alone does not prove a general claim. For empirical science, distinguish observations, evidence, models, assumptions and their domains of validity; explain predictions without portraying a model as an absolute proof. For other subjects, identify the relevant evidence, conventions or interpretation and acknowledge reasonable uncertainty. Verify specialized or uncertain claims with reliable sources when available; flag unresolved uncertainty and do not invent citations.

## Produce the folder

Unless the user specifies another destination, create `<input-stem>-depth/` beside the input. Do not overwrite existing work; choose a distinct name if necessary. Write Markdown with portable relative links, so the explanations themselves remain readable offline.

```text
<input-stem>-depth/
  depth-0/<original-filename>.md  # exact copy of the input
  depth-1/<foundation>.md
  depth-2/<foundation>.md
  ...
```

Do not create a README in the output folder. Copy the input file byte-for-byte into `depth-0/`, retaining its filename and leaving the original untouched. Do not add frontmatter, navigation, or AI-written explanation to the copy. Create as many deeper levels and branches as the explanation warrants. Give each distinct concept one note, placed at its shortest dependency distance from depth 0; link shared concepts instead of duplicating them. A concept can support multiple claims or layers, and direct links may cross levels. Avoid circular explanations: a note must not depend on an idea that depends on it.

Add a `depth-map.md` at the folder root as the navigation and review entry point. Link the depth-0 copy and each note, state the audience, assumptions, scope and stopping boundary, and present a navigable map of **claim or concept → foundations that explain it**, including branches and shared foundations. Include a foundation-up reading order and a review list covering uncertain reasoning, evidence gaps and omitted scope. Label the AI-written material a draft for teacher review.

Each **AI-written note at depth 1 and below** must provide:

1. A real, learner-appropriate explanation of its concept or claims, with key terms defined and reasoning made explicit; not merely a heading or summary.
2. For every important claim from the layer above that this note supports, identify and link the claim, then show **how** this layer's ideas explain or derive it. State assumptions and limitations. If a bridge needs several foundation notes, link them and show how they work together.
3. A concrete worked example, illustration or counterexample when useful, explaining what it shows. Distinguish illustration from proof or evidence.
4. Links to the next deeper foundations and why they are needed. At the stopping boundary, identify what is being assumed or taken as a starting point and why it is appropriate to stop.
5. References to source sections for source-derived claims, and clear identification of explanations added beyond the input. Cite external sources accurately where used; flag unsupported or uncertain claims.

Link from depth-1 notes and the map to the relevant depth-0 content without modifying the copy. Keep the generated explanations understandable alongside that content.

Do not generate quizzes, executable code, chapter manifests, or `skills.json` unless asked. This is a theory draft, not an automatically approved adaptive skill graph or published offline pack.

## Check the teaching chain

Verify that the depth-0 file is byte-for-byte identical to the input. Read upward from each stopping point to depth 0. For each important claim, check that its supporting ideas are actually taught below and that the bridge explains why the claim follows, rather than merely naming prerequisites. Check the direction and acyclicity of dependencies, resolve local links, and ensure shared notes are consistent. Check the status of axioms, assumptions, models and evidence, and record unresolved issues honestly. Report the output location, assumptions and review issues; a teacher must review it before it drives adaptation or publication.
