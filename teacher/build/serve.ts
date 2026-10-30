// Build the chapter demos and serve them on localhost — a fully offline, no-internet way to
// show the app. Over http://localhost, IndexedDB works, so student progress persists.
//   npm run serve     (then open the printed URL)

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { join, extname, resolve, normalize } from 'node:path';
import { buildDemo } from './demo.ts';
import { buildTeacher } from './teacher.ts';

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
  const links =
    CHAPTERS.map((c) => `<a href="/${c.file}">▶ ${c.title} <span style="opacity:.6;font-weight:400">· student</span></a>`).join('\n') +
    `\n<a href="/teacher.html">▣ Teacher dashboard <span style="opacity:.6;font-weight:400">· progress on this device</span></a>`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>SE-01 demos</title>
<style>:root{color-scheme:light dark}body{font:17px/1.6 system-ui,sans-serif;max-width:640px;margin:56px auto;padding:0 20px}
h1{font-size:1.6rem}p{opacity:.75}a{display:block;padding:14px 18px;margin:10px 0;border:1px solid #8884;border-radius:12px;
text-decoration:none;color:inherit;font-weight:600}a:hover{border-color:#888}</style></head>
<body><h1>SE-01 — offline adaptive learning</h1>
<p>Pick a chapter. Everything runs locally; answer a question wrong to see it step back to a prerequisite.</p>
${links}</body></html>`;
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
