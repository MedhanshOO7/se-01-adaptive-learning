import { readFile } from 'node:fs/promises';

// A deliberately small authoring contract: a marker occupies its own line and has
// one quoted ID. Ignore examples inside fenced code blocks.
function sourceMounts(markdown: string): string[] {
  const ids: string[] = [];
  let fence: { char: string; length: number } | undefined;
  for (const line of markdown.split(/\r?\n/)) {
    const delimiter = line.match(/^ {0,3}(`{3,}|~{3,})(.*)$/);
    if (delimiter) {
      const chars = delimiter[1];
      if (!fence) fence = { char: chars[0], length: chars.length };
      else if (chars[0] === fence.char && chars.length >= fence.length && !delimiter[2].trim()) fence = undefined;
      continue;
    }
    if (fence) continue;
    const match = line.match(/^ {0,3}<div\s+data-se01-quiz=(['"])([a-zA-Z0-9][a-zA-Z0-9._-]*)\1\s*><\/div>\s*$/);
    if (match) ids.push(match[2]);
  }
  return ids;
}

/** Ensure compiler output retains each declared quiz mount. The engine owns its contents. */
export async function verifyQuizMounts(lessonPath: string, html: string, compilerName: string): Promise<void> {
  const expected = sourceMounts(await readFile(lessonPath, 'utf8'));
  if (!expected.length) return;
  const counts = new Map<string, number>();
  for (const id of expected) counts.set(id, (counts.get(id) ?? 0) + 1);
  for (const [id, count] of counts) {
    if (count !== 1) throw new Error(`Duplicate quiz mount ID "${id}" in lesson.`);
    // IDs have a restricted alphabet, making this safe to quote in a regex.
    const escaped = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const tag = new RegExp(`<div\\b[^>]*\\bdata-se01-quiz\\s*=\\s*(["'])${escaped}\\1[^>]*>`, 'gi');
    const found = Array.from(html.matchAll(tag)).length;
    if (found !== 1) throw new Error(`Compiler "${compilerName}" must preserve quiz mount "${id}" exactly once; found ${found}.`);
  }
}
