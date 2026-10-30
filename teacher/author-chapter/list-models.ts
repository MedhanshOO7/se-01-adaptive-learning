// List the gateway's models, ranked best-first for authoring, so you can pick OPENROUTER_MODEL.
//   node --env-file-if-exists=.env teacher/author-chapter/list-models.ts   (npm run models)
// Model endpoints are public, so this works even without a key.

import { listModels, rank, bestFree, provider } from './provider.ts';

const models = await listModels();
if (models.length === 0) {
  console.log('No models returned. Check your key / network.');
  process.exit(0);
}

const sorted = rank(models);
const shown = sorted.filter((m) => m.free).concat(sorted.filter((m) => !m.free)).slice(0, 40);
console.log(`${models.length} model(s) via ${provider().name}. Top (🆓 free · ◆ structured · ✦ reasoning):\n`);
for (const m of shown) {
  const tags = [m.free ? '🆓' : '  ', m.structured ? '◆' : ' ', m.reasoning ? '✦' : ' '].join(' ');
  console.log(`  ${tags}  ${m.id.padEnd(40)} ctx=${m.context || '?'} out=${m.output || '?'}`);
}
const best = bestFree(models);
if (best) console.log(`\nBest free pick:  export OPENROUTER_MODEL=${best.id}`);
