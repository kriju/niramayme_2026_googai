import type { PersonaResult, Finding, Usage, Severity } from "./types.ts";

export interface RunMeta {
  target: string;
  startedAt: string;
  model: string | null;
  effort: string | null;
  commit?: string;
}

// Per-million-token list prices for an estimate in the report; cache writes
// are billed at 1.25x input. Unknown models show tokens only.
const PRICES: Record<string, { input: number; output: number; cacheRead: number }> = {
  "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
  "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
};

export function estimateCost(model: string | null, u: Usage): number | null {
  const p = model ? PRICES[model] : undefined;
  if (!p) return null;
  return (u.inputTokens * p.input + u.cacheWriteTokens * p.input * 1.25 + u.cacheReadTokens * p.cacheRead + u.outputTokens * p.output) / 1e6;
}

export function totalUsage(results: PersonaResult[]): Usage {
  return results.reduce<Usage>((t, r) => ({
    inputTokens: t.inputTokens + r.usage.inputTokens,
    cacheWriteTokens: t.cacheWriteTokens + r.usage.cacheWriteTokens,
    cacheReadTokens: t.cacheReadTokens + r.usage.cacheReadTokens,
    outputTokens: t.outputTokens + r.usage.outputTokens,
  }), { inputTokens: 0, cacheWriteTokens: 0, cacheReadTokens: 0, outputTokens: 0 });
}

const ORDER: Severity[] = ["critical", "major", "minor", "positive"];

