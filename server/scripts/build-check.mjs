import { spawnSync } from "node:child_process";
import { rmSync } from "node:fs";
import { resolve } from "node:path";

const output = resolve(".build-check");
const compiler = resolve("node_modules", "typescript", "bin", "tsc");

rmSync(output, { force: true, recursive: true });
try {
  const result = spawnSync(
    process.execPath,
    [compiler, "-p", "tsconfig.json", "--outDir", output, "--incremental", "false"],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(output, { force: true, recursive: true });
}
