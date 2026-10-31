# Compiler

The default SE-01 compiler builds Markdown into an offline reader. For chapters with `chapter.config.json`, it also injects the chapter learning interface and builds every declared destination. See the [chapter guide](../docs/learning-engine.md) for the configuration and mount points.

```sh
npm install
node compiler/cli.ts content/reader-demo/chapter.md
npm run build -- content/reader-demo dist/learning
npm run serve:learning
```

The first command writes the chapter to its `out/` folder. For a standalone Markdown file, `node compiler/cli.ts file.md` writes HTML next to it; `--watch` starts a local preview. Chapter-folder watch is not yet supported. Node 24 or later is required.

## Compiler adapters

An alternate trusted module may be selected with `--compiler ./adapter.js` on the compile command, or as the fourth build argument:

```sh
npm run build -- myFolder dist/myChapter ./adapter.js
```

An adapter default-exports an object with `name` and `compile({ lessonPath, bundleDir })`, returning a complete HTML document. Paths are absolute. The learning build verifies that each declared `data-learning-*` mount survives exactly once, and rejects external or unembedded assets. It then injects the same question, profile, and routing interface independent of the renderer. Compile only trusted source and adapter code.

## In-house renderer

The renderer uses vendored Marked 16.4.2 (MIT; see [license](vendor/MARKED-LICENSE.md)) for GitHub-flavoured Markdown. It embeds local PNG, JPEG, GIF, WebP and SVG images. Existing `![label](quiz/1.json)` quizzes remain supported for the older chapter format. External images stay external in ordinary output and are rejected by learning builds. Raw HTML is retained; do not compile untrusted Markdown.

Standalone lessons have light/dark and accent controls. Chapter output retains these controls alongside the quiz interface. `data-se01-quiz` is a separate legacy placeholder, not the chapter engine's `data-learning-quiz` mount.
