// Browser glue: observe mr-md's quizzes, record evidence, and inject prerequisite follow-up
// questions on a wrong answer — all without forking mr-md.
//
// mr-md's quiz client (src/client/quiz.ts) is a single delegated `document` click listener on
// `.bk-opt` buttons inside `.bk-question` (id `...-q<N>`) within `.bk-quiz` (which holds a
// base64 `.bk-quiz-data` answer key). Because the listener is delegated and clicks bubble, we
// add our OWN document listener alongside it, read the same DOM, and also render follow-ups in
// the identical `.bk-*` markup so mr-md styles them for free.

import type { Question, QuizFile, SkillGraph } from '../../shared/schema/index.ts';
import { chooseRemediation } from './adaptation.ts';
import type { EventStore } from './store.ts';

export interface RuntimeConfig {
  chapterId: string;
  chapterRevision: string;
  quizzes: QuizFile[];
  skillGraph: SkillGraph;
}

const b64 = (s: string): string => btoa(s);

/** Build a follow-up question as `.bk-quiz` markup mr-md's handler understands. */
function buildFollowup(question: Question, reason: string, uid: string): HTMLElement {
  const quiz = document.createElement('div');
  quiz.className = 'bk-quiz';
  quiz.setAttribute('data-se01-prereq', '');
  quiz.dataset.skill = question.skill ?? '';
  quiz.dataset.answer = String(question.answer);

  const data = document.createElement('div');
  data.className = 'bk-quiz-data';
  data.hidden = true;
  data.textContent = b64(JSON.stringify([question.answer]));
  quiz.append(data);

  const q = document.createElement('div');
  q.className = 'bk-question';
  q.id = `${uid}-q0`;

  const why = document.createElement('p');
  why.className = 'se01-remediation-reason';
  why.textContent = reason;
  const prompt = document.createElement('p');
  prompt.className = 'se01-remediation-prompt';
  prompt.textContent = question.q;
  q.append(why, prompt);

  question.options.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.className = 'bk-opt';
    btn.dataset.optIdx = String(i);
    btn.textContent = label;
    q.append(btn);
  });

  const exp = document.createElement('div');
  exp.className = 'se01-explanation';
  exp.id = `${q.id}-exp`;
  exp.hidden = true;
  if (question.explanation) exp.textContent = question.explanation;
  q.append(exp);

  quiz.append(q);
  return quiz;
}

/** Wire the runtime to the page. Returns a teardown function (mainly for tests/hot-reload). */
export function wireRuntime(config: RuntimeConfig, store: EventStore): () => void {
  const recorded = new Set<string>(); // question element ids already written to the store
  const shownPrompts = new Set<string>(); // follow-up prompts already shown (avoid repeats)
  const masteredSkills = new Set<string>();
  let followupCount = 0;

  const originals = (): HTMLElement[] =>
    Array.from(document.querySelectorAll<HTMLElement>('.bk-quiz:not([data-se01-prereq])'));

  async function onAnswer(questionEl: HTMLElement, selectedOption: number) {
    if (recorded.has(questionEl.id)) return;
    recorded.add(questionEl.id);

    const prereqQuiz = questionEl.closest<HTMLElement>('.bk-quiz[data-se01-prereq]');
    if (prereqQuiz) {
      // A follow-up question we injected: metadata is on the element.
      const skillId = prereqQuiz.dataset.skill || null;
      const answer = Number(prereqQuiz.dataset.answer);
      const correct = selectedOption === answer;
      await store.append({ quizId: 'prereq', questionIndex: followupCount, skillId, selectedOption, correct });
      if (correct && skillId) masteredSkills.add(skillId);
      else if (!correct && skillId) remediate(skillId, prereqQuiz);
      return;
    }

    // An original mr-md quiz question: map by document order to the injected quizzes.
    const quizEl = questionEl.closest<HTMLElement>('.bk-quiz');
    if (!quizEl) return;
    const blockIndex = originals().indexOf(quizEl);
    const questionIndex = Array.from(quizEl.querySelectorAll('.bk-question')).indexOf(questionEl);
    const meta = config.quizzes[blockIndex]?.questions[questionIndex];
    if (!meta) return;

    const correct = selectedOption === meta.answer;
    await store.append({
      quizId: config.quizzes[blockIndex].id,
      questionIndex,
      skillId: meta.skill ?? null,
      selectedOption,
      correct,
    });
    if (!correct && meta.skill) remediate(meta.skill, quizEl);
  }

  function remediate(skillId: string, anchor: HTMLElement) {
    const remediation = chooseRemediation(config.skillGraph, skillId, { shownPrompts, masteredSkills });
    if (!remediation) return;
    shownPrompts.add(remediation.question.q);
    const uid = `se01-prereq-${followupCount++}`;
    const node = buildFollowup(remediation.question, remediation.reason, uid);
    // Insert after the quiz block that was just answered so the step-back reads in order.
    anchor.insertAdjacentElement('afterend', node);
  }

  const handler = (e: Event) => {
    const btn = (e.target as HTMLElement).closest?.('.bk-opt') as HTMLButtonElement | null;
    if (!btn || btn.disabled) return;
    const questionEl = btn.closest<HTMLElement>('.bk-question');
    if (!questionEl) return;
    void onAnswer(questionEl, Number(btn.dataset.optIdx));
  };

  document.addEventListener('click', handler);
  return () => document.removeEventListener('click', handler);
}
