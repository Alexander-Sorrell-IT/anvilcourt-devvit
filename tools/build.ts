#!/usr/bin/env -S node --experimental-strip-types

// Bundles the server to dist/server. Anvil Court is a background mod tool with no
// custom-post UI, so there is no client build.
//
// build.ts [--minify] [--watch]

import fs from "node:fs";
import type { BuildOptions } from "esbuild";
import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const serverOpts: BuildOptions = {
  bundle: true,
  logLevel: "info",
  metafile: true,
  sourcemap: "linked",
  target: "es2023",
  entryPoints: ["src/server/index.ts"],
  format: "cjs",
  outdir: "dist/server",
  platform: "node",
};

if (watch) {
  const serverCtx = await esbuild.context(serverOpts);
  await serverCtx.watch();
} else {
  const server = await esbuild.build(serverOpts);
  if (server.metafile) {
    fs.writeFileSync("dist/server.meta.json", JSON.stringify(server.metafile));
  }
}
