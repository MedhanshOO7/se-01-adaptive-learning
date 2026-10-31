// Opt-in preview for lessons accompanied by se01-preview.js. The sidecar is
// trusted local code; it is never added to normal compiled or chapter output.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { compileMarkdown } from './index.ts';
import type { CompileInput, MarkdownCompiler } from './types.ts';

export function injectPreview(html: string, script: string): string {
  // Avoid interpreting a closing script tag in the sidecar as HTML markup.
  const safe = script.replace(/<\/script/gi, '<\\/script');
  const payload = `<script>${safe}</script><script>setInterval(async()=>{try{const r=await fetch('/__se01_revision');const v=await r.text();if(window.__se01Revision && window.__se01Revision!==v)location.reload();window.__se01Revision=v}catch{}},1000)</script>`;
  return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, `${payload}</body>`) : html + payload;
}

export async function watchWithPreview(input: CompileInput, compiler: MarkdownCompiler): Promise<void> {
  const scriptPath = join(input.bundleDir, 'se01-preview.js');
  const revision = async () => {
    const [lesson, script] = await Promise.all([stat(input.lessonPath), stat(scriptPath)]);
    return `${lesson.mtimeMs}-${lesson.size}-${script.mtimeMs}-${script.size}`;
  };
  // Fail early on bad lesson or sidecar rather than starting a broken preview.
  await compileMarkdown(input, compiler);
  await readFile(scriptPath, 'utf8');
  const port = Number(process.env.PORT || 4173);
  const server = createServer(async (req, res) => {
    try {
      const path = new URL(req.url || '/', 'http://localhost').pathname;
      if (path === '/__se01_revision') {
        res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' });
        res.end(await revision());
      } else if (path === '/') {
        const [html, script] = await Promise.all([compileMarkdown(input, compiler), readFile(scriptPath, 'utf8')]);
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
        res.end(injectPreview(html, script));
      } else {
        res.writeHead(404); res.end('Not found');
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`Preview error: ${err instanceof Error ? err.message : String(err)}`);
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      console.log(`Quiz preview: http://127.0.0.1:${port}`);
    });
    server.once('close', resolve);
  });
}
