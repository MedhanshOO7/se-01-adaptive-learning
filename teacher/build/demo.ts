// Generate a self-contained demo page for a chapter bundle, WITHOUT mr-md.
//
// It wraps the real student runtime (the exact esbuild bundle: grading, encrypted store,
// adaptation) around a faithful copy of mr-md's quiz DOM + a small reimplementation of
// mr-md's quiz click behaviour. This lets you see our side working end-to-end before Bun is
// available for the real mr-md render. It is a DEMO, not the production artifact.
//
//   node teacher/build/demo.ts [bundleDir] [outFile]   (defaults: content/fractions, dist/demo.html)

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadBundle } from './load.ts';
import { bundleRuntime } from './bundle-runtime.ts';
import { buildConfig } from './build.ts';
import { validateBundle, type QuizFile } from '../../shared/schema/index.ts';

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64');

/** Render one quiz in the same `.bk-*` markup mr-md emits, so our runtime maps to it 1:1. */
function renderQuiz(quiz: QuizFile, blockIdx: number): string {
  const data = b64(JSON.stringify(quiz.questions.map((q) => q.answer)));
  const questions = quiz.questions
    .map(
      (q, qi) => `
    <div class="bk-question" id="quiz-${blockIdx}-q${qi}">
      <p class="bk-prompt">${esc(q.q)}</p>
      <div class="bk-opts">
        ${q.options.map((o, oi) => `<button class="bk-opt" data-opt-idx="${oi}">${esc(o)}</button>`).join('\n        ')}
      </div>
      <div class="bk-exp" id="quiz-${blockIdx}-q${qi}-exp" hidden>${esc(q.explanation ?? '')}</div>
    </div>`,
    )
    .join('');
  return `<div class="bk-quiz"><div class="bk-quiz-data" hidden>${data}</div>${questions}</div>`;
}

// A trimmed copy of mr-md's src/client/quiz.ts click behaviour, enough for the demo: on a
// click it marks correct/wrong, disables the options, and reveals the explanation. Our runtime
// adds its OWN listener alongside this, exactly as it will against real mr-md output.
const MRMD_SHIM = `
function bkWireQuizzes(){document.addEventListener("click",function(e){
  var btn=e.target.closest&&e.target.closest(".bk-opt");if(!btn||btn.disabled)return;
  var q=btn.closest(".bk-question");if(!q)return;
  var quiz=q.closest(".bk-quiz");var dataEl=quiz?quiz.querySelector(".bk-quiz-data"):null;
  var answers=[];try{answers=JSON.parse(atob((dataEl&&dataEl.textContent)||"[]"))}catch(_){}
  var m=q.id.match(/-q(\\d+)$/);var qi=m?parseInt(m[1],10):0;var sel=parseInt(btn.dataset.optIdx,10);
  var correct=answers[qi]===sel;
  q.querySelectorAll(".bk-opt").forEach(function(b){b.disabled=true;var oi=parseInt(b.dataset.optIdx,10);
    if(answers[qi]===oi){b.classList.add("correct")}else if(b===btn){b.classList.add("wrong")}else{b.classList.add("disabled")}});
  var exp=document.getElementById(q.id+"-exp");if(exp)exp.hidden=false;
});}bkWireQuizzes();`;

const CSS = `
:root{color-scheme:light dark;--bg:#fbfaf7;--fg:#1c1b18;--muted:#6b6a64;--line:#e4e1d8;--accent:#3a6b4f;--card:#fff;--ok:#2e7d46;--bad:#b23a48}
@media(prefers-color-scheme:dark){:root{--bg:#15140f;--fg:#ecebe4;--muted:#a3a299;--line:#2d2b24;--card:#201e18;--accent:#7fc29b;--ok:#6fbf86;--bad:#e08391}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.65 ui-serif,Georgia,serif;padding:0 16px}
main{max-width:720px;margin:0 auto;padding:40px 0 80px}h1{font-size:2rem;line-height:1.2}h2{margin-top:2em;font-size:1.3rem}
code{font-family:ui-monospace,monospace;background:color-mix(in srgb,var(--line) 60%,transparent);padding:.05em .35em;border-radius:4px;font-size:.92em}
.callout{border-left:3px solid var(--accent);background:color-mix(in srgb,var(--accent) 10%,transparent);padding:.1em 16px;border-radius:0 8px 8px 0;margin:1.5em 0}
.callout .tag{font:600 .7rem/1 ui-sans-serif,system-ui;text-transform:uppercase;letter-spacing:.08em;color:var(--accent)}
.bk-quiz{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:20px 22px;margin:1.6em 0}
.bk-quiz[data-se01-prereq]{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 18%,transparent)}
.bk-prompt{font-weight:600;margin:.2em 0 .9em}.se01-remediation-reason{color:var(--accent);font:600 .9rem/1.4 ui-sans-serif,system-ui;margin:.1em 0 .5em}
.se01-remediation-prompt{font-weight:600;margin:.2em 0 .9em}
.bk-opts{display:flex;flex-direction:column;gap:8px}
.bk-opt{font:inherit;text-align:left;padding:10px 14px;border:1px solid var(--line);border-radius:9px;background:transparent;color:inherit;cursor:pointer}
.bk-opt:hover:not(:disabled){border-color:var(--accent)}.bk-opt:disabled{cursor:default}
.bk-opt.correct{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 16%,transparent);font-weight:600}
.bk-opt.wrong{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 14%,transparent)}
.bk-opt.disabled{opacity:.5}
.bk-exp,.se01-explanation{margin-top:.9em;padding:.1em 14px;border-left:2px solid var(--line);color:var(--muted);font-size:.95rem}
.panel{position:sticky;bottom:0;margin-top:40px;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:14px 16px;font:13px/1.5 ui-sans-serif,system-ui}
.panel button{font:inherit;margin-right:8px;padding:6px 12px;border:1px solid var(--line);border-radius:8px;background:transparent;color:inherit;cursor:pointer}
.panel .status{margin-left:6px}.ok{color:var(--ok);font-weight:600}.bad{color:var(--bad);font-weight:600}
#record{margin-top:10px;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;color:var(--muted)}
.se01-tag{display:inline-block;font:600 .62rem/1 ui-sans-serif,system-ui;text-transform:uppercase;letter-spacing:.09em;color:var(--card);background:var(--accent);padding:4px 9px;border-radius:999px;margin-bottom:10px}
.model{display:grid;gap:7px;margin:12px 0}
.model .row{display:flex;align-items:center;gap:9px}
.model .dot{width:9px;height:9px;border-radius:50%;flex:none}
.dot.solid{background:var(--ok)}.dot.needs-work{background:var(--bad)}.dot.unseen{background:var(--line)}
.model .lbl{flex:1}.model .st{color:var(--muted);font-size:12px}
`;

