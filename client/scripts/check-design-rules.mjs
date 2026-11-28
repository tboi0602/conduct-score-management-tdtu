#!/usr/bin/env node
/**
 * Design-rule checker for the client (see client/AGENTS.md and root AGENTS.md).
 *
 * Usage:
 *   node scripts/check-design-rules.mjs                 # scan src/
 *   node scripts/check-design-rules.mjs src/components  # scan given paths
 *   node scripts/check-design-rules.mjs --changed main  # only files changed vs a git ref
 *   node scripts/check-design-rules.mjs --rule raw-button,hardcoded-text
 *   node scripts/check-design-rules.mjs --json
 *   node scripts/check-design-rules.mjs --warn-as-error
 *
 * Suppress a finding:
 *   // design-ignore-next-line raw-button        (or no rule name = all rules)
 *   {/* design-ignore-next-line raw-input *\/}
 *   // design-ignore-file hardcoded-text         (anywhere in the file)
 *
 * Exit code: 1 when any error-level finding exists (or any warning with --warn-as-error).
 */
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CLIENT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(CLIENT_ROOT, "src");
const EXTENSIONS = new Set([".ts", ".tsx"]);

const VI_CHARS =
  /[ạảãầấậẩẫằắặẳẵẹẻẽềếệểễịỉĩọỏõồốộổỗờớợởỡụủũừứựửữỳỵỷỹđĐăâêôơưĂÂÊÔƠƯ]/;
const UI_DIR = "src/components/ui/";
const I18N_DIR = "src/i18n/";
const METADATA_FILES = new Set(["src/app/layout.tsx", "src/app/manifest.ts"]);

/** @typedef {{rule:string, severity:"error"|"warn", file:string, line:number, message:string, snippet:string}} Finding */

const RULES = {
  "hardcoded-text": {
    severity: "error",
    doc: "User-facing text must come from src/i18n (AGENTS.md).",
  },
  "locale-ternary": {
    severity: "error",
    doc: 'Do not branch on locale for text (`locale === "vi" ? ... : ...`); use i18n keys.',
  },
  "raw-button": {
    severity: "error",
    doc: "Use <Button> or <IconButton> from components/ui instead of a native <button>.",
  },
  "raw-input": {
    severity: "error",
    doc: "Use <Input> from components/ui instead of a native text <input>.",
  },
  "native-select": {
    severity: "error",
    doc: "Use <CustomSelect> instead of a native <select>.",
  },
  "native-title": {
    severity: "error",
    doc: "Do not use the native `title` attribute; use the shared <Tooltip>.",
  },
  "native-dialog": {
    severity: "error",
    doc: "Use <ConfirmDialog>/<Modal> instead of window.confirm/alert/prompt.",
  },
  "inline-query-key": {
    severity: "error",
    doc: "Query keys must come from src/lib/query-keys.ts (queryKeys).",
  },
  "fetch-in-component": {
    severity: "error",
    doc: "API calls belong in src/services; data fetching uses TanStack Query in hooks.",
  },
  "role-hardcode": {
    severity: "error",
    doc: "Authorization is permission-only: use access.can(...) / isStudent, never compare role codes.",
  },
  "debounce-delay": {
    severity: "warn",
    doc: "Search inputs use useDebounce with the standard 500 ms delay.",
  },
  "generic-error-toast": {
    severity: "warn",
    doc: "Error toasts should show the server message (useApi / extractServerErrorMessage), not a client-made sentence.",
  },
  "emoji-icon": {
    severity: "warn",
    doc: "Use lucide-react icons, not emoji, as interface icons.",
  },
};

// ---------------------------------------------------------------- CLI

const args = process.argv.slice(2);
const opts = { json: false, warnAsError: false, changed: null, rules: null, paths: [] };
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === "--json") opts.json = true;
  else if (a === "--warn-as-error") opts.warnAsError = true;
  else if (a === "--changed") opts.changed = args[++i] ?? "main";
  else if (a === "--rule" || a === "--rules") opts.rules = new Set(args[++i].split(","));
  else if (a === "--list-rules") {
    for (const [name, r] of Object.entries(RULES)) console.log(`${name.padEnd(20)} ${r.severity.padEnd(5)} ${r.doc}`);
    process.exit(0);
  } else if (a === "-h" || a === "--help") {
    console.log(readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0]);
    process.exit(0);
  } else opts.paths.push(a);
}

