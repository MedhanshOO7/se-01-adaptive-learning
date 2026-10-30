// Shared visual theme for the local pages (menu, student lesson, teacher dashboard) so they
// read as one system. Pure CSS/SVG — no web fonts, no network — so it works fully offline.
//
// Direction: "a living graph of understanding". The prerequisite skill-graph is the product's
// signature mechanic, so a softly animated node/link graph is the hero motif (also reads as an
// atom / constellation). One orchestrated motion: a pulse travelling BACK along a link = the
// app stepping back to a prerequisite. Everything else stays quiet. Reduced-motion freezes it.

import { FONT_CSS } from './fonts.ts';

export const THEME_CSS = FONT_CSS + `
:root{
  color-scheme:light dark;
  /* Base hue blended from two random colors (#913383 + #5de94d → #778e68). */
  --paper:#fbfcfa; --surface:#ffffff; --surface-2:#f8fbf6;
  --ink:#1f2a18; --muted:#728367; --line:#e4ecdf;
  --brand:#5fae2e; --brand-2:#3fca57; --brand-ink:#ffffff;
  --ok:#0e8f8a; --bad:#d6436b;
  --shadow:0 1px 2px rgba(31,42,24,.05), 0 12px 32px -16px rgba(63,202,87,.20);
  --sans:"UbuntuSE","Ubuntu","Cantarell","Segoe UI",system-ui,-apple-system,Roboto,sans-serif;
}
@media (prefers-color-scheme:dark){:root{
  /* dark surfaces lightened by +20% white (was too dark) */
  --paper:#41473d; --surface:#4a5145; --surface-2:#525b4d;
  --ink:#f3f5f0; --muted:#c3ccbd; --line:#687560;
  --brand:#a8e77e; --brand-2:#79d78a; --brand-ink:#12190d;
  --ok:#49cfc6; --bad:#ff7aa0;
  --shadow:0 1px 2px rgba(0,0,0,.3), 0 18px 40px -20px rgba(168,231,126,.28);
}}

*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font-family:var(--sans);
  font-size:17px;line-height:1.6;letter-spacing:-0.006em;
  background-image:radial-gradient(120% 80% at 85% -10%, color-mix(in srgb,var(--brand) 16%,transparent), transparent 60%),
    radial-gradient(90% 60% at -10% 0%, color-mix(in srgb,var(--brand-2) 14%,transparent), transparent 55%);
  background-attachment:fixed;}
/* +20% white wash over the background (light mode only — keeps dark depth intact) */
@media (prefers-color-scheme:light){body{
  background-image:linear-gradient(rgba(255,255,255,.2),rgba(255,255,255,.2)),
    radial-gradient(120% 80% at 85% -10%, color-mix(in srgb,var(--brand) 16%,transparent), transparent 60%),
    radial-gradient(90% 60% at -10% 0%, color-mix(in srgb,var(--brand-2) 14%,transparent), transparent 55%);
}}
main{max-width:720px;margin:0 auto;padding:40px 20px 96px}
h1{font-size:clamp(2rem,4.4vw,2.9rem);line-height:1.04;font-weight:700;letter-spacing:-0.035em;margin:.1em 0 .25em}
h2{font-size:1.3rem;font-weight:700;letter-spacing:-0.022em;margin:1.9em 0 .4em}
h3{font-size:1.05rem;font-weight:700;margin:1.4em 0 .3em}
p{margin:.7em 0}
a{color:inherit}
code{font-family:"SF Mono",ui-monospace,"Cascadia Code","JetBrains Mono",monospace;
  font-size:.9em;background:color-mix(in srgb,var(--brand) 12%,transparent);
  padding:.08em .4em;border-radius:5px}
ul{padding-left:1.15em;margin:.6em 0}li{margin:.25em 0}
.sub{color:var(--muted)}
a.back{display:inline-block;color:var(--brand);text-decoration:none;font-weight:650;margin-bottom:8px}
a.back:hover{text-decoration:underline}
:focus-visible{outline:2.5px solid var(--brand);outline-offset:2px;border-radius:4px}

/* ---- hero graph motif ---- */
.hero{position:relative;margin:8px 0 28px;padding:30px 28px;border-radius:22px;overflow:hidden;
  background:linear-gradient(135deg, color-mix(in srgb,var(--brand) 58%, #0a1405) 0%, color-mix(in srgb,var(--brand-2) 54%, #0a1405) 100%);
  color:#fff;box-shadow:var(--shadow)}
.hero .eyebrow{font-weight:650;font-size:.82rem;opacity:.85;margin:0}
.hero h1{color:#fff;margin:.1em 0 .2em;max-width:14ch}
.hero p{color:rgba(255,255,255,.88);max-width:46ch;margin:.2em 0 0}
.hero-graph{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.9}
.hero-graph .lnk{stroke:rgba(255,255,255,.35);stroke-width:1.5}
.hero-graph .node{fill:#fff}
.hero-graph .node.dim{fill:rgba(255,255,255,.55)}
.hero-graph .halo{fill:rgba(255,255,255,.16)}
.hero-float{animation:float 9s ease-in-out infinite}
.hero-float.b{animation-duration:11s;animation-direction:alternate}
.pulse{fill:#fff;filter:drop-shadow(0 0 6px #fff)}
.pulse-path{offset-path:path("M 250 60 L 180 130 L 90 110");animation:travel 3.4s cubic-bezier(.6,0,.4,1) infinite}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
@keyframes travel{0%{offset-distance:0%;opacity:0}12%{opacity:1}75%{opacity:1}100%{offset-distance:100%;opacity:0}}

/* ---- menu ---- */
.menu{display:grid;gap:14px;margin-top:8px}
.tile{display:flex;align-items:center;gap:16px;text-decoration:none;color:inherit;
  background:var(--surface);border:1px solid var(--line);border-radius:16px;padding:18px 20px;
  box-shadow:var(--shadow);transition:transform .18s ease, border-color .18s ease}
.tile:hover{transform:translateY(-3px) scale(1.01);border-color:color-mix(in srgb,var(--brand) 45%,var(--line));
  box-shadow:0 2px 4px rgba(0,0,0,.04), 0 22px 48px -22px color-mix(in srgb,var(--brand) 55%,transparent)}
.hero,.tile{animation:riseIn .6s both cubic-bezier(.2,.75,.25,1)}
.tile:nth-child(1){animation-delay:.06s}.tile:nth-child(2){animation-delay:.13s}.tile:nth-child(3){animation-delay:.2s}
@keyframes riseIn{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
.tile .ic{flex:none;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;
  background:color-mix(in srgb,var(--brand) 14%,transparent);color:var(--brand);font-weight:800}
.tile.teacher .ic{background:color-mix(in srgb,var(--brand-2) 18%,transparent);color:color-mix(in srgb,var(--brand-2) 70%,var(--ink))}
.tile .t{font-weight:700}.tile .d{color:var(--muted);font-size:.9rem}
.tile .go{margin-left:auto;color:var(--muted);font-size:1.3rem;transition:transform .18s ease}
.tile:hover .go{transform:translateX(3px);color:var(--brand)}

/* ---- lesson prose ---- */
.hint{color:var(--muted);font-style:italic}
.callout{position:relative;margin:1.5em 0;padding:14px 18px 14px 20px;border-radius:0 14px 14px 0;
  background:var(--surface);border-left:3px solid var(--brand);box-shadow:var(--shadow)}
.callout .tag{font-weight:700;font-size:.78rem;color:var(--brand);margin-bottom:.1em;text-transform:capitalize}
.callout p{margin:.15em 0}

/* ---- quiz (mr-md .bk-* contract + our follow-ups) ---- */
.bk-quiz{background:var(--surface);border:1px solid var(--line);border-radius:18px;
  padding:22px 24px;margin:1.7em 0;box-shadow:var(--shadow)}
.bk-quiz[data-se01-prereq]{border-color:transparent;position:relative;
  background:linear-gradient(var(--surface),var(--surface)) padding-box,
    linear-gradient(135deg,var(--brand),var(--brand-2)) border-box;border:1.5px solid transparent;
  animation:rise .45s cubic-bezier(.2,.7,.2,1)}
@keyframes rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.bk-prompt,.se01-remediation-prompt{font-weight:650;margin:.1em 0 1em;font-size:1.06rem}
.bk-opts{display:grid;gap:9px}
.bk-opt{font:inherit;text-align:left;padding:13px 16px;border:1.5px solid var(--line);border-radius:12px;
  background:var(--surface-2);color:inherit;cursor:pointer;transition:border-color .15s,background .15s,transform .1s}
.bk-opt:hover:not(:disabled){border-color:var(--brand);transform:translateY(-1px)}
.bk-opt:active:not(:disabled){transform:translateY(0)}
.bk-opt:disabled{cursor:default}
.bk-opt{position:relative}
.bk-opt.correct{border-color:var(--ok);background:color-mix(in srgb,var(--ok) 15%,var(--surface));font-weight:650;
  animation:pop .4s cubic-bezier(.3,1.4,.5,1)}
.bk-opt.wrong{border-color:var(--bad);background:color-mix(in srgb,var(--bad) 13%,var(--surface));
  animation:shake .4s ease}
.bk-opt.correct::after{content:"✓";position:absolute;right:14px;top:50%;transform:translateY(-50%);
  color:var(--ok);font-weight:800;animation:fadein .3s .1s both}
.bk-opt.wrong::after{content:"✗";position:absolute;right:14px;top:50%;transform:translateY(-50%);
  color:var(--bad);font-weight:800;animation:fadein .3s both}
@keyframes pop{0%{transform:scale(1)}40%{transform:scale(1.035)}100%{transform:scale(1)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
@keyframes fadein{from{opacity:0;transform:translateY(-50%) scale(.6)}to{opacity:1;transform:translateY(-50%) scale(1)}}
.bk-opt.disabled{opacity:.45}
.bk-exp,.se01-explanation{margin-top:12px;padding:10px 14px;border-radius:10px;
  background:var(--surface-2);color:var(--muted);font-size:.95rem}
.se01-tag{display:inline-flex;align-items:center;gap:6px;font-weight:700;font-size:.68rem;
  letter-spacing:.02em;color:var(--brand-ink);background:linear-gradient(135deg,var(--brand),var(--brand-2));
  padding:5px 11px;border-radius:999px;margin-bottom:12px}
.se01-remediation-reason{color:var(--brand);font-weight:650;font-size:.95rem;margin:.1em 0 .7em}

/* ---- panels / cards / dashboard ---- */
.panel,.card{background:var(--surface);border:1px solid var(--line);border-radius:18px;
  padding:18px 22px;box-shadow:var(--shadow)}
.panel{position:sticky;bottom:14px;margin-top:40px}
.panel-head{display:flex;align-items:center;gap:10px}
.panel #toggle{margin-left:auto;font:inherit;font-weight:650;padding:6px 14px;border:1.5px solid var(--line);
  border-radius:999px;background:var(--surface-2);color:inherit;cursor:pointer}
.panel #toggle:hover{border-color:var(--brand)}
.panel-body{margin-top:12px}
.panel.collapsed{box-shadow:var(--shadow)}
.panel.collapsed .panel-body{display:none}
.panel strong,.card h2{font-size:1.05rem}
.panel button{font:inherit;font-weight:600;margin:10px 8px 0 0;padding:8px 14px;border:1.5px solid var(--line);
  border-radius:10px;background:var(--surface-2);color:inherit;cursor:pointer;transition:border-color .15s}
.panel button:hover{border-color:var(--brand)}
.status{margin-left:8px;font-weight:650}.ok{color:var(--ok)}.bad{color:var(--bad)}
.model{display:grid;gap:9px;margin:14px 0 4px}
.row{display:flex;align-items:center;gap:11px;padding:6px 0;border-top:1px solid var(--line)}
.model .row:first-child{border-top:0}
.dot{width:11px;height:11px;border-radius:50%;flex:none;box-shadow:0 0 0 4px color-mix(in srgb,currentColor 18%,transparent)}
.dot.solid{background:var(--ok);color:var(--ok)}
.dot.needs-work{background:var(--bad);color:var(--bad);animation:dotpulse 1.7s ease-in-out infinite}
@keyframes dotpulse{0%,100%{box-shadow:0 0 0 4px color-mix(in srgb,var(--bad) 18%,transparent)}50%{box-shadow:0 0 0 7px color-mix(in srgb,var(--bad) 8%,transparent)}}
.dot.unseen{background:var(--line);color:var(--line);box-shadow:none}
.lbl{flex:1}.st{color:var(--muted);font-size:.85rem}
#record{margin-top:12px;white-space:pre-wrap;font-family:ui-monospace,monospace;font-size:12px;color:var(--muted)}
.card{margin:18px 0}.card .meta{color:var(--muted);font-size:.9rem;margin-bottom:.7em}
.badge{float:right;font-size:.8rem;font-weight:650}.badge.ok{color:var(--ok)}.badge.bad{color:var(--bad)}
.attention{margin-top:14px;padding:11px 15px;border-radius:11px;font-size:.92rem;
  background:color-mix(in srgb,var(--bad) 12%,transparent)}
.attention.good{background:color-mix(in srgb,var(--ok) 12%,transparent)}
.missed{margin-top:9px;color:var(--muted);font-size:.85rem}

/* ---- the skill map: the real prerequisite graph, lit by mastery (the signature) ---- */
.se01-map{width:100%;height:auto;display:block;margin:6px 0}
.se01-map .edge{fill:none;stroke:var(--line);stroke-width:2;transition:stroke .4s}
.se01-map .edge.lit{stroke:color-mix(in srgb,var(--ok) 60%,var(--line))}
.se01-map .node circle{stroke-width:2.5;transition:fill .45s,stroke .45s;transform-box:fill-box;transform-origin:center}
.se01-map .node.n-solid circle{fill:color-mix(in srgb,var(--ok) 22%,var(--surface));stroke:var(--ok)}
.se01-map .node.n-needs-work circle{fill:color-mix(in srgb,var(--bad) 20%,var(--surface));stroke:var(--bad)}
.se01-map .node.n-needs-work circle{animation:mapPulse 1.7s ease-in-out infinite}
.se01-map .node.n-unseen circle{fill:var(--surface-2);stroke:var(--line);stroke-dasharray:3 3}
.se01-map text{font-family:var(--sans);font-size:10.5px;font-weight:600;fill:var(--ink)}
.se01-map .node{animation:nodeIn .5s both cubic-bezier(.2,.8,.2,1)}
.map-legend{display:flex;gap:16px;flex-wrap:wrap;color:var(--muted);font-size:.8rem;margin-top:2px}
.map-legend .dot{width:9px;height:9px}
@keyframes nodeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes mapPulse{0%,100%{stroke-width:2.5}50%{stroke-width:4}}

@media (prefers-reduced-motion:reduce){
  *{animation:none!important;transition:none!important;scroll-behavior:auto!important}
}
@media (max-width:520px){ main{padding:28px 16px 80px} .hero{padding:24px 20px} }
`;

