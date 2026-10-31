import { readFile, realpath, mkdir, writeFile, access } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import type { MarkdownCompiler } from '../../compiler/types.ts';
import { FONT_CSS } from '../build/fonts.ts';
import { validateConfig } from '../../shared/learning/validate.ts';
import type { ChapterConfig } from '../../shared/learning/types.ts';

export async function findLearningRoot(file: string): Promise<string | null> {
  let dir=dirname(resolve(file));
  while(true) {
    if(await access(resolve(dir,'chapter.config.json')).then(()=>true,()=>false)) return dir;
    const parent=dirname(dir); if(parent===dir) return null; dir=parent;
  }
}
export async function loadLearningConfig(root:string):Promise<ChapterConfig> {
  const data:unknown=JSON.parse(await readFile(resolve(root,'chapter.config.json'),'utf8'));
  validateConfig(data);
  const base=await realpath(root);
  for(const page of data.pages) {
    const file=await realpath(resolve(base,page.file));
    if(!file.startsWith(base+sep)) throw new Error(`Page escapes chapter folder: ${page.file}`);
  }
  return data;
}
const safeJSON=(value:unknown)=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
let runtimePromise:Promise<string>|undefined;
async function runtime():Promise<string> {
  runtimePromise??=build({entryPoints:[new URL('../../student/learning/runtime.ts',import.meta.url).pathname],bundle:true,write:false,format:'iife',target:'es2022',minify:true}).then(r=>r.outputFiles[0].text);
  return runtimePromise;
}
export async function compileLearningPage(root:string, file:string, compiler:MarkdownCompiler):Promise<string> {
  const config=await loadLearningConfig(root);
  if(!config.pages.some(p=>p.file===file)) throw new Error(`Page ${file} is not declared in chapter.config.json`);
  const html=await compiler.compile({bundleDir:resolve(root),lessonPath:resolve(root,file)});
  if(typeof html!=='string'||!html.trim()) throw new Error(`Compiler ${compiler.name} returned empty or invalid HTML`);
  const dom=new JSDOM(html); const doc=dom.window.document;
  const page=config.pages.find(p=>p.file===file)!;
  const mounts=[...doc.querySelectorAll('[data-learning-quiz]')].map(e=>e.getAttribute('data-learning-quiz')!);
  if(mounts.length!==page.quizzes.length||new Set(mounts).size!==mounts.length||mounts.some(id=>!page.quizzes.includes(id))) throw new Error(`${file}: compiler ${compiler.name} must preserve each declared quiz marker exactly once (${page.quizzes.join(', ')})`);
  for(const marker of ['data-learning-stats','data-learning-next']) {
    if(doc.querySelectorAll(`[${marker}]`).length!==1) throw new Error(`${file}: compiler ${compiler.name} must preserve exactly one ${marker} marker`);
  }
  // Offline output may not silently depend on remote scripts, fonts, or media.
  for(const element of doc.querySelectorAll('script[src],link[href],img[src],source[src],video[src],audio[src],iframe[src]')) {
    const url=element.getAttribute('src')??element.getAttribute('href')??'';
    if(/^(?:https?:)?\/\//i.test(url)) throw new Error(`${file}: external asset ${url}; configure the compiler to embed assets for offline use`);
    if(url&&!url.startsWith('data:')&&!url.startsWith('#')) throw new Error(`${file}: asset ${url} must be embedded by the compiler adapter`);
  }
  const style=doc.createElement('style'); style.textContent=(doc.head.textContent?.includes('font-family:"UbuntuSE"') ? '' : FONT_CSS) + await readFile(new URL('../../student/learning/style.css',import.meta.url),'utf8'); doc.head.append(style);
  const configScript=doc.createElement('script'); configScript.textContent=`window.__LEARNING__=${safeJSON({config,page:file})};`;
  const script=doc.createElement('script'); script.textContent=(await runtime()).replace(/<\/script/gi,'<\\/script'); doc.body.append(configScript,script);
  const viewport=doc.createElement('meta'); viewport.name='viewport'; viewport.content='width=device-width, initial-scale=1'; if(!doc.querySelector('meta[name=viewport]')) doc.head.append(viewport);
  const result=dom.serialize(); dom.window.close(); return result;
}
export async function buildLearningChapter(root:string,outDir:string,compiler:MarkdownCompiler):Promise<string> {
  const config=await loadLearningConfig(root);
  // Compile all pages before writing any output; a broken destination fails the build.
  const pages=[];
  for(const page of config.pages) pages.push({file:page.file.replace(/\.md$/,'.html'),html:await compileLearningPage(root,page.file,compiler)});
  for(const page of pages) {const target=resolve(outDir,page.file); await mkdir(dirname(target),{recursive:true}); await writeFile(target,page.html);}
  return resolve(outDir,config.entry.replace(/\.md$/,'.html'));
}
