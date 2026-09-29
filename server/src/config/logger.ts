// Minimal structured JSON logger. Swap for pino/winston if preferred.
type Level = "debug" | "info" | "warn" | "error";
import { env } from "@config/env";

const LEVELS: Record<Level, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function emit(level: Level, message: string, extra?: unknown): void {
  const threshold = LEVELS[env.logLevel as Level] ?? 20;
  if (LEVELS[level] < threshold) return;
  const base = {
    ts: new Date()
      .toLocaleString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })
      .replace(",", " -"),
    level,
    msg: message,
  };
  if (extra && typeof extra === "object") {
    process.stdout.write(JSON.stringify({ ...base, ...(extra as Record<string, unknown>) }) + "\n");
  } else {
    process.stdout.write(JSON.stringify(base) + "\n");
  }
}

export const logger = {
  debug: (msg: string, extra?: unknown) => emit("debug", msg, extra),
  info: (msg: string, extra?: unknown) => emit("info", msg, extra),
  warn: (msg: string, extra?: unknown) => emit("warn", msg, extra),
  error: (msg: string, extra?: unknown) => emit("error", msg, extra),
};
