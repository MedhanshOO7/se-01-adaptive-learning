/** Teacher-side Markdown-to-HTML compiler contract. Paths are absolute. */
export interface CompileInput {
  lessonPath: string;
  bundleDir: string;
}

export interface MarkdownCompiler {
  name: string;
  /** Return rendered HTML. The adapter is responsible for its assets. */
  /** Start a live server for this lesson, if supported by the engine. */
  watch?(input: CompileInput): Promise<void>;
  compile(input: CompileInput): Promise<string> | string;
}

