// Generate a self-contained demo page for a chapter bundle, WITHOUT mr-md.
//
// It wraps the real student runtime (the exact esbuild bundle: grading, encrypted store,
// adaptation) around a faithful copy of mr-md's quiz DOM + a small reimplementation of
// mr-md's quiz click behaviour. This lets you see our side working end-to-end before Bun is
// available for the real mr-md render. It is a DEMO, not the production artifact.
//
//   node teacher/build/demo.ts [bundleDir] [outFile]   (defaults: content/fractions, dist/demo.html)

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { loadBundle } from './load.ts';
import { bundleRuntime } from './bundle-runtime.ts';
import { buildConfig } from './build.ts';
import { validateBundle, type QuizFile } from '../../shared/schema/index.ts';
import { THEME_CSS, GRAPH_JS } from './theme.ts';

const esc = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const b64 = (s: string): string => Buffer.from(s, 'utf8').toString('base64');

// A tiny mr-md-ish markdown renderer for the DEMO only (the real build uses mr-md). Handles
// frontmatter, headings, bullet lists, `> [!tip]` callouts, bold/`code`, and paragraphs; the
// quiz reference line is dropped (quizzes are rendered separately into `.bk-quiz` markup).
function renderLesson(md: string): string {
  md = md.replace(/^---\n[\s\S]*?\n---\n/, ''); // strip YAML frontmatter
  const inline = (t: string) =>
    esc(t).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/`(.+?)`/g, '<code>$1</code>');
  const out: string[] = [];
  const lines = md.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (/^!\[[^\]]*\]\([^)]*\.json\)\s*$/.test(line) || line.trim() === '') { i++; continue; }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) { out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }
    if (line.startsWith('>')) {
      const body: string[] = [];
      let kind = '';
      while (i < lines.length && lines[i].startsWith('>')) {
        const t = lines[i].replace(/^>\s?/, '');
        const tag = t.match(/^\[!(\w+)\]\s*$/);
        if (tag) kind = tag[1].toLowerCase();
        else if (t.trim()) body.push(inline(t));
        i++;
      }
      out.push(`<div class="callout"><div class="tag">${esc(kind || 'note')}</div><p>${body.join(' ')}</p></div>`);
      continue;
    }
    if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) { items.push(`<li>${inline(lines[i].replace(/^[-*]\s+/, ''))}</li>`); i++; }
      out.push(`<ul>${items.join('')}</ul>`);
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,3}\s|[-*]\s|>)/.test(lines[i]) && !/^!\[[^\]]*\]\([^)]*\.json\)/.test(lines[i])) {
      para.push(lines[i]); i++;
    }
    if (para.length) out.push(`<p>${inline(para.join(' '))}</p>`);
  }
  return out.join('\n');
}

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

const CSS = THEME_CSS;

export async function buildDemo(bundleDir: string, outFile: string): Promise<string> {
  const bundle = await loadBundle(bundleDir);
  const issues = validateBundle(bundle);
  if (issues.length) throw new Error('Bundle invalid:\n' + issues.map((i) => `  ${i.path}: ${i.message}`).join('\n'));

  const runtimeJs = await bundleRuntime('SE01'); // expose SE01.bootstrap for the demo panel
  const config = buildConfig(bundle, 'demo-secret');
  const lessonHtml = renderLesson(readFileSync(join(bundleDir, bundle.manifest.lesson), 'utf8'));
  const quizHtml = bundle.quizzes.map((q, i) => renderQuiz(q, i)).join('\n');

  const html = `<!doctype html>
<html lang="${esc(bundle.manifest.language)}">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(bundle.manifest.title)} — demo</title><style>${CSS}</style></head>
<body><main>
${lessonHtml}
<p class="hint">Answer below. Get one wrong on purpose to see the app step back to a prerequisite.</p>
${quizHtml}
<div class="panel" id="panel">
  <div class="panel-head">
    <strong>Your skill map</strong>
    <span class="status" id="integrity"></span>
    <button id="toggle" aria-expanded="true">Hide</button>
  </div>
  <div class="panel-body">
    <div class="model" id="model"></div>
    <div class="map-legend"><span><span class="dot solid"></span> solid</span><span><span class="dot needs-work"></span> needs practice</span><span><span class="dot unseen"></span> not seen</span></div>
    <button id="show">Show raw record</button>
    <button id="tamper">Simulate tampering</button>
    <button id="reset">Reset</button>
    <div id="record"></div>
  </div>
</div>
</main>
<script>${MRMD_SHIM}</script>
<script>${runtimeJs}</script>
<script>${GRAPH_JS}</script>
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
  const statusById={};rows.forEach(function(r){statusById[r.id]=r.status;});
  se01Graph(document.getElementById('model'),CONFIG.skillGraph,statusById);
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
document.getElementById('toggle').onclick=function(){
  const p=document.getElementById('panel');const collapsed=p.classList.toggle('collapsed');
  this.textContent=collapsed?'Show':'Hide';this.setAttribute('aria-expanded',String(!collapsed));
  try{localStorage.setItem('se01:panelHidden',collapsed?'1':'0');}catch(e){}
};
try{if(localStorage.getItem('se01:panelHidden')==='1'){document.getElementById('panel').classList.add('collapsed');
  const t=document.getElementById('toggle');t.textContent='Show';t.setAttribute('aria-expanded','false');}}catch(e){}
</script>
</body></html>`;

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  console.log(`✓ demo written → ${outFile}  (${(html.length / 1024).toFixed(1)} KB, self-contained)`);
  return outFile;
}

// CLI: node teacher/build/demo.ts [bundleDir] [outFile]
if (import.meta.url === `file://${process.argv[1]}`) {
  await buildDemo(resolve(process.argv[2] ?? 'content/fractions'), resolve(process.argv[3] ?? 'dist/demo.html'));
}
