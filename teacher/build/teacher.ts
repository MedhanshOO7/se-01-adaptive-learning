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
import { THEME_CSS } from './theme.ts';

const CSS = THEME_CSS;

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
<title>Teacher dashboard — SE-01</title><style>${CSS}</style></head>
<body><main>
<a class="back" href="/">← all demos</a>
<h1>Teacher dashboard</h1>
<p class="sub">Per-skill progress from this device. (Local demo — no sync server yet.)</p>
<div id="root"></div>
</main>
<script>${runtimeJs}</script>
<script>
const CHAPTERS=${JSON.stringify(configs)};
const root=document.getElementById('root');
function h(html){const d=document.createElement('div');d.innerHTML=html;return d.firstElementChild;}
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
    const skillRows=rows.map(function(r){
      const word=r.status==='solid'?'solid':r.status==='needs-work'?'needs practice':'not seen yet';
      return '<div class="row"><span class="dot '+r.status+'"></span><span class="lbl">'+r.label+'</span><span class="st">'+word+' · '+r.attempts+' tried</span></div>';
    }).join('');
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
    root.appendChild(h('<div class="card">'+badge+'<h2>'+ch.title+'</h2><div class="meta">'+solid+' / '+rows.length+' skills solid · '+attempts+' attempt(s)</div>'+skillRows+attention+missed+'</div>'));
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
