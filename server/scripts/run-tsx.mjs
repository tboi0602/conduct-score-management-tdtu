import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const shim = resolve("scripts/windows-tsx-user-shim.cjs");
const inherited = process.env.NODE_OPTIONS?.trim();
const nodeOptions = [inherited, `--require=${shim}`].filter(Boolean).join(" ");
const result = spawnSync(
  process.execPath,
  [resolve("node_modules/tsx/dist/cli.mjs"), ...process.argv.slice(2)],
  { stdio: "inherit", env: { ...process.env, NODE_OPTIONS: nodeOptions } },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
