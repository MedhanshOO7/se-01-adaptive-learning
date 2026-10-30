// Build the chapter demos and serve them on localhost — a fully offline, no-internet way to
// show the app. Over http://localhost, IndexedDB works, so student progress persists.
//   npm run serve     (then open the printed URL)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve, normalize } from 'node:path';
import { buildDemo } from './demo.ts';
import { buildTeacher } from './teacher.ts';
import { THEME_CSS, graphHero } from './theme.ts';

const DIST = resolve('dist');
const PORT = Number(process.env.PORT ?? 4321);

// Every chapter bundle to publish locally, in menu order.
const CHAPTERS = [
  { title: 'Equivalent fractions (Grade 6)', bundle: 'content/fractions', file: 'demo.html' },
  { title: 'Structure of the Atom (Grade 9)', bundle: 'content/structure-of-the-atom', file: 'atom-demo.html' },
];

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

function indexPage(): string {
  const tiles =
    CHAPTERS.map((c, i) => `  <a class="tile" href="/${c.file}">
    <span class="ic">${i + 1}</span>
    <span><span class="t">${c.title}</span><br><span class="d">Learn &amp; practise — adapts when you miss a concept</span></span>
    <span class="go">→</span>
  </a>`).join('\n') +
    `\n  <a class="tile teacher" href="/teacher.html">
    <span class="ic">▦</span>
    <span><span class="t">Teacher dashboard</span><br><span class="d">See each skill's progress on this device</span></span>
    <span class="go">→</span>
  </a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>SE-01 — offline adaptive learning</title>
<style>${THEME_CSS}</style></head>
<body><main>
<section class="hero">${graphHero()}
  <p class="eyebrow">Offline adaptive learning</p>
  <h1>Learning that steps back when you get stuck</h1>
  <p>Miss a concept and it quietly moves to what comes before it — fully on your device, no internet needed.</p>
</section>
<nav class="menu">
${tiles}
</nav>
</main></body></html>`;
}

async function main() {
  console.log('• Building demos…');
  for (const c of CHAPTERS) await buildDemo(resolve(c.bundle), join(DIST, c.file));
  await buildTeacher(CHAPTERS, join(DIST, 'teacher.html'));

  createServer(async (req, res) => {
    const path = decodeURIComponent((req.url ?? '/').split('?')[0]);
    if (path === '/' || path === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(indexPage());
      return;
    }
    const file = normalize(join(DIST, path));
    if (!file.startsWith(DIST)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    try {
      const data = await readFile(file);
      res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  }).listen(PORT, () => {
    console.log(`\n  ✓ SE-01 running — open:  http://localhost:${PORT}\n    (fully offline · Ctrl+C to stop)\n`);
  });
}

main();