// ---------------------------------------------------------------- file collection

function walk(dir, out) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const full = path.join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, out);
    else if (EXTENSIONS.has(path.extname(entry)) && !entry.endsWith(".d.ts")) out.push(full);
  }
  return out;
}

function collectFiles() {
  if (opts.changed) {
    const out = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", opts.changed, "--", "."], {
      cwd: CLIENT_ROOT,
      encoding: "utf8",
    });
    const repoRoot = execFileSync("git", ["rev-parse", "--show-toplevel"], { cwd: CLIENT_ROOT, encoding: "utf8" }).trim();
    return out
      .split(/\r?\n/)
      .filter(Boolean)
      .map((p) => path.join(repoRoot, p))
      .filter((p) => p.startsWith(SRC) && EXTENSIONS.has(path.extname(p)) && existsSync(p));
  }
  const targets = opts.paths.length ? opts.paths.map((p) => path.resolve(process.cwd(), p)) : [SRC];
  return targets.flatMap((t) => (statSync(t).isDirectory() ? walk(t, []) : [t]));
}

// ---------------------------------------------------------------- helpers

/** Replace comments with spaces (keeps line/column positions) so rules ignore commented code. */
function stripComments(src) {
  let out = "";
  let i = 0;
  let quote = null;
  while (i < src.length) {
    const c = src[i];
    const n = src[i + 1];
    if (quote) {
      out += c;
      if (c === "\\") {
        out += n ?? "";
        i += 2;
        continue;
      }
      if (c === quote) quote = null;
      i++;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      quote = c;
      out += c;
      i++;
      continue;
    }
    if (c === "/" && n === "/") {
      while (i < src.length && src[i] !== "\n") (out += " "), i++;
      continue;
    }
    if (c === "/" && n === "*") {
      while (i < src.length && !(src[i] === "*" && src[i + 1] === "/")) (out += src[i] === "\n" ? "\n" : " "), i++;
      out += "  ";
      i += 2;
      continue;
    }
    out += c;
    i++;
  }
  return out;
}

function lineOf(src, index) {
  let line = 1;
  for (let i = 0; i < index; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}

/** Yields JSX opening tags: { name, attrs, index }. Tracks braces so `=>` inside attrs is safe. */
function* jsxTags(src) {
  const re = /<([A-Za-z][\w.]*)(?=[\s/>])/g;
  let m;
  while ((m = re.exec(src))) {
    const start = m.index;
    // Skip TS generics like `useState<string>` / `Array<T>`: previous non-space char is an identifier char.
    const prev = src.slice(Math.max(0, start - 1), start);
    if (/[\w)\]]/.test(prev)) continue;
    let depth = 0;
    let i = re.lastIndex;
    let quote = null;
    for (; i < src.length; i++) {
      const c = src[i];
      if (quote) {
        if (c === quote && src[i - 1] !== "\\") quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === "`") quote = c;
      else if (c === "{") depth++;
      else if (c === "}") depth--;
      else if (c === ">" && depth === 0) break;
    }
    yield { name: m[1], attrs: src.slice(re.lastIndex, i), index: start };
  }
}

/** Extract the argument text of a call starting at `openParen` (balanced parentheses). */
function callArgs(src, openParen) {
  let depth = 0;
  let quote = null;
  for (let i = openParen; i < src.length; i++) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== "\\") quote = null;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") quote = c;
    else if (c === "(") depth++;
    else if (c === ")" && --depth === 0) return src.slice(openParen + 1, i);
  }
  return src.slice(openParen + 1);
}

function ignoredRules(rawLines, line) {
  const prev = rawLines[line - 2] ?? "";
  const m = prev.match(/design-ignore-next-line\b([^*}\n]*)/);
  if (!m) return null;
  const names = m[1].trim().split(/[\s,]+/).filter(Boolean);
  return names.length ? new Set(names) : "all";
}

// ---------------------------------------------------------------- checker