/** Inline SVG hero graph: drifting nodes + links, with a pulse travelling back along one edge. */
export function graphHero(): string {
  return `<svg class="hero-graph" viewBox="0 0 340 190" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g class="hero-float">
      <line class="lnk" x1="250" y1="60" x2="180" y2="130"/>
      <line class="lnk" x1="180" y1="130" x2="90" y2="110"/>
      <line class="lnk" x1="250" y1="60" x2="300" y2="128"/>
      <line class="lnk" x1="90" y1="110" x2="60" y2="48"/>
      <circle class="halo" cx="250" cy="60" r="17"/>
      <circle class="node" cx="250" cy="60" r="7"/>
      <circle class="node dim" cx="180" cy="130" r="5.5"/>
      <circle class="node dim" cx="90" cy="110" r="5.5"/>
      <circle class="node dim" cx="300" cy="128" r="4.5"/>
      <circle class="node dim" cx="60" cy="48" r="4.5"/>
    </g>
    <g class="hero-float b"><circle class="pulse pulse-path" r="3.5"/></g>
  </svg>`;
}

/** Client-side renderer for the real skill map. Injected as a <script> into the student and
 *  teacher pages; call window.se01Graph(mountEl, skillGraph, {skillId: status}). Lays skills
 *  out foundations→advanced by prerequisite depth and colours each node by mastery. */
