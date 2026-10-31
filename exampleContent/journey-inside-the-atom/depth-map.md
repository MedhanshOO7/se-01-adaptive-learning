# Proposed concept and depth map

This is an author-created teaching map based on [chapter 8](https://ncert.nic.in/textbook/pdf/iesc108.pdf), not an official CBSE depth map. IDs are stable suggestions for future authoring; this Markdown is not `skills.json` and is not executable. An arrow in the table means “understand these first”, not that a learner must complete a fixed sequence. Some skills can be taught in parallel. Evidence is illustrative; a single answer is insufficient to establish mastery.

## Depth levels

- **D0 — readiness:** prerequisite knowledge and language, which may come from earlier lessons.
- **D1 — recognise:** identify, name or recall with a familiar representation.
- **D2 — explain:** relate concepts, interpret evidence and describe why.
- **D3 — apply:** solve a new structured problem or switch representations.
- **D4 — transfer and critique:** compare models, justify conclusions, interpret limitations or investigate an unfamiliar case. D4 is proposed enrichment, not a claim that all such work is required in examinations.

These are dimensions of understanding, not a ranking of children. Each concept can be assessed at several depths. A question's format alone does not determine depth.

## Nodes and dependencies

| ID | Concept / observable learner action | Prerequisite IDs | Chapter locator | Evidence of deeper understanding |
|---|---|---|---|---|
| R1 | Matter, elements and atoms: distinguish material, element and particle | — | Introduction; prior learning | D2 explain that an element contains one type of atom |
| R2 | Charge: distinguish positive, negative, neutral; unlike charges attract | — | 8.2 | D2 predict net charge from equal opposite counts |
| R3 | Number skills: integer addition and subtraction, ratios, percentages | — | prerequisite | D3 calculate and explain a weighted average |
| R4 | Scientific models: distinguish observation, inference and model | — | 8.1–8.2 | D4 explain why new evidence changes a model |
| A1 | Historical ideas: compare ancient proposals and Dalton's evidence-based theory | R1, R4 | 8.1 | D2 contrast speculation with experimental theory |
| A2 | Electron evidence: infer universal negative particles from cathode rays | R2, R4 | 8.2 | D2 explain why changing tube materials matters |
| A3 | Thomson model: represent charge and account for neutrality | A2, R2 | 8.2.1 | D2 identify its inability to explain large scattering |
| A4 | Scattering: map each observation to a justified inference | A3, R2, R4 | 8.2.2 | D3 infer empty space and concentrated positive nucleus |
| A5 | Rutherford model and stability limitation | A4 | 8.2.2 | D2 connect classical radiative loss to instability |
| A6 | Bohr model and allowed energy transitions | A5 | 8.2.3 | D3 predict absorption/emission when a level changes |
| A7 | Modern model and limits of orbit pictures | A6, R4 | end of 8.9 | D4 distinguish an energy level from a precise trajectory |
| P1 | Particle properties: proton, neutron, electron; location, charge, mass | A4, R2 | 8.2–8.3 | D2 explain nucleus charge and most of mass |
| P2 | Neutral atoms: proton/electron equality and charge balance | P1, R3 | 8.2 | D3 calculate missing count, explicitly assuming neutral |
| P3 | Symbols: recognise and write case-sensitive element notation | R1 | 8.4 | D3 distinguish Co and CO |
| P4 | Atomic number Z: proton count and element identity | P1, P3 | 8.5 | D3 identify element after neutron count changes |
| P5 | Mass number A and nuclide notation: derive p, n, e | P2, P4, R3 | 8.6 | D3 translate A/Z notation into counts and back |
| E1 | Shells and configuration for first 18 elements | A6, P2, R3 | 8.7 | D3 derive 2,8,7 from Z=17 for neutral Cl |
| E2 | Valence shell and valence electrons | E1 | 8.8 | D3 identify outer-shell count from configuration |
| E3 | Valency and stable configurations, including sharing | E2, R1 | 8.8 | D3 contrast Na, O, C and Ne without overgeneralising |
| I1 | Isotopes: same Z, different neutron count and A | P5 | 8.9.1 | D3 construct and compare two isotopes |
| I2 | Isobar: same A, different Z | P5 | 8.9.2 | D3 discriminate isotopes and isobars in mixed pairs |
| I3 | Average atomic mass: abundance-weighted isotope masses | I1, R3 | 8.9.1 | D3 compute and interpret a weighted mean; D4 check it lies within isotope masses |
| I4 | Applications and limits of isotope use | I1, R4 | 8.9.1 | D4 connect isotope properties to an appropriate application |

## Example paths through the graph

- Evidence: R4 → A2 → A3 → A4 → A5 → A6 → A7.
- Composition: P1 → P2 → P4 → P5 → I1 → I3. P4 also depends on P3; P5 needs arithmetic.
- Combining: P2 + A6 → E1 → E2 → E3. This is a chapter-level approximation, not an explanation of all bonding.
- Comparison: P5 → I1 and I2; practise mixed pairs after each concept is understood.

## Error patterns and remediation hypotheses

| Observable response | Possible underlying issue | Useful next step; not a diagnosis |
|---|---|---|
| Says all alpha particles bounced | observation versus inference confusion | Sort the three outcomes by frequency, then infer structure (A4). |
| Says gold foil proved neutrons | confuses separate discoveries | Compare scattering observations with neutron discovery timeline (A4, P1). |
| Calculates neutron number as A + Z | confuses part and whole | Build a nucleus from counts, then rearrange A = p + n (P5). |
| Says an ion must have equal protons and electrons | treats neutrality as universal | Compare neutral Na and Na⁺; identify what changes (P2). |
| Says Cl has 17 valence electrons | confuses total with outer shell | Draw 2,8,7 and point to the last shell (E1, E2). |
| Says M always fills to 18 before N | overgeneralises shell capacity | Contrast capacity with first-18 distributions; avoid a universal filling rule (E1). |
| Calls ³⁵Cl and ³⁷Cl isobars | mixes up A and Z | Make a two-column comparison of p and n (I1, I2). |
| Gives 36 u for 75:25 chlorine | averages without weighting | Model 3 of one isotope and 1 of the other (I3). |
| Claims each chlorine atom has mass number 35.5 | confuses a population average with an individual | Compare four labelled atoms with their mean (I3). |
| Claims Bohr orbits are photos of electron paths | model treated as literal | Compare a schematic shell with a probability cloud (A7). |

## Future content needs

For each node, prepare multiple independently worded questions, a short explanation, at least one targeted hint, a worked example, and remediation for each prerequisite. Include diagram descriptions and accessible text alternatives. A teacher should review scientific accuracy, grade appropriateness, dependencies and rights; pilot items with learners before treating wrong answers as diagnostic. For offline use, package the approved content, assets, questions, keys for practice, skill links and selection rules locally. This research does not provide a calibrated question bank, validated progression or a secure assessment.
