// node build.mjs   -> bundles the Player + Captions into ../static/player.js
import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));

await esbuild.build({
  entryPoints: [path.join(here, "src/player-entry.jsx")],
  bundle: true,
  format: "iife",
  outfile: path.join(here, "..", "static", "player.js"),
  jsx: "automatic",
  loader: { ".js": "jsx" },
  define: { "process.env.NODE_ENV": '"production"', global: "window" },
  minify: true,
  target: ["es2020"],
  logLevel: "info",
});
console.log("built static/player.js");
