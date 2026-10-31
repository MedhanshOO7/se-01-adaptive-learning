import { readFile, realpath } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { marked, Renderer } from './vendor/marked.mjs';
import type { MarkdownCompiler } from './types.ts';

const escape = (s: unknown) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const mime: Record<string, string> = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.webp':'image/webp', '.svg':'image/svg+xml' };

/** Render local, trusted lesson files into a portable HTML document. */
export const inHouseCompiler: MarkdownCompiler = {
  name: 'se01-markdown',
  async compile({ lessonPath, bundleDir }) {
    const source = (await readFile(lessonPath, 'utf8')).replace(/^\uFEFF?---\s*\r?\n[\s\S]*?\r?\n---\s*(?:\r?\n|$)/, '');
    const tokens = marked.lexer(source, { gfm: true });
    const resources = new Map<string, string>();
    const pending: Promise<void>[] = [];
    let quizIndex = 0;
    const root = await realpath(bundleDir);
    marked.walkTokens(tokens, token => {
      if (token.type !== 'image') return;
      const href = token.href;
      if (/^(?:https?:|data:|\/\/)/i.test(href)) return;
      pending.push((async () => {
        const path = await realpath(resolve(dirname(lessonPath), decodeURIComponent(href.split(/[?#]/)[0])));
        const rel = relative(root, path);
        if (rel === '..' || rel.startsWith('..' + sep) || rel.startsWith(sep)) throw new Error(`Resource outside bundle: ${href}`);
        if (extname(path).toLowerCase() === '.json') {
          const quiz = JSON.parse(await readFile(path, 'utf8'));
          if (!Array.isArray(quiz.questions) || !quiz.questions.every((q: any) => typeof q.q === 'string' && Array.isArray(q.options) && q.options.every((o: unknown) => typeof o === 'string') && Number.isInteger(q.answer) && q.answer >= 0 && q.answer < q.options.length)) throw new Error(`Invalid quiz: ${href}`);
          // Stable unique IDs are assigned in document order below.
          resources.set(href, JSON.stringify(quiz));
        } else {
          const type = mime[extname(path).toLowerCase()];
          if (!type) throw new Error(`Unsupported local image: ${href}`);
          resources.set(href, `data:${type};base64,${(await readFile(path)).toString('base64')}`);
        }
      })());
    });
    await Promise.all(pending);
    const renderer = new Renderer();
    renderer.image = ({ href, text, title }) => {
      const resource = resources.get(href);
      if (resource?.startsWith('{')) {
        const quiz = JSON.parse(resource); const id = `se01-quiz-${quizIndex++}`;
        const answers = Buffer.from(JSON.stringify(quiz.questions.map((q: any) => q.answer))).toString('base64');
        return `<div class="bk-quiz"><div class="bk-quiz-data" hidden>${answers}</div><h3>${escape(quiz.title || text)}</h3>${quiz.questions.map((q: any, i: number) => `<div class="bk-question" id="${id}-q${i}"><p class="bk-prompt">${escape(q.q)}</p><div class="bk-opts">${q.options.map((o: string, n: number) => `<button type="button" class="bk-opt" data-opt-idx="${n}">${escape(o)}</button>`).join('')}</div><div class="bk-exp" id="${id}-q${i}-exp" hidden>${escape(q.explanation)}</div></div>`).join('')}</div>`;
      }
      return `<img src="${escape(resource || href)}" alt="${escape(text)}"${title ? ` title="${escape(title)}"` : ''}>`;
    };
    const body = marked.parser(tokens, { renderer, gfm: true });
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Lesson</title><style>${CSS}.controls .color-control{position:relative;display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid var(--line);border-radius:50%;background:var(--surface);cursor:pointer}.controls .color-swatch{width:20px;height:20px;border-radius:50%;background:var(--accent);box-shadow:0 0 0 1px #0002}.controls .color-control input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}.controls .color-control:focus-within{outline:2px solid var(--accent);outline-offset:3px}.controls #theme{display:grid;place-items:center;width:36px;height:36px;padding:0;border:1px solid var(--line);border-radius:50%;background:var(--surface);color:var(--ink);cursor:pointer}.controls #theme svg{width:18px;height:18px}:root:not([data-theme=dark]) .theme-sun,:root[data-theme=dark] .theme-moon{display:none}</style></head><body><header class="toolbar"><a class="wordmark" href="#content">SE<span>·</span>01 <small> / READER</small></a><div class="controls"><label class="color-control" title="Choose chapter color"><span class="color-swatch" aria-hidden="true"></span><input type="color" id="accent" value="#526b55" aria-label="Choose chapter color"></label><button id="theme" type="button" aria-label="Switch to dark mode" title="Switch to dark mode"><svg class="theme-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z"/></svg><svg class="theme-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg></button></div></header><main id="content">${body}</main><script>${SCRIPT}</script></body></html>`;
  },
};

const CSS = `
:root{color-scheme:light;--accent:#526b55;--paper:#f8f8f4;--ink:#252924;--muted:#676d65;--line:#dcded6;--surface:#fff;--soft:#f1f2ec} :root[data-theme=dark]{color-scheme:dark;--paper:#191c1a;--ink:#eef0e9;--muted:#afb7ab;--line:#3b423c;--surface:#242925;--soft:#2e3530} *{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--paper);color:var(--ink);font:17px/1.75 Georgia,serif}.toolbar{height:72px;border-bottom:1px solid var(--line);display:flex;align-items:center;justify-content:space-between;padding:0 max(24px,calc((100vw - 1100px)/2));font:600 12px/1.2 ui-sans-serif,system-ui,sans-serif;letter-spacing:.06em}.wordmark{color:var(--ink);text-decoration:none;font-size:17px;letter-spacing:-.05em}.wordmark span{color:var(--accent)}.wordmark small{font-size:10px;letter-spacing:.12em;color:var(--muted);margin-left:8px}.controls{display:flex;align-items:center;gap:20px}.controls label{display:flex;gap:8px;align-items:center;color:var(--muted)}input[type=color]{width:24px;height:24px;border:1px solid var(--line);border-radius:50%;padding:2px;background:var(--surface);cursor:pointer}input[type=color]::-webkit-color-swatch-wrapper{padding:0}input[type=color]::-webkit-color-swatch{border:0;border-radius:50%}#theme{font:inherit;letter-spacing:inherit;color:var(--ink);border:0;background:none;cursor:pointer;padding:8px}main{max-width:760px;margin:auto;padding:75px 24px 120px}h1,h2,h3{line-height:1.18;letter-spacing:-.035em}h1{font-size:clamp(2.7rem,7vw,4.5rem);font-weight:normal;margin:0 0 .8em}h2{font-size:2rem;font-weight:normal;margin:2em 0 .6em}h3{font-size:1.25rem}p{margin:1em 0}a{color:var(--accent)}blockquote{margin:2em 0;border-left:3px solid var(--accent);padding:.1em 1.3em;color:var(--muted)}code,pre{font-family:ui-monospace,monospace;font-size:.85em;background:var(--soft)}code{padding:.15em .3em;border-radius:3px}pre{overflow:auto;padding:1.2em}pre code{padding:0}img{max-width:100%;height:auto}table{border-collapse:collapse;width:100%;display:block;overflow:auto}td,th{padding:.6em;border:1px solid var(--line);text-align:left}hr{border:0;border-top:1px solid var(--line);margin:3em 0}.bk-quiz{margin:3em 0;padding:1.5em;border:1px solid var(--line);background:var(--surface)}.bk-quiz h3{margin:0 0 1em}.bk-question+.bk-question{margin-top:2em}.bk-prompt{font-weight:bold}.bk-opts{display:grid;gap:8px}.bk-opt{font:inherit;text-align:left;color:var(--ink);background:var(--paper);border:1px solid var(--line);padding:.65em .9em;cursor:pointer}.bk-opt:hover:not(:disabled){border-color:var(--accent)}.bk-opt.correct{border-color:#43845a}.bk-opt.wrong{border-color:#b44d4d}.bk-exp,.se01-explanation{margin-top:1em;color:var(--muted)}:focus-visible{outline:3px solid var(--accent);outline-offset:3px}@media(max-width:520px){main{padding-top:48px}.toolbar{padding:0 18px}.wordmark small{display:none}.controls{gap:10px}}`;
const SCRIPT = `(function(){const root=document.documentElement,theme=document.getElementById('theme'),accent=document.getElementById('accent');try{root.dataset.theme=localStorage.getItem('se01-reader-theme')||'light';accent.value=localStorage.getItem('se01-reader-accent')||'#526b55'}catch(e){}root.style.setProperty('--accent',accent.value);function save(k,v){try{localStorage.setItem(k,v)}catch(e){}}function updateTheme(){const label=root.dataset.theme==='dark'?'Switch to light mode':'Switch to dark mode';theme.setAttribute('aria-label',label);theme.title=label}updateTheme();theme.addEventListener('click',()=>{root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';save('se01-reader-theme',root.dataset.theme);updateTheme()});accent.addEventListener('input',()=>{root.style.setProperty('--accent',accent.value);save('se01-reader-accent',accent.value)});document.addEventListener('click',e=>{const b=e.target.closest('.bk-opt');if(!b||b.disabled)return;const q=b.closest('.bk-question'),quiz=b.closest('.bk-quiz');if(!q||!quiz)return;let answers;try{answers=JSON.parse(atob(quiz.querySelector('.bk-quiz-data').textContent))}catch(e){return}const i=Number(q.id.match(/-q(\\d+)$/)?.[1]);q.querySelectorAll('.bk-opt').forEach((o,n)=>{o.disabled=true;if(n===answers[i])o.classList.add('correct')});if(Number(b.dataset.optIdx)!==answers[i])b.classList.add('wrong');const exp=q.querySelector('.bk-exp,.se01-explanation');if(exp)exp.hidden=false})})();`;
export default inHouseCompiler;
