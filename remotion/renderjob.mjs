// node renderjob.mjs <props.json> <output.mp4>
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFileSync, existsSync, writeFileSync, mkdirSync, copyFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const [, , propsPath, outPath] = process.argv;
if (!propsPath || !outPath) { console.error("usage: renderjob.mjs props.json out.mp4"); process.exit(2); }

const inputProps = JSON.parse(readFileSync(propsPath, "utf-8"));

const BUNDLE = path.join(here, ".bundle");
const stamp = path.join(BUNDLE, ".ok");

// Stamp the bundle with the newest source mtime, so editing a template
// re-bundles instead of silently exporting the old look.
const srcDir = path.join(here, "src");
const srcStamp = String(readdirSync(srcDir).reduce(
  (m, f) => Math.max(m, statSync(path.join(srcDir, f)).mtimeMs), 0));

let serveUrl = BUNDLE;
if (!existsSync(stamp) || readFileSync(stamp, "utf-8") !== srcStamp) {
  console.error("bundling (sources changed)…");
  serveUrl = await bundle({ entryPoint: path.join(here, "src/index.js"), outDir: BUNDLE });
  writeFileSync(stamp, srcStamp);
}

// The bundle caches its own public/ from build time. `src` is a bare filename
// (staticFile), so make sure the current job's video is present in the served
// public dir — no HTTP, no separate server to keep alive.
if (inputProps.src && !/^https?:/.test(inputProps.src)) {
  const name = inputProps.src.replace(/^\/?/, "");
  const from = path.join(here, "public", name);
  const to = path.join(BUNDLE, "public", name);
  mkdirSync(path.dirname(to), { recursive: true });
  if (!existsSync(from)) {
    console.error(`staged video missing: ${from}`);
    process.exit(3);
  }
  if (!existsSync(to)) copyFileSync(from, to);
}

const composition = await selectComposition({ serveUrl, id: "Captions", inputProps });

// Export settings come through the props so the UI can offer them.
const quality = inputProps.export || {};
const scale = quality.height === 720 ? 720 / (inputProps.height || 1920) : 1;
const crf = quality.crf ?? 20;

// The render is the slowest thing the app does. Write progress next to the
// props file (that's the job dir) so the server can report a real percentage
// instead of leaving the button on "Rendering…" for two minutes.
const progressFile = path.join(path.dirname(propsPath), "render.json");
const writeProgress = (pct, stage) => {
  try { writeFileSync(progressFile, JSON.stringify({ pct, stage })); } catch {}
};
writeProgress(0, "starting");

await renderMedia({
  composition,
  serveUrl,
  codec: "h264",
  outputLocation: outPath,
  inputProps,
  crf,
  scale,
  x264Preset: "faster",
  concurrency: 4,
  chromiumOptions: { gl: "angle" },
  onProgress: ({ progress, stitchStage }) => {
    writeProgress(Math.round(progress * 100),
      stitchStage === "muxing" ? "adding audio" : "drawing captions");
  },
});

writeProgress(100, "done");
console.error("done -> " + outPath);
