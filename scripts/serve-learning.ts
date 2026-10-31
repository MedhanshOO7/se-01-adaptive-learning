import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root=resolve(process.argv[2]??'dist/learning');
const port=Number(process.env.PORT??4322);
await readFile(resolve(root,'chapter.html')); // Build first; fail clearly if output is absent.
createServer(async(req,res)=> {
  try {
    const url=new URL(req.url??'/','http://localhost');
    const path=decodeURIComponent(url.pathname==='/'?'/chapter.html':url.pathname);
    const file=resolve(root,'.'+path);
    if(!file.startsWith(root+sep)||!['.html','.png'].includes(extname(file))) {res.writeHead(404);res.end('Not found');return;}
    const data=await readFile(file);
    res.writeHead(200,{'Content-Type':extname(file)==='.html'?'text/html; charset=utf-8':'image/png','Cache-Control':'no-store'});res.end(data);
  } catch {res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Learning demo: http://127.0.0.1:${port} (Ctrl+C to stop)`));