export const GRAPH_JS = `
window.se01Graph=function(mount,graph,status){
  const S=graph.skills,by={};S.forEach(s=>by[s.id]=s);
  const depth={},calc=(id,seen)=>{if(id in depth)return depth[id];if(seen.has(id))return 0;seen.add(id);
    const ps=(by[id].prerequisiteIds||[]).filter(p=>by[p]);depth[id]=ps.length?1+Math.max.apply(0,ps.map(p=>calc(p,seen))):0;return depth[id];};
  S.forEach(s=>calc(s.id,new Set()));
  const maxD=Math.max(0,...S.map(s=>depth[s.id])),cols={};
  S.forEach(s=>{(cols[depth[s.id]]=cols[depth[s.id]]||[]).push(s.id);});
  const colN=maxD+1,W=620,colW=W/colN,maxRows=Math.max(...Object.values(cols).map(a=>a.length)),H=Math.max(150,maxRows*96),pos={};
  for(let c=0;c<colN;c++){(cols[c]||[]).forEach((id,i,a)=>{pos[id]={x:c*colW+colW/2,y:(i+1)/(a.length+1)*H};});}
  const NS="http://www.w3.org/2000/svg",el=(t,a)=>{const n=document.createElementNS(NS,t);for(const k in a)n.setAttribute(k,a[k]);return n;};
  const svg=el("svg",{class:"se01-map",viewBox:"0 0 "+W+" "+H,role:"img","aria-label":"skill map"});
  S.forEach(s=>(s.prerequisiteIds||[]).forEach(p=>{if(!pos[p])return;const a=pos[p],b=pos[s.id],mx=(a.x+b.x)/2;
    svg.appendChild(el("path",{class:"edge"+(status[p]==="solid"?" lit":""),d:"M"+a.x+" "+a.y+" C "+mx+" "+a.y+" "+mx+" "+b.y+" "+b.x+" "+b.y}));}));
  S.forEach((s,i)=>{const p=pos[s.id],st=status[s.id]||"unseen",g=el("g",{class:"node n-"+st});g.style.animationDelay=(i*0.06)+"s";
    g.appendChild(el("circle",{cx:p.x,cy:p.y,r:17}));
    const words=(by[s.id].label||s.id).split(" ").slice(0,4),t=el("text",{x:p.x,y:p.y+32,"text-anchor":"middle"});
    const l1=words.slice(0,2).join(" "),l2=words.slice(2).join(" ");
    const s1=el("tspan",{x:p.x});s1.textContent=l1;t.appendChild(s1);
    if(l2){const s2=el("tspan",{x:p.x,dy:"1.15em"});s2.textContent=l2;t.appendChild(s2);}
    g.appendChild(t);svg.appendChild(g);});
  mount.innerHTML="";mount.appendChild(svg);
};`;
