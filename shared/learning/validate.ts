import type { ChapterConfig } from './types.ts';
import { grade } from './engine.ts';

/** Reject malformed or executable configuration before any page is compiled. */
export function validateConfig(input: unknown): asserts input is ChapterConfig {
  const fail = (path: string, message: string): never => { throw new Error(`${path}: ${message}`); };
  const obj = (v: any, p: string) => { if (!v || typeof v !== 'object' || Array.isArray(v)) fail(p,'expected object'); };
  const str = (v: any, p: string) => { if (typeof v !== 'string' || !v.trim()) fail(p,'expected nonempty string'); };
  const list = (v: any, p: string) => { if (!Array.isArray(v) || !v.length) fail(p,'expected nonempty array'); };
  const num = (v: any, p: string, min=0, max=100) => { if (typeof v !== 'number' || !Number.isFinite(v) || v<min || v>max) fail(p,`expected number ${min}…${max}`); };
  const ids = (items: any[], p: string) => {
    const seen = new Set<string>();
    items.forEach((x,i) => { obj(x,`${p}[${i}]`); str(x.id,`${p}[${i}].id`); if (!/^[a-zA-Z0-9][\w.-]*$/.test(x.id) || seen.has(x.id)) fail(p,'invalid or duplicate id '+x.id); seen.add(x.id); });
    return seen;
  };
  const refs = (v: any, set: Set<string>, p: string) => { list(v,p); const seen = new Set(); v.forEach((id:any) => { if (!set.has(id) || seen.has(id)) fail(p,'unknown or duplicate reference '+id); seen.add(id); }); };
  const path = (v:any,p:string) => { str(v,p); if (!/^[\w-]+(?:\/[\w-]+)*\.md$/.test(v)) fail(p,'expected a relative Markdown path inside the chapter folder'); };
  const c = input as any;
  obj(c,'config'); if(c.schemaVersion!==1) fail('schemaVersion','unsupported version');
  str(c.id,'id'); str(c.revision,'revision'); str(c.title,'title');
  list(c.topics,'topics'); const topics = ids(c.topics,'topics'); c.topics.forEach((t:any)=>str(t.label,'topic.label'));
  obj(c.hexagon,'hexagon'); list(c.hexagon.axes,'hexagon.axes');
  if(c.hexagon.axes.length!==6) fail('hexagon.axes','define exactly six chapter-specific axes');
  const axes = ids(c.hexagon.axes,'hexagon.axes');
  c.hexagon.axes.forEach((a:any)=> { str(a.label,'axis.label'); refs(a.topics,topics,'axis.topics'); if(!['average','weakest'].includes(a.aggregation)) fail('axis.aggregation','expected average or weakest'); num(a.minEvidence,'axis.minEvidence',1,10000); if(!Number.isInteger(a.minEvidence)) fail('axis.minEvidence','expected integer'); });
  if(!['first','latest'].includes(c.hexagon.evidence)) fail('hexagon.evidence','expected first or latest');
  num(c.hexagon.evidenceWindow,'hexagon.evidenceWindow',1,10000); if(!Number.isInteger(c.hexagon.evidenceWindow)) fail('hexagon.evidenceWindow','expected integer');
  num(c.hexagon.hintedCredit,'hexagon.hintedCredit',0,1); list(c.hexagon.bands,'hexagon.bands');
  let previous=0; c.hexagon.bands.forEach((b:any)=> {obj(b,'band'); num(b.below,'band.below',0,101); if(b.below<=previous) fail('bands','thresholds must increase'); previous=b.below; str(b.label,'band.label');});
  list(c.quizzes,'quizzes'); const quizzes=ids(c.quizzes,'quizzes'); const allQuestions:any[]=[];
  c.quizzes.forEach((quiz:any)=> {
    str(quiz.title,'quiz.title'); list(quiz.questions,'quiz.questions');
    quiz.questions.forEach((q:any)=> {
      obj(q,'question'); str(q.prompt,'question.prompt'); str(q.explanation,'question.explanation'); refs(q.topics,topics,'question.topics'); num(q.weight,'question.weight',0.001,10000);
      if(q.hint!==undefined) str(q.hint,'question.hint');
      if(q.level!==undefined && !['foundation','core','hots'].includes(q.level)) fail('question.level','unsupported level');
      if(!['single','multiple','numeric','ordering'].includes(q.type)) fail('question.type','unsupported type');
      if(q.type==='numeric') {
        if(typeof q.answer!=='string') fail('question.answer','numeric answer must be a string');
        if(q.tolerance!==undefined) num(q.tolerance,'question.tolerance',0,Number.MAX_VALUE);
        if(q.simplestForm!==undefined && typeof q.simplestForm!=='boolean') fail('question.simplestForm','expected boolean');
        if(!grade(q,q.answer)) fail('question.answer','invalid numeric answer');
      } else {
        list(q.options,'question.options'); if(q.options.length<2) fail('question.options','at least two options required'); q.options.forEach((o:any)=>str(o,'option'));
        const index=(n:any)=>Number.isInteger(n)&&n>=0&&n<q.options.length;
        if(q.type==='single') { if(!index(q.answer)) fail('question.answer','invalid option index'); }
        else { list(q.answer,'question.answer'); if(!q.answer.every(index)||new Set(q.answer).size!==q.answer.length) fail('question.answer','invalid option indices'); if(q.type==='ordering'&&q.answer.length!==q.options.length) fail('question.answer','ordering must include every option'); }
      }
      allQuestions.push(q);
    });
  }); ids(allQuestions,'questions');
  list(c.pages,'pages'); const files=new Set<string>(); const mounted=new Set<string>();
  c.pages.forEach((p:any)=> {obj(p,'page'); path(p.file,'page.file'); str(p.title,'page.title'); if(files.has(p.file)) fail('pages','duplicate file'); files.add(p.file); if(!Array.isArray(p.quizzes)) fail('page.quizzes','expected array'); p.quizzes.forEach((id:any)=> {if(!quizzes.has(id)||mounted.has(id)) fail('page.quizzes','unknown or duplicate quiz '+id); mounted.add(id);}); });
  if(mounted.size!==quizzes.size) fail('pages','every quiz must belong to exactly one page');
  path(c.entry,'entry'); if(!files.has(c.entry)) fail('entry','must reference a declared page');
  obj(c.completion,'completion'); refs(c.completion.quizzes,quizzes,'completion.quizzes');
  obj(c.routing,'routing'); if(!Array.isArray(c.routing.rules)) fail('routing.rules','expected array'); ids(c.routing.rules,'routing.rules');
  const condition=(x:any, depth=0):void=> {
    obj(x,'condition'); if(depth>16) fail('condition','nesting too deep');
    if('all' in x || 'any' in x) { const key='all' in x?'all':'any'; if(Object.keys(x).length!==1) fail('condition','use one condition form'); list(x[key],'condition.'+key); x[key].forEach((v:any)=>condition(v,depth+1)); }
    else if('weakest' in x) { if(Object.keys(x).length!==1||!axes.has(x.weakest)) fail('condition.weakest','unknown axis'); }
    else { if(Object.keys(x).sort().join(',')!=='axis,op,value'||!axes.has(x.axis)||!['<','<=','>','>=','=='].includes(x.op)) fail('condition','invalid axis comparison'); num(x.value,'condition.value'); }
  };
  const target=(r:any)=> {obj(r,'route'); path(r.file,'route.file'); if(!files.has(r.file)) fail('route.file','must reference a declared page'); str(r.reason,'route.reason');};
  c.routing.rules.forEach((r:any)=> {num(r.priority,'rule.priority',-10000,10000); condition(r.when); target(r);}); target(c.routing.fallback);
}
