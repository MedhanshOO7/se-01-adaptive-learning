// List the models your OpenCode Zen key can use, ranked best-first for authoring (free +
// structured output + reasoning + big output window), so you can pick one for OPENCODE_MODEL.
//   OPENCODE_API_KEY=... node teacher/author-chapter/list-models.ts
// (The models endpoint is currently public, so this also works without a key.)

import { listModels } from './opencode.ts';

const models = await listModels();
if (models.length === 0) {
  console.log('No models returned. Check OPENCODE_API_KEY and OPENCODE_BASE_URL.');
  process.exit(0);
}

const num = (v: unknown): number => (typeof v === 'number' ? v : 0);
const free = (m: any): boolean => num(m.cost?.text?.output?.price) === 0 && num(m.cost?.text?.input?.price) === 0;
const struct = (m: any): boolean => m.capabilities?.structured_output === true;
const reason = (m: any): boolean => m.capabilities?.reasoning?.supported === true;
const out = (m: any): number => num(m.limit?.output);
const ctx = (m: any): number => num(m.limit?.context);

// Rank: free first, then structured output, then reasoning, then larger context window.
const score = (m: any) => (free(m) ? 8 : 0) + (struct(m) ? 4 : 0) + (reason(m) ? 2 : 0);
const sorted = [...models].sort((a, b) => score(b) - score(a) || ctx(b) - ctx(a));

console.log(`${models.length} model(s). Ranked for authoring (🆓 free · ◆ structured output · ✦ reasoning):\n`);
for (const m of sorted) {
  const tags = [free(m) ? '🆓' : '  ', struct(m) ? '◆' : ' ', reason(m) ? '✦' : ' '].join(' ');
  console.log(`  ${tags}  ${String((m as any).id).padEnd(30)} ctx=${ctx(m) || '?'} out=${out(m) || '?'}`);
}
const best = sorted.find((m) => free(m) && struct(m) && reason(m)) ?? sorted[0];
console.log(`\nBest free pick:  export OPENCODE_MODEL=${(best as any).id}`);