function checkFile(abs) {
  const rel = path.relative(CLIENT_ROOT, abs).split(path.sep).join("/");
  const raw = readFileSync(abs, "utf8");
  const src = stripComments(raw);
  const rawLines = raw.split(/\r?\n/);
  const fileIgnores = new Set(
    [...raw.matchAll(/design-ignore-file\b([^*}\n]*)/g)].flatMap((m) => m[1].trim().split(/[\s,]+/).filter(Boolean)),
  );
  const ignoreWholeFile = /design-ignore-file\s*(\*\/|\}|$)/m.test(raw);
  const isUi = rel.startsWith(UI_DIR);
  const isI18n = rel.startsWith(I18N_DIR);
  const isService = rel.startsWith("src/services/") || rel.startsWith("src/lib/");
  /** @type {Finding[]} */
  const findings = [];

  const report = (rule, index, message) => {
    if (opts.rules && !opts.rules.has(rule)) return;
    if (ignoreWholeFile || fileIgnores.has(rule)) return;
    const line = lineOf(src, index);
    const ign = ignoredRules(rawLines, line);
    if (ign === "all" || (ign && ign.has(rule))) return;
    if (findings.some((f) => f.rule === rule && f.line === line)) return;
    findings.push({
      rule,
      severity: RULES[rule].severity,
      file: rel,
      line,
      message: message ?? RULES[rule].doc,
      snippet: (rawLines[line - 1] ?? "").trim().slice(0, 140),
    });
  };

  // --- text / i18n rules
  if (!isI18n && !METADATA_FILES.has(rel)) {
    const strRe = /(["'`])((?:\\.|(?!\1)[^\\\n])*)\1/g;
    let m;
    while ((m = strRe.exec(src))) {
      if (VI_CHARS.test(m[2])) report("hardcoded-text", m.index, `Hardcoded Vietnamese string "${m[2].slice(0, 60)}"; move it to src/i18n.`);
    }
    // JSX text nodes: >Some text<
    const jsxText = />([^<>{}\n]*[A-Za-zÀ-ỹ][^<>{}\n]*)</g;
    while ((m = jsxText.exec(src))) {
      const text = m[1].trim();
      if (!text || /^[\w.]+$/.test(text) && !VI_CHARS.test(text) && text.length < 2) continue;
      if (/[=;()]|=>|&&|\|\|/.test(text)) continue; // code, not text
      const before = src.slice(Math.max(0, m.index - 1), m.index + 1);
      if (/[-=]>/.test(before)) continue; // arrow `=>` or `->`
      if (VI_CHARS.test(text) || /^[A-Z][a-z]+(\s+[a-zA-Z]+)+[.!?:]?$/.test(text))
        report("hardcoded-text", m.index + 1, `Hardcoded JSX text "${text.slice(0, 60)}"; use t.<key>.`);
    }
    const ternary = /\b(?:locale\s*===?\s*["'](?:vi|en)["']|vi|isVi|isVietnamese)\s*\?\s*(["'`])/g;
    while ((m = ternary.exec(src))) {
      const tail = src.slice(m.index, m.index + 80);
      if (/["'`](vi-VN|en-US|vi|en)["'`]\s*:/.test(tail)) continue; // date/number locale selection
      report("locale-ternary", m.index);
    }
  }

  // --- JSX element rules
  if (rel.endsWith(".tsx")) {
    for (const tag of jsxTags(src)) {
      const { name, attrs, index } = tag;
      if (name === "button" && !isUi) report("raw-button", index);
      if (name === "input" && !isUi) {
        const type = attrs.match(/\btype=["'](\w+)["']/)?.[1] ?? "text";
        if (!["checkbox", "radio", "file", "hidden", "range", "color"].includes(type))
          report("raw-input", index, `Native <input type="${type}">; use <Input>.`);
      }
      if (name === "textarea" && !isUi) report("raw-input", index, "Native <textarea>; use a shared field component.");
      if (name === "select") report("native-select", index);
      if (/^[a-z]/.test(name) && /(^|\s)title=/.test(attrs)) report("native-title", index);
    }
  }

  // --- behaviour rules
  let m;
  const dialogRe = /\b(?:window\.)?(confirm|alert|prompt)\s*\(/g;
  while ((m = dialogRe.exec(src))) {
    const prev = src.slice(Math.max(0, m.index - 1), m.index);
    if (/[\w.]/.test(prev) && !src.slice(m.index - 7, m.index).endsWith("window.")) continue;
    if (/function\s+$|\.\s*$/.test(src.slice(Math.max(0, m.index - 10), m.index)) && !src.slice(m.index - 7, m.index).endsWith("window.")) continue;
    report("native-dialog", m.index);
  }

  if (!rel.endsWith("lib/query-keys.ts")) {
    const qk = /\bqueryKey\s*:\s*\[\s*["'`]/g;
    while ((m = qk.exec(src))) report("inline-query-key", m.index);
  }

  if (!isService) {
    const fetchRe = /(?<![\w.])fetch\s*\(|\baxios\./g;
    while ((m = fetchRe.exec(src))) report("fetch-in-component", m.index);
  }

  const ROLE_CODES = "ADMIN|STUDENT_AFFAIRS|EVENT_ORGANIZER|STUDENT|LECTURER";
  const roleRes = [
    // role.code === "ADMIN", user.role !== "STUDENT", r.name === "..."
    new RegExp(`\\b(?:role|roles|r|user\\.role|session\\.user\\.role)(?:\\.(?:code|name))?\\s*[!=]==?\\s*["'](?:${ROLE_CODES})["']`, "g"),
    new RegExp(`["'](?:${ROLE_CODES})["']\\s*[!=]==?\\s*(?:[\\w.]*\\.)?(?:code|role)\\b`, "g"),
    // roleNames.includes("STUDENT"), new Set(["ADMIN", ...]), ["STUDENT", "EVENT_ORGANIZER"].map(...)
    new RegExp(`\\b\\w*[Rr]oles?\\w*\\.(?:includes|has)\\(\\s*["'](?:${ROLE_CODES})["']`, "g"),
    new RegExp(`\\[\\s*["'](?:${ROLE_CODES})["']\\s*,\\s*["'](?:${ROLE_CODES})["']`, "g"),
    // allowedRoles={[...]}
    /\ballowedRoles\s*=/g,
  ];
  for (const re of roleRes) while ((m = re.exec(src))) report("role-hardcode", m.index);

  const deb = /\buseDebounce\s*\(/g;
  while ((m = deb.exec(src))) {
    const argText = callArgs(src, src.indexOf("(", m.index));
    const delay = argText.match(/,\s*(\d+)\s*$/)?.[1];
    if (delay && delay !== "500") report("debounce-delay", m.index, `useDebounce delay ${delay} ms; standard is 500 ms.`);
  }

  if (!rel.endsWith("hooks/api/useApi.ts")) {
    const toast = /\bshowToast\s*\(/g;
    while ((m = toast.exec(src))) {
      const argText = callArgs(src, src.indexOf("(", m.index));
      if (!/,\s*["']error["']\s*,?\s*$/.test(argText)) continue;
      if (/message|getErrorMessage/i.test(argText)) continue;
      report("generic-error-toast", m.index);
    }
  }

  const emoji = /(["'`>])[^"'`<\n]*\p{Extended_Pictographic}/gu;
  while ((m = emoji.exec(src))) report("emoji-icon", m.index);

  return findings;
}

// ---------------------------------------------------------------- run

const files = collectFiles();
const findings = files.flatMap(checkFile).sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
const errors = findings.filter((f) => f.severity === "error");
const warns = findings.filter((f) => f.severity === "warn");

if (opts.json) {
  console.log(JSON.stringify({ files: files.length, errors: errors.length, warnings: warns.length, findings }, null, 2));
} else {
  const color = process.stdout.isTTY ? (c, s) => `\x1b[${c}m${s}\x1b[0m` : (_c, s) => s;
  let current = "";
  for (const f of findings) {
    if (f.file !== current) {
      current = f.file;
      console.log(`\n${color("1;4", f.file)}`);
    }
    const sev = f.severity === "error" ? color(31, "error") : color(33, "warn ");
    console.log(`  ${String(f.line).padStart(4)}  ${sev}  ${color(36, f.rule.padEnd(20))} ${f.message}`);
    console.log(`        ${color(90, f.snippet)}`);
  }
  const byRule = Object.entries(
    findings.reduce((acc, f) => ((acc[f.rule] = (acc[f.rule] ?? 0) + 1), acc), {}),
  ).sort((a, b) => b[1] - a[1]);
  console.log(`\nScanned ${files.length} file(s): ${errors.length} error(s), ${warns.length} warning(s).`);
  for (const [rule, count] of byRule) console.log(`  ${String(count).padStart(4)}  ${rule}`);
}

process.exit(errors.length || (opts.warnAsError && warns.length) ? 1 : 0);
