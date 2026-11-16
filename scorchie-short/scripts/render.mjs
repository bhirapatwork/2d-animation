// usage: node scripts/render.mjs <out.mp4> [scale=1.3333] [from-to] [concurrency=2]
// Renders ScorchieShort with the local headless Chromium (software GL: no GPU in the cloud box), h264 crf 16.
import fs from "node:fs";
import path from "node:path";
if (process.env.REMOTION_TMP) { fs.mkdirSync(process.env.REMOTION_TMP, { recursive: true }); process.env.TEMP = process.env.TMP = process.env.TMPDIR = process.env.REMOTION_TMP; }
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
const [out, scale = String(4 / 3), range, conc = "2"] = process.argv.slice(2);
const browserExecutable = process.env.BROWSER || "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
const chromiumOptions = { gl: process.env.GL || "swangle" };
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts"), publicDir: path.resolve("public") });
const composition = await selectComposition({ serveUrl, id: process.env.COMP || "ScorchieShort", browserExecutable, chromiumOptions });
const frameRange = range ? range.split("-").map(Number) : null;
const t0 = Date.now();
let last = 0;
await renderMedia({
  composition, serveUrl, codec: "h264", crf: 16, outputLocation: out, scale: Number(scale), browserExecutable, chromiumOptions,
  concurrency: Number(conc), frameRange, timeoutInMilliseconds: 300000, muted: false,
  onProgress: ({ renderedFrames, progress }) => {
    const now = Date.now();
    if (now - last > 30000) { last = now; console.log(`frames ${renderedFrames}  ${(progress * 100).toFixed(1)}%  ${((now - t0) / 1000 / Math.max(1, renderedFrames)).toFixed(2)} s/frame`); }
  },
});
console.log("done", ((Date.now() - t0) / 1000).toFixed(0) + "s");
