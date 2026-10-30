// Local teacher progress dashboard (demo). A single page that opens the SAME local attempt
// log the student runtime writes (same localhost origin + same demo secret) and shows, per
// chapter, each skill's mastery and who is struggling. It reads real evidence from the
// browser's IndexedDB — there is no sync server yet, so it reflects whoever used the student
// app in THIS browser. (A real multi-student dashboard needs the deferred sync backend.)

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { loadBundle } from './load.ts';
import { bundleRuntime } from './bundle-runtime.ts';
import { buildConfig } from './build.ts';
import { validateBundle } from '../../shared/schema/index.ts';
import { THEME_CSS, GRAPH_JS } from './theme.ts';

const CSS = THEME_CSS;

// Teacher page gets its own palette (blended from two random colors: #ac77da + #d9bbed →
// base #c399e4, a violet→magenta) plus a Spline-style animated gradient-blob hero.
const TEACHER_CSS = `
:root{
  --paper:#959b8b; --surface:#ffffff; --surface-2:#e8eddd;
  --ink:#282e1a; --muted:#778060; --line:#e6eadc;
  --brand:#a1c936; --brand-2:#42ba36; --brand-ink:#282e1a;
  --ok:#0e8f8a; --bad:#d6436b;
  --shadow:0 1px 2px rgba(40,46,26,.05), 0 14px 34px -16px rgba(161,201,54,.24);
}
/* Teacher dark palette opt-in only; light forced by default. */
:root[data-theme="dark"]{
  --paper:#4d533c; --surface:#5a6048; --surface-2:#676d54;
  --ink:#f3f4f1; --muted:#c9cdc1; --line:#798165;
  --brand:#c2e071; --brand-2:#75d16c; --brand-ink:#282e1a;
  --ok:#49cfc6; --bad:#ff7aa0;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 18px 40px -20px rgba(194,224,113,.3);
}
/* Spline-style fluid hero: drifting, blurred gradient blobs over a dark base. */
.t-hero{position:relative;overflow:hidden;border-radius:24px;padding:38px 30px;margin:6px 0 24px;
  background:#15190c;box-shadow:var(--shadow);isolation:isolate}
.t-hero h1,.t-hero p{position:relative;z-index:1;color:#fff}
.t-hero h1{margin:.05em 0 .2em}.t-hero p{color:rgba(255,255,255,.82);margin:0;max-width:48ch}
.t-hero .eyebrow{font-weight:650;font-size:.8rem;color:rgba(255,255,255,.7);margin:0 0 .3em}
.blob{position:absolute;border-radius:50%;filter:blur(42px);opacity:.9;mix-blend-mode:screen;z-index:0}
.b1{width:280px;height:280px;background:var(--brand);top:-90px;left:-50px;animation:drift1 15s ease-in-out infinite}
.b2{width:240px;height:240px;background:var(--brand-2);top:-50px;right:-40px;animation:drift2 19s ease-in-out infinite}
.b3{width:220px;height:220px;background:#4d6bff;bottom:-110px;left:38%;animation:drift3 17s ease-in-out infinite}
@keyframes drift1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,30px) scale(1.15)}}
@keyframes drift2{0%,100%{transform:translate(0,0) scale(1.1)}50%{transform:translate(-50px,40px) scale(.9)}}
@keyframes drift3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(30px,-40px) scale(1.2)}}
`;

export async function buildTeacher(chapters: { title: string; bundle: string }[], outFile: string): Promise<string> {
  const runtimeJs = await bundleRuntime('SE01');
  const configs = [];
  for (const c of chapters) {
    const bundle = await loadBundle(resolve(c.bundle));
    const issues = validateBundle(bundle);
    if (issues.length) throw new Error(`Bundle ${c.bundle} invalid: ${issues.map((i) => i.path).join(', ')}`);
    configs.push({ title: c.title, ...buildConfig(bundle, 'demo-secret') });
  }

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Teacher dashboard — SE-01</title><style>${CSS}${TEACHER_CSS}</style></head>
<body><main>
<a class="back" href="/">← all demos</a>
<section class="t-hero">
  <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>
  <p class="eyebrow">Teacher view</p>
  <h1>Where each student stands</h1>
  <p>Per-skill progress from this device — teal is solid, pink needs practice. (Local demo — no sync server yet.)</p>
</section>
<div id="root"></div>
</main>
<script>${runtimeJs}</script>
<script>${GRAPH_JS}</script>
<script>
const CHAPTERS=${JSON.stringify(configs)};
const root=document.getElementById('root');
function h(html){const d=document.createElement('div');d.innerHTML=html;return d.firstElementChild;}
const LEGEND='<div class="map-legend"><span><span class="dot solid"></span> solid</span><span><span class="dot needs-work"></span> needs practice</span><span><span class="dot unseen"></span> not seen</span></div>';
(async function(){
  for(const ch of CHAPTERS){
    const store=await SE01.openEventStore({backend:SE01.indexedDbBackend('se01:'+ch.chapterId),secret:ch.secret,chapterId:ch.chapterId,chapterRevision:ch.chapterRevision});
    let events=[],tampered=false;
    try{events=await store.list();}catch(e){tampered=true;}
    const rows=SE01.summariseSkills(ch.skillGraph,events);
    const solid=rows.filter(r=>r.status==='solid').length;
    const needs=rows.filter(r=>r.status==='needs-work');
    const attempts=events.length;
    const badge=tampered?'<span class="badge bad">✗ record tampered</span>':attempts?'<span class="badge ok">✓ record intact</span>':'';
    const statusById={};rows.forEach(function(r){statusById[r.id]=r.status;});
    let attention;
    if(attempts===0) attention='<div class="attention">No activity yet — have the student open this chapter and answer some questions.</div>';
    else if(needs.length) attention='<div class="attention"><strong>Needs attention:</strong> '+needs.map(function(n){return n.label;}).join('; ')+'.</div>';
    else attention='<div class="attention good">On track — every attempted skill is solid.</div>';
    // Which specific questions were missed (most recent wrong per quiz question).
    const wrong=events.filter(function(e){return e.correct===false;});
    let missed='';
    if(wrong.length){
      const byQ={};
      wrong.forEach(function(e){
        const quiz=ch.quizzes.find(function(q){return q.id===e.quizId;});
        const prompt=quiz&&quiz.questions[e.questionIndex]?quiz.questions[e.questionIndex].q:(e.quizId+' q'+e.questionIndex);
        byQ[prompt]=(e.skillId||'');
      });
      missed='<div class="missed">Missed: '+Object.keys(byQ).map(function(p){return '“'+p+'”';}).join(' · ')+'</div>';
    }
    const mapId='map-'+ch.chapterId;
    const card=h('<div class="card">'+badge+'<h2>'+ch.title+'</h2><div class="meta">'+solid+' / '+rows.length+' skills solid · '+attempts+' attempt(s)</div><div class="se01-map-mount" id="'+mapId+'"></div>'+LEGEND+attention+missed+'</div>');
    root.appendChild(card);
    se01Graph(document.getElementById(mapId),ch.skillGraph,statusById);
  }
  if(!CHAPTERS.length) root.innerHTML='<p>No chapters.</p>';
})();
</script>
</body></html>`;

  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, html);
  console.log(`✓ teacher dashboard → ${outFile}`);
  return outFile;
}