// Findings from the debrief plus anything noted along the way that the
// debrief didn't repeat (matched loosely on the issue text).
export function allFindings(r: PersonaResult): Finding[] {
  const debrief = r.verdict?.findings ?? [];
  const seen = new Set(debrief.map(f => norm(f.issue)));
  const live = r.steps.flatMap(s => (s.observation ? [s.observation] : [])).filter(f => !seen.has(norm(f.issue)));
  return [...debrief, ...live].sort((a, b) => ORDER.indexOf(a.severity) - ORDER.indexOf(b.severity));
}
const norm = (s: string) => s.toLowerCase().replace(/\W+/g, " ").trim().slice(0, 60);

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export function renderHtml(results: PersonaResult[], meta: RunMeta): string {
  const usage = totalUsage(results);
  const cost = estimateCost(meta.model, usage);
  const counts = Object.fromEntries(ORDER.map(s => [s, results.reduce((n, r) => n + allFindings(r).filter(f => f.severity === s).length, 0)]));
  const done = results.filter(r => r.verdict?.taskCompleted === "yes").length;
  const withVerdict = results.filter(r => r.verdict).length;
  const axeTotal = new Set(results.flatMap(r => r.checks.axe.map(a => a.id))).size;

  const topIssues = results
    .flatMap(r => allFindings(r).filter(f => f.severity === "critical" || f.severity === "major").map(f => ({ f, who: r.persona })))
    .sort((a, b) => ORDER.indexOf(a.f.severity) - ORDER.indexOf(b.f.severity));

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Persona UX Report</title>
<style>
:root{--bg:#faf9f7;--card:#fff;--fg:#1f1d1a;--muted:#6b665e;--line:#e6e2dc;--crit:#b42318;--major:#b54708;--minor:#4b5563;--pos:#067647;--chip:#f2efea}
@media (prefers-color-scheme:dark){:root{--bg:#161513;--card:#201f1c;--fg:#ece9e4;--muted:#a19b91;--line:#34312c;--crit:#f97066;--major:#fdb022;--minor:#b4b9c2;--pos:#47cd89;--chip:#2a2824}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:15px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1100px;margin:0 auto;padding:24px 16px 64px}h1{font-size:26px;margin:0 0 4px}h2{font-size:20px;margin:32px 0 12px}h3{font-size:16px;margin:16px 0 8px}
.muted{color:var(--muted)}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:12px 0}
.tiles{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:16px}.tile{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:12px}.tile b{display:block;font-size:24px}
.sev{display:inline-block;font-size:12px;font-weight:600;padding:1px 8px;border-radius:99px;background:var(--chip);white-space:nowrap}.sev.critical{color:var(--crit)}.sev.major{color:var(--major)}.sev.minor{color:var(--minor)}.sev.positive{color:var(--pos)}
table{width:100%;border-collapse:collapse;font-size:14px}td,th{text-align:left;padding:6px 8px;border-top:1px solid var(--line);vertical-align:top}th{color:var(--muted);font-weight:600}
.meta{display:flex;flex-wrap:wrap;gap:6px}.meta span{background:var(--chip);border-radius:6px;padding:1px 8px;font-size:13px}
blockquote{margin:8px 0;padding:4px 12px;border-left:3px solid var(--line);font-style:italic}
details summary{cursor:pointer;font-weight:600;margin:8px 0}.steps{display:grid;gap:10px}.step{display:grid;grid-template-columns:140px 1fr;gap:12px;border-top:1px solid var(--line);padding-top:10px}
.step img{width:140px;border:1px solid var(--line);border-radius:6px}.step code{font-size:13px}.scroll{overflow-x:auto}
@media (max-width:600px){.step{grid-template-columns:1fr}.step img{width:100%;max-width:240px}}
</style></head><body><main>
<h1>Persona UX report</h1>
<div class="muted">${esc(meta.target)} · ${esc(new Date(meta.startedAt).toUTCString())}${meta.commit ? ` · commit ${esc(meta.commit.slice(0, 7))}` : ""}${meta.model ? ` · ${esc(meta.model)} (effort ${esc(meta.effort)})` : " · checks only (no AI personas)"}</div>
<div class="tiles">
<div class="tile"><b>${results.length}</b>personas</div>
${withVerdict ? `<div class="tile"><b>${done}/${withVerdict}</b>completed their goal</div>` : ""}
<div class="tile"><b style="color:var(--crit)">${counts.critical}</b>critical findings</div>
<div class="tile"><b style="color:var(--major)">${counts.major}</b>major findings</div>
<div class="tile"><b>${axeTotal}</b>accessibility rule failures (axe)</div>
${cost != null ? `<div class="tile"><b>$${cost.toFixed(2)}</b>estimated API cost</div>` : ""}
</div>

${topIssues.length ? `<h2>Top issues across personas</h2><div class="card scroll"><table><tr><th>Severity</th><th>Who</th><th>Where</th><th>Issue</th><th>Suggestion</th></tr>
${topIssues.map(({ f, who }) => `<tr><td><span class="sev ${f.severity}">${f.severity}</span></td><td>${esc(who.name)}, ${who.age}</td><td>${esc(f.where)}</td><td>${esc(f.issue)}</td><td>${esc(f.suggestion ?? "")}</td></tr>`).join("\n")}
</table></div>` : ""}

<h2>Personas</h2>
${results.map(r => personaSection(r, meta)).join("\n")}
</main></body></html>`;
}

function personaSection(r: PersonaResult, meta: RunMeta) {
  const p = r.persona;
  const v = r.verdict;
  const findings = allFindings(r);
  const badge = r.error ? `<span class="sev critical">run error</span>` : v ? `<span class="sev ${v.taskCompleted === "yes" ? "positive" : v.taskCompleted === "partially" ? "major" : "critical"}">goal: ${v.taskCompleted}</span>` : r.mode === "checks-only" ? `<span class="sev minor">checks only</span>` : `<span class="sev major">no debrief</span>`;
  const cost = estimateCost(meta.model, r.usage);
  return `<section class="card" id="${esc(p.id)}">
<h3>${esc(p.name)}, ${p.age} — ${esc(p.location.city)}, ${esc(p.location.country)} ${badge}</h3>
<div class="meta"><span>${esc(p.device)} (${esc(r.browser)})</span><span>${esc(p.network)}</span><span>${esc(p.locale)} · ${esc(p.timezone)}</span><span>reads ${p.language}</span><span>tech: ${esc(p.techComfort)}</span>${p.keyboardOnly ? "<span>keyboard only</span>" : ""}${p.colorScheme === "dark" ? "<span>dark mode</span>" : ""}${p.reducedMotion === "reduce" ? "<span>reduced motion</span>" : ""}<span>${Math.round(r.durationMs / 1000)}s</span>${cost != null ? `<span>$${cost.toFixed(2)}</span>` : ""}</div>
<p><b>Goal:</b> ${esc(p.goal)}</p>
${r.error ? `<p style="color:var(--crit)"><b>Error:</b> ${esc(r.error)}</p>` : ""}
${v ? `<p>${esc(v.summary)}</p><blockquote>“${esc(v.quote)}”</blockquote>
<div class="meta">${Object.entries(v.ratings).map(([k, n]) => `<span>${esc(k.replace(/_/g, " "))}: ${"★".repeat(n)}${"☆".repeat(5 - n)}</span>`).join("")}<span>would recommend: ${esc(v.wouldRecommend)}</span></div>` : ""}
${findings.length ? `<h3>Findings</h3><div class="scroll"><table><tr><th>Severity</th><th>Where</th><th>Issue</th><th>Suggestion</th></tr>
${findings.map(f => `<tr><td><span class="sev ${f.severity}">${f.severity}</span></td><td>${esc(f.where)}</td><td>${esc(f.issue)}</td><td>${esc(f.suggestion ?? "")}</td></tr>`).join("\n")}</table></div>` : ""}
${technical(r)}
${r.steps.length ? `<details><summary>Session timeline (${r.steps.length} steps)</summary><div class="steps">
${r.steps.map(s => `<div class="step"><a href="${esc(s.screenshot)}"><img loading="lazy" src="${esc(s.screenshot)}" alt="Screen after step ${s.n}"></a><div><code>${s.n}. ${esc(s.action)}</code> <span class="muted">${esc(shortUrl(s.url))}</span><div>${esc(s.thought)}</div><div class="muted">${esc(s.result)}</div>${s.observation ? `<div><span class="sev ${s.observation.severity}">${s.observation.severity}</span> ${esc(s.observation.issue)}</div>` : ""}</div></div>`).join("\n")}
</div></details>` : ""}
</section>`;
}

function technical(r: PersonaResult) {
  const c = r.checks;
  const rows: string[] = [];
  if (c.axe.length) rows.push(`<h3>Accessibility (axe, WCAG 2.2 AA)</h3><div class="scroll"><table><tr><th>Impact</th><th>Rule</th><th>Elements</th><th>Pages</th></tr>${c.axe.map(a => `<tr><td>${esc(a.impact)}</td><td><a href="${esc(a.helpUrl)}">${esc(a.help)}</a> <span class="muted">(${esc(a.id)})</span></td><td>${a.nodes}</td><td>${esc(a.pages.join(", "))}</td></tr>`).join("")}</table></div>`);
  if (c.perf.length) rows.push(`<h3>Load performance on this device and network</h3><div class="scroll"><table><tr><th>Page</th><th>TTFB</th><th>DOM ready</th><th>LCP</th><th>CLS</th></tr>${c.perf.map(p => `<tr><td>${esc(p.path)}</td><td>${ms(p.ttfbMs)}</td><td>${ms(p.domContentLoadedMs)}</td><td>${ms(p.lcpMs, 2500, 4000)}</td><td>${p.cls == null ? "—" : flag(p.cls.toFixed(3), p.cls, 0.1, 0.25)}</td></tr>`).join("")}</table></div>`);
  if (c.auditErrors.length) rows.push(`<p style="color:var(--major)"><b>Accessibility scan failed on ${c.auditErrors.length} page(s)</b> — results above are incomplete.</p>`);
  if (c.layoutIssues.length) rows.push(`<h3>Layout</h3><ul>${c.layoutIssues.map(i => `<li><span class="sev major">sideways scroll</span> ${esc(i)}</li>`).join("")}</ul>`);
  const lists: [string, string[]][] = [["Accessibility scan errors", c.auditErrors], ["Console errors", c.consoleErrors], ["Failed requests", c.failedRequests], ["Submissions intercepted (never reached the site)", c.interceptedSubmissions], ["External links (blocked)", c.blockedExternalLinks]];
  for (const [title, items] of lists) if (items.length) rows.push(`<details><summary>${esc(title)} (${items.length})</summary><ul>${items.map(i => `<li><code>${esc(i)}</code></li>`).join("")}</ul></details>`);
  return rows.join("\n");
}

const ms = (v: number | null, good?: number, poor?: number) => (v == null ? "—" : good ? flag(`${v} ms`, v, good, poor!) : `${v} ms`);
const flag = (text: string, v: number, good: number, poor: number) => `<span class="sev ${v <= good ? "positive" : v <= poor ? "major" : "critical"}">${esc(text)}</span>`;
const shortUrl = (u: string) => { try { const x = new URL(u); return x.pathname + x.search; } catch { return u; } };

// Markdown for the GitHub Actions job summary.
export function renderSummary(results: PersonaResult[], meta: RunMeta): string {
  const cost = estimateCost(meta.model, totalUsage(results));
  const md = (s: string) => s.replace(/\|/g, "\\|").replace(/\n/g, " ");
  const lines = [
    `## Persona UX report`,
    `${meta.target}${meta.model ? ` · ${meta.model}` : " · checks only"}${cost != null ? ` · est. $${cost.toFixed(2)}` : ""}`,
    "",
    "| Persona | Device | Goal | Ratings (ease/clarity/trust/look/speed) | Critical | Major | axe rules | Too-wide pages |",
    "|---|---|---|---|---|---|---|---|",
    ...results.map(r => {
      const f = allFindings(r);
      const v = r.verdict;
      return `| ${md(r.persona.name)}, ${r.persona.age} (${md(r.persona.location.city)}) | ${md(r.persona.device)} · ${r.persona.network} | ${r.error ? "error" : v?.taskCompleted ?? (r.mode === "checks-only" ? "—" : "no debrief")} | ${v ? Object.values(v.ratings).join("/") : "—"} | ${f.filter(x => x.severity === "critical").length} | ${f.filter(x => x.severity === "major").length} | ${r.checks.axe.length}${r.checks.auditErrors.length ? ` (scan failed on ${r.checks.auditErrors.length} page(s))` : ""} | ${r.checks.layoutIssues.length} |`;
    }),
  ];
  const top = results.flatMap(r => allFindings(r).filter(f => f.severity === "critical").map(f => `- **${md(r.persona.name)}** — ${md(f.where)}: ${md(f.issue)}`));
  if (top.length) lines.push("", "### Critical findings", ...top);
  lines.push("", "Download the `ux-report` artifact for the full HTML report with screenshots.");
  return lines.join("\n");
}
