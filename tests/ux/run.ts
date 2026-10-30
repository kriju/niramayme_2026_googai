// Persona UX suite: AI personas browse a deployment of the site and report
// what it was like, alongside automated accessibility, performance and error
// checks. Usage and options: tests/ux/README.md.
//
//   npm run test:ux -- --url https://<preview>.vercel.app [--personas a,b] [--checks-only]
import fs from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath } from "node:url";
import Anthropic from "@anthropic-ai/sdk";
import { loadPersonas } from "./personas.ts";
import { openSession, closeBrowsers, browserFor, settle } from "./browser.ts";
import { runPersonaAgent } from "./agent.ts";
import { renderHtml, renderSummary, totalUsage, estimateCost, type RunMeta } from "./report.ts";
import type { Persona, PersonaResult } from "./types.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const EFFORTS = ["low", "medium", "high", "xhigh", "max"] as const;
// Hosts the suite refuses by default: persona runs belong on previews, so
// they never mix into production analytics or touch live data.
const PRODUCTION_HOSTS = ["niramay.me", "www.niramay.me"];

const { values: args } = parseArgs({
  options: {
    url: { type: "string" },
    personas: { type: "string" },
    "checks-only": { type: "boolean", default: false },
    "max-steps": { type: "string" },
    concurrency: { type: "string" },
    out: { type: "string" },
    "allow-production": { type: "boolean", default: false },
    "chromium-only": { type: "boolean", default: false },
  },
});

const target = args.url ?? process.env.UX_BASE_URL;
if (!target) fail("Pass --url <deployment URL> or set UX_BASE_URL.");
let base: URL;
try {
  base = new URL(target!);
} catch {
  fail(`Not a valid URL: ${target}`);
}
if (base!.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(base!.hostname)) fail("Use an https:// URL (or localhost).");
if (PRODUCTION_HOSTS.includes(base!.hostname) && !args["allow-production"]) {
  fail(`${base!.hostname} is production. Run against a Vercel preview URL, or pass --allow-production for a deliberate, small run.`);
}

const personaFilter = (args.personas ?? process.env.UX_PERSONAS ?? "").split(",").map(s => s.trim()).filter(Boolean);
const personas = loadPersonas(path.join(here, "..", "personas"), personaFilter);
const hasKey = !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
const checksOnly = args["checks-only"] || !hasKey;
const model = process.env.UX_MODEL || "claude-opus-5-5";
const effort = (process.env.UX_EFFORT || "medium") as (typeof EFFORTS)[number];
if (!EFFORTS.includes(effort)) fail(`UX_EFFORT must be one of ${EFFORTS.join(", ")}.`);
const maxSteps = clampInt(args["max-steps"] ?? process.env.UX_MAX_STEPS, 18, 3, 60);
const concurrency = clampInt(args.concurrency ?? process.env.UX_CONCURRENCY, 2, 1, 4);
const outDir = path.resolve(args.out ?? "ux-report");
const forceChromium = args["chromium-only"] || process.env.UX_CHROMIUM_ONLY === "1";
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET || undefined;

if (!hasKey && !args["checks-only"]) console.warn("No ANTHROPIC_API_KEY set: running automated checks only (no AI personas).");

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

const client = checksOnly ? null : new Anthropic({ maxRetries: 4 });
const meta: RunMeta = {
  target: base!.origin,
  startedAt: new Date().toISOString(),
  model: checksOnly ? null : model,
  effort: checksOnly ? null : effort,
  commit: process.env.GITHUB_SHA,
};

console.log(`Persona UX run → ${base!.origin} · ${personas.length} persona(s) · ${checksOnly ? "checks only" : `${model}, effort ${effort}, ≤${maxSteps} steps`}`);

const results: PersonaResult[] = new Array(personas.length);
let next = 0;
await Promise.all(Array.from({ length: Math.min(concurrency, personas.length) }, async () => {
  while (next < personas.length) {
    const i = next++;
    results[i] = await runOne(personas[i]);
    const r = results[i];
    console.log(`  ${r.error ? "✗" : "✓"} ${r.persona.id} — ${r.error ?? (r.verdict ? `goal ${r.verdict.taskCompleted}, ${r.steps.length} steps` : `${r.checks.perf.length} page(s) checked`)}`);
  }
}));
await closeBrowsers();

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify({ meta, results }, null, 2));
fs.writeFileSync(path.join(outDir, "index.html"), renderHtml(results, meta));
const summary = renderSummary(results, meta);
fs.writeFileSync(path.join(outDir, "summary.md"), summary);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);

const cost = estimateCost(meta.model, totalUsage(results));
console.log(`\nReport: ${path.join(outDir, "index.html")}${cost != null ? ` · est. API cost $${cost.toFixed(2)}` : ""}`);
// A persona that couldn't run is a broken suite; poor UX findings are not a failure.
process.exitCode = results.some(r => r.error) ? 1 : 0;

async function runOne(persona: Persona): Promise<PersonaResult> {
  const started = Date.now();
  const kind = browserFor(persona, forceChromium);
  const result: PersonaResult = {
    persona,
    browser: kind,
    mode: checksOnly ? "checks-only" : "persona",
    steps: [],
    verdict: null,
    checks: { axe: [], auditErrors: [], perf: [], layoutIssues: [], consoleErrors: [], failedRequests: [], interceptedSubmissions: [], blockedExternalLinks: [] },
    usage: { inputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 0 },
    durationMs: 0,
  };
  let session;
  try {
    session = await openSession(persona, { baseURL: base.origin, kind, bypassSecret, maxAxePages: 6 });
    result.checks = session.checks;
    const res = await session.page.goto(persona.startPath, { timeout: 45_000 });
    if (res && res.status() === 401) throw new Error("HTTP 401 — the preview is protected. Set VERCEL_AUTOMATION_BYPASS_SECRET (see tests/ux/README.md).");
    await settle(session.page, persona.network);
    await session.auditCurrentPage();

    if (client) {
      const out = await runPersonaAgent(session, persona, { client, model, effort, maxSteps, baseOrigin: base.origin, outDir });
      Object.assign(result, out);
    } else {
      await scriptedVisit(session, persona);
    }
  } catch (err) {
    result.error = err instanceof Anthropic.APIError ? `Claude API ${err.status ?? ""}: ${err.message}` : (err as Error).message.split("\n")[0];
  } finally {
    await session?.close();
    result.durationMs = Date.now() - started;
  }
  return result;
}

// Without an API key: visit the key pages in the persona's language on their
// device and network, so the accessibility/performance checks still run.
async function scriptedVisit(session: Awaited<ReturnType<typeof openSession>>, persona: Persona) {
  const prefix = persona.language === "DE" ? "/de" : "";
  const paths = [...new Set([persona.startPath, prefix || "/", `${prefix}/faq`, `${prefix}/services/yoga`, `${prefix}/astrology-tarot`])];
  for (const p of paths) {
    await session.page.goto(p, { timeout: 45_000 });
    await settle(session.page, persona.network);
    // Scroll through once so lazy-loaded sections render and get audited.
    for (let i = 0; i < 6; i++) {
      await session.page.mouse.wheel(0, 900);
      await session.page.waitForTimeout(250);
    }
    await session.auditCurrentPage();
  }
}

function clampInt(raw: string | undefined, fallback: number, min: number, max: number) {
  const n = Number.parseInt(raw ?? "", 10);
  return Number.isNaN(n) ? fallback : Math.min(max, Math.max(min, n));
}

function fail(msg: string): never {
  console.error(msg);
  process.exit(2);
}