const LESSON = `
<h1>Equivalent fractions</h1>
<p>Two fractions are <b>equivalent</b> when they describe the same amount, even though they are
written with different numbers. For example, <code>1/2</code> and <code>2/4</code> look different
but cover exactly the same part of a whole.</p>
<h2>Why they are equal</h2>
<p>A fraction splits a whole into <b>equal parts</b>. If you multiply the numerator and the
denominator by the same number, you are just cutting each part into smaller equal pieces — the
amount does not change.</p>
<div class="callout"><div class="tag">Tip</div><p>Multiplying <code>1/2</code> by <code>2/2</code>
gives <code>2/4</code>. You multiplied by 1 in disguise, so the value stays the same.</p></div>
<h2>Your turn</h2>
<p>Answer below. Get one wrong on purpose to see the app step back to a prerequisite.</p>
`;

async function main() {
  const bundleDir = resolve(process.argv[2] ?? 'content/fractions');
  const outFile = resolve(process.argv[3] ?? 'dist/demo.html');

  const bundle = await loadBundle(bundleDir);
  const issues = validateBundle(bundle);
  if (issues.length) throw new Error('Bundle invalid:\n' + issues.map((i) => `  ${i.path}: ${i.message}`).join('\n'));

  const runtimeJs = await bundleRuntime('SE01'); // expose SE01.bootstrap for the demo panel
  const config = buildConfig(bundle, 'demo-secret');
  const quizHtml = bundle.quizzes.map((q, i) => renderQuiz(q, i)).join('\n');

  const html = `<!doctype html>
<html lang="${esc(bundle.manifest.language)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(bundle.manifest.title)} — demo</title><style>${CSS}</style></head>
<body><main>
${LESSON}
${quizHtml}
<div class="panel">
  <strong>What the app has learned about you</strong>
  <span class="status" id="integrity"></span>
  <div class="model" id="model"></div>
  <button id="show">Show raw record</button>
  <button id="tamper">Simulate tampering</button>
  <button id="reset">Reset</button>
  <div id="record"></div>
</div>
</main>
<script>${MRMD_SHIM}</script>
<script>${runtimeJs}</script>
<script>
const CONFIG=${JSON.stringify(config)};
let store;
SE01.bootstrap(CONFIG).then(function(s){store=s;renderModel();});
async function refresh(){
  const v=await store.verify();
  document.getElementById('integrity').innerHTML=v.ok?'<span class="ok">✓ record intact</span>':'<span class="bad">✗ record tampered</span>';
}
async function renderModel(){
  if(!store)return;
  let events=[];try{events=await store.list();}catch(e){}
  const rows=SE01.summariseSkills(CONFIG.skillGraph,events);
  document.getElementById('model').innerHTML=rows.map(function(r){
    const word=r.status==='solid'?'solid':r.status==='needs-work'?'needs practice':'not seen yet';
    return '<div class="row"><span class="dot '+r.status+'"></span><span class="lbl">'+r.label+'</span><span class="st">'+word+' · '+r.attempts+' tried</span></div>';
  }).join('');
  refresh();
}
// Refresh the learner model shortly after any answer (ours or a follow-up).
document.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.bk-opt'))setTimeout(renderModel,90);});
document.getElementById('show').onclick=async function(){
  try{const ev=await store.list();
    document.getElementById('record').textContent=ev.length?ev.map(function(e){
      return (e.correct?'✓':'✗')+' '+e.quizId+' q'+e.questionIndex+' skill='+e.skillId+' (attempt '+e.attemptNumber+')';}).join('\\n'):'(no answers yet)';
  }catch(err){document.getElementById('record').textContent='⚠ '+err.message;}
  refresh();
};
document.getElementById('tamper').onclick=async function(){
  // Reach into IndexedDB and corrupt a stored record to show the chain catches it.
  const req=indexedDB.open('se01:'+CONFIG.chapterId,1);
  req.onsuccess=function(){const db=req.result;const tx=db.transaction('events','readwrite');const os=tx.objectStore('events');
    os.getAllKeys().onsuccess=function(ev){const keys=ev.target.result;if(!keys.length){alert('Answer a question first, then tamper.');return;}
      os.put('AAAA:BBBB',keys[0]).onsuccess=function(){document.getElementById('record').textContent='(edited the first stored record directly)';refresh();};};};
};
document.getElementById('reset').onclick=function(){indexedDB.deleteDatabase('se01:'+CONFIG.chapterId);location.reload();};
</script>
</body></html>`;

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  console.log(`✓ demo written → ${outFile}  (${(html.length / 1024).toFixed(1)} KB, self-contained)`);
}

main();
