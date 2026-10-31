# Compiler

```text
compiler/
  engine.ts   select the active engine here
  cli.ts      compile command
  index.ts    compileMarkdown() and loadCompiler() — public entry point
  types.ts    Markdown input and compiler contract
  mr-md.ts    working mr-md adapter
```


Install the command once from the repository root:

```sh
bun link
compile examples/hello.md
compile examples/fractions.md -w
```

Compilation writes an HTML file beside the Markdown. Watch mode uses the active engine's live server and prints its URL; stop it with Ctrl+C. `--watch` and `-watch` also work. Bun is needed for the command and mr-md. The rest of this project still uses Node 24 for its existing scripts. Examples are local and ignored by Git.

To switch engines, change the import in `engine.ts` to an adapter implementing the contract below. Implement `watch(input)` to support live preview; otherwise watch mode reports that it is unavailable. This selection applies to both the command and the teacher build.

The teacher build validates a chapter, asks a compiler to turn its Markdown lesson into HTML, and injects the offline student runtime. The default compiler is mr-md. A compiler runs on the teacher's machine; students receive the resulting HTML and do not need the compiler or an internet connection.

A compiler is a JavaScript or TypeScript module with a default export implementing `MarkdownCompiler` from `compiler/index.ts`:

```js
export default {
  name: 'my-compiler',
  async compile({ lessonPath, bundleDir }) {
    // Read lessonPath and any referenced files under bundleDir, then render them.
    return '<!doctype html><html><body>Rendered lesson</body></html>';
  },
};
```

`lessonPath` and `bundleDir` are absolute paths. Return a complete HTML document with its styles, scripts, and other resources embedded for offline use. The build writes `chapter.html` (or the lesson filename with an `.html` extension) in the output directory. The compiler must throw on failure; an empty result fails the build. Modules execute with the teacher's local permissions, so only load trusted compiler code.

Select an adapter at build time:

```sh
npm run build -- content/fractions dist ./my-compiler.js
```

Omit the last argument to use mr-md. Code calling `buildChapter` can instead pass a `MarkdownCompiler` as its third argument. An adapter can wrap a library, command, or other compiler; it is responsible for resolving Markdown extensions and embedding any assets it needs.

The current mr-md output can include external font and KaTeX stylesheet links, so it is not yet fully self-contained. Offline typography and math styling need to be bundled before treating the output as a complete offline pack.

## Quiz compatibility

The compiler contract only covers Markdown to HTML. The current student runtime observes mr-md's `.bk-quiz` markup and click behavior. A different compiler can render lessons, but its quizzes will only produce adaptive evidence if it emits compatible markup and behavior. Supporting other quiz formats requires a student-side adapter or a shared quiz contract; merely returning HTML does not provide that integration. Test the generated document offline and verify its interactive features before distributing it.

## Mount points for the future SE-01 quiz engine

Put a mount on its own line in the lesson:

```html
<div data-se01-quiz="fractions-1"></div>
```

IDs start with a letter or digit and may contain letters, digits, `.`, `_`, and `-`. Each ID must occur only once in a lesson. The compiler checks that every declared mount appears exactly once in the rendered HTML; a compiler adapter that strips or duplicates it fails with an error. Markers in fenced code examples are ignored. See [the example](quiz-mount-example.md).

The mount is an empty placeholder. The future engine must find `[data-se01-quiz]`, resolve its ID to quiz data, and render into it. There is currently no custom engine or quiz-ID-to-data validation. The ordinary compile command and mr-md watch mode do not inject such an engine. Existing mr-md quizzes and the SE-01 student runtime continue to work as before. For background and the remaining integration work see [the integration design](../docs/custom-quiz-integration.md).

For local experiments, a lesson directory may include a trusted `se01-preview.js` sidecar. When present, `compile lesson.md -w` injects that script into a local preview and reloads when the lesson or sidecar changes. This sidecar is for preview only: ordinary compilation and chapter builds do not include it. A local ignored playground can provide such a sidecar for experimentation.
