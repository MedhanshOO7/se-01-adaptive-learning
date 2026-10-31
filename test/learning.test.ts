import { test } from 'node:test';
import assert from 'node:assert/strict';
import { grade, stats, recommend, matches } from '../shared/learning/engine.ts';
import { validateConfig } from '../shared/learning/validate.ts';
import { loadLearningConfig } from '../teacher/learning/load.ts';
import type { Attempt, ChapterConfig, Response } from '../shared/learning/types.ts';
const root='content/learning-fractions';
const fixture=()=>loadLearningConfig(root);
function attempt(questionId:string,response:Response,hinted=false):Attempt {return {questionId,response,hinted,at:new Date().toISOString()};}
function answers(c:ChapterConfig):Attempt[] {return c.quizzes[0].questions.map(q=>attempt(q.id,q.answer));}

test('four scorers handle exact sets, order, equivalent fractions, simplest form and invalid numbers',async()=> {
 const c=await fixture(); const [single,multiple,order,simple,number]=c.quizzes[0].questions;
 assert.equal(grade(single,0),true); assert.equal(grade(single,1),false);
 assert.equal(grade(multiple,[1,0]),true); assert.equal(grade(multiple,[0,0,1]),false); assert.equal(grade(multiple,[0]),false);
 assert.equal(grade(order,[1,2,0]),true); assert.equal(grade(order,[0,2,1]),false);
 assert.equal(grade(simple,'6/8'),false); assert.equal(grade(simple,'3/4'),true);
 assert.equal(grade(number,'6/8'),true); for(const invalid of ['1/0','NaN','hello','', '0x0']) assert.equal(grade(number,invalid),false);
});
test('stats distinguish unknown, hints, first/latest evidence and later recovery',async()=> {
 const c=await fixture(); assert.equal(stats(c,[])[0].value,null); assert.equal(recommend(c,[]),null);
 const a=answers(c); a[0].response=1; assert.equal(stats(c,a)[0].value,0); assert.equal(recommend(c,a)?.file,'lessons/equal-parts.md');
 a.push(attempt('practice-parts',0)); assert.equal(stats(c,a)[0].value,100); assert.equal(recommend(c,a)?.file,'lessons/next.md');
 a.push(attempt('check-parts',1)); assert.equal(stats(c,a)[0].value,0);
 c.hexagon.evidence='first'; assert.equal(stats(c,[attempt('check-parts',0,true),attempt('check-parts',0)])[0].value,50);
 c.hexagon.axes[0].minEvidence=2; assert.equal(stats(c,[attempt('check-parts',0)])[0].value,null);
});
test('nested AND/OR, weakest ties, priority and fallback are deterministic',async()=> {
 const c=await fixture(), a=answers(c); const values=stats(c,a);
 assert.equal(matches({all:[{axis:'addition',op:'>=',value:75},{any:[{axis:'equivalence',op:'<',value:10},{weakest:'reasoning'}]}]},values),true);
 assert.equal(recommend(c,a)?.file,'lessons/next.md'); c.routing.rules=[]; assert.equal(recommend(c,a)?.reason,c.routing.fallback.reason);
});
test('configuration rejects unknown references, executable conditions, paths, duplicates and malformed values',async()=> {
 const source=await fixture();
 const mutations=[(c:any)=>c.pages[0].file='../escape.md',(c:any)=>c.quizzes[0].questions[0].topics=['unknown'],(c:any)=>c.routing.rules[0].when='a && b',(c:any)=>c.hexagon.axes.pop(),(c:any)=>c.quizzes[0].questions[0].id=c.quizzes[0].questions[1].id,(c:any)=>c.routing.fallback.file='missing.md',(c:any)=>c.hexagon.hintedCredit=2];
 for(const mutate of mutations) {const c=structuredClone(source); mutate(c); assert.throws(()=>validateConfig(c));}
});
