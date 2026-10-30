// Turn a source file into plain text for the LLM. PDFs are extracted with unpdf (pure JS,
// no system deps); .txt/.md are read as-is. Free Zen models are text-only, so we never send
// the PDF bytes.

import { readFileSync } from 'node:fs';
import { extractText, getDocumentProxy } from 'unpdf';

export async function extractSource(path: string): Promise<string> {
  if (path.toLowerCase().endsWith('.pdf')) {
    const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
    const { text } = await extractText(pdf, { mergePages: true });
    const merged = Array.isArray(text) ? text.join('\n\n') : text;
    if (!merged.trim()) throw new Error(`No extractable text in ${path} (scanned image PDF?).`);
    return merged;
  }
  return readFileSync(path, 'utf8'); // .txt / .md source
}
