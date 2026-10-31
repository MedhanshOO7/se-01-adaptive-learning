import type { Attempt, AxisStat, ChapterConfig, Condition, Question, Response } from './types.ts';

export function parseNumeric(raw: string): number | null {
  const s = raw.trim();
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:\s*\/\s*[+-]?\d+)?$/.test(s)) return null;
  const [a, b = '1'] = s.split('/').map(x => x.trim());
  const value = Number(a) / Number(b);
  return Number.isFinite(value) ? value : null;
}
function gcd(a: number, b: number): number { return b ? gcd(b, a % b) : a; }
export function grade(q: Question, response: Response): boolean {
  if (q.type === 'numeric') {
    if (typeof response !== 'string') return false;
    const n = parseNumeric(response), expected = parseNumeric(String(q.answer));
    if (n === null || expected === null || Math.abs(n - expected) > (q.tolerance ?? 1e-9)) return false;
    if (q.simplestForm && response.includes('/')) {
      const [a, b] = response.split('/').map(Number);
      if (!Number.isInteger(a) || !Number.isInteger(b) || b <= 0 || gcd(Math.abs(a), b) !== 1) return false;
    }
    return true;
  }
  if (q.type === 'single') return typeof response === 'number' && response === q.answer;
  if (!Array.isArray(response) || !Array.isArray(q.answer) || new Set(response).size !== response.length) return false;
  const actual = q.type === 'multiple' ? [...response].sort((a,b) => a-b) : response;
  const expected = q.type === 'multiple' ? [...q.answer].sort((a,b) => a-b) : q.answer;
  return actual.length === expected.length && actual.every((v,i) => v === expected[i]);
}
export function selectedAttempts(config: ChapterConfig, attempts: Attempt[]): Map<string, Attempt> {
  const result = new Map<string, Attempt>();
  for (const attempt of attempts) {
    if (config.hexagon.evidence === 'latest' || !result.has(attempt.questionId)) result.set(attempt.questionId, attempt);
  }
  return result;
}
export function stats(config: ChapterConfig, attempts: Attempt[]): AxisStat[] {
  const selected = selectedAttempts(config, attempts);
  const questions = config.quizzes.flatMap(q => q.questions);
  return config.hexagon.axes.map(axis => {
    const evidence = questions.filter(q => q.topics.some(t => axis.topics.includes(t)) && selected.has(q.id));
    const topicValues = axis.topics.map(topic => {
      const items = evidence.filter(q => q.topics.includes(topic)).sort((a,b) => attempts.lastIndexOf(selected.get(a.id)!) - attempts.lastIndexOf(selected.get(b.id)!)).slice(-config.hexagon.evidenceWindow);
      if (!items.length) return null;
      const total = items.reduce((sum,q) => sum + q.weight, 0);
      return items.reduce((sum,q) => {
        const a = selected.get(q.id)!;
        return sum + q.weight * (grade(q,a.response) ? (a.hinted ? config.hexagon.hintedCredit : 1) : 0);
      },0) / total * 100;
    });
    const known = evidence.length >= axis.minEvidence && topicValues.every(v => v !== null);
    const values = topicValues as number[];
    const value = !known ? null : axis.aggregation === 'weakest' ? Math.min(...values) : values.reduce((a,b)=>a+b,0)/values.length;
    return { id: axis.id, label: axis.label, value, evidence: evidence.length };
  });
}
export function complete(config: ChapterConfig, attempts: Attempt[]): boolean {
  const answered = new Set(attempts.map(a => a.questionId));
  return config.completion.quizzes.every(id => config.quizzes.find(q => q.id === id)!.questions.every(q => answered.has(q.id)));
}
export function matches(condition: Condition, values: AxisStat[]): boolean {
  if ('all' in condition) return condition.all.every(c => matches(c, values));
  if ('any' in condition) return condition.any.some(c => matches(c, values));
  if ('weakest' in condition) {
    const known = values.filter(s => s.value !== null);
    return known.length > 0 && known.find(s => s.id === condition.weakest)?.value === Math.min(...known.map(s => s.value!));
  }
  const value = values.find(s => s.id === condition.axis)?.value;
  if (value === null || value === undefined) return false;
  switch (condition.op) {
    case '<': return value < condition.value;
    case '<=': return value <= condition.value;
    case '>': return value > condition.value;
    case '>=': return value >= condition.value;
    case '==': return value === condition.value;
  }
}
export function recommend(config: ChapterConfig, attempts: Attempt[]) {
  if (!complete(config, attempts)) return null;
  const values = stats(config, attempts);
  return [...config.routing.rules].sort((a,b) => b.priority-a.priority).find(rule => matches(rule.when,values)) ?? config.routing.fallback;
}
export function band(config: ChapterConfig, value: number | null): string {
  return value === null ? 'More evidence needed' : config.hexagon.bands.find(b => value < b.below)?.label ?? 'Secure';
}
