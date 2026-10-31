# SE-01 — Offline Adaptive Learning

The in-house compiler turns a chapter folder into offline lesson pages with questions, a six-skill profile and a recommended next lesson. Students can read, answer and revisit their progress on the same device. The reader includes light and dark themes and an accent picker.

## Demo

A Class 9 "Journey Inside the Atom" chapter, built with `npm run build:e2e`: read the chapter, answer the chapter check (including a deliberately wrong answer to show the feedback), complete the chapter, and see the six-skill radar profile route to a personalised depth.

<video src="docs/media/demo.mp4" controls width="100%"></video>

(If the player above doesn't render, watch/download [docs/media/demo.mp4](docs/media/demo.mp4) directly.)

```sh
npm install
npm run build:learning
npm run serve:learning
# Open http://127.0.0.1:4322
```

Try the example in [content/reader-demo](content/reader-demo/chapter.config.json): read the lesson, answer the four questions, and select **Complete chapter**. A pop-up opens with the profile and recommendation reflect the answers saved on the device. `chapter.config.json` defines the questions, six axes, completion and routes; Markdown files contain the lesson and mount points. See the [chapter guide](docs/learning-engine.md) and [compiler contract](compiler/README.md).

`npm test` runs the tests; `npm run typecheck` checks TypeScript. Node 24 or later is required. Compilers can be selected as adapters, but a learning build requires them to preserve the chapter's markers and embed local assets. The older `content/fractions` manifest format and its runtime remain supported.

Offline practice stores answers locally, and answer keys ship with the pages. This is not secure examination or learner authentication. Compile trusted Markdown: raw HTML is permitted.

## GitHub Pages

This repository includes `.github/workflows/deploy-pages.yml` to build and deploy `dist/learning` to GitHub Pages on pushes to `main` (or `master`) and on manual runs.

To enable it:
1. In GitHub, open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push to `main` or run the **Deploy to GitHub Pages** workflow manually from **Actions**.
