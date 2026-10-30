import { chromium, webkit, devices, type Browser, type BrowserContext, type Page, type Request } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
import type { Persona, NetworkProfile, TechnicalChecks, PagePerf } from "./types.ts";

// Appended to every persona's user agent so test visits can be told apart in
// server logs and filtered out of any analytics that does see them.
export const TEST_UA_TAG = "NiramayUXTest/1.0";

// The only same-origin POST that's let through: it just prices a course and
// writes nothing. Every other non-GET /api call is answered with a stub.
const API_PASSTHROUGH = new Set(["/api/course-quote"]);

const ANALYTICS = [
  /(^|\.)googletagmanager\.com$/,
  /(^|\.)google-analytics\.com$/,
  /(^|\.)analytics\.google\.com$/,
  /(^|\.)doubleclick\.net$/,
];
// Firebase writes and sign-ups go straight from the browser to Google, not
// through /api, so they're cut off here. Reads (the Listen channel) still work.
const FIREBASE_WRITES = /google\.firestore\.v1\.Firestore\/Write|documents:(commit|batchWrite)|\/documents\/[^?]*\?.*(updateMask|currentDocument)/;
const BLOCKED_HOSTS = [/(^|\.)identitytoolkit\.googleapis\.com$/, /(^|\.)securetoken\.googleapis\.com$/, /(^|\.)checkout\.stripe\.com$/];

// Chromium DevTools network/CPU throttling. Throughput is in bytes per second.
const NETWORK: Record<NetworkProfile, { latency: number; down: number; up: number; cpu: number } | null> = {
  "slow-3g": { latency: 400, down: 50_000, up: 50_000, cpu: 4 },
  "fast-3g": { latency: 150, down: 200_000, up: 94_000, cpu: 2 },
  "4g": { latency: 60, down: 1_125_000, up: 375_000, cpu: 1 },
  wifi: null,
};

export type BrowserKind = "chromium" | "webkit";
const browsers = new Map<BrowserKind, Promise<Browser>>();

export function browserFor(persona: Persona, forceChromium: boolean): BrowserKind {
  return !forceChromium && devices[persona.device].defaultBrowserType === "webkit" ? "webkit" : "chromium";
}

function launch(kind: BrowserKind) {
  if (!browsers.has(kind)) browsers.set(kind, (kind === "webkit" ? webkit : chromium).launch());
  return browsers.get(kind)!;
}

export async function closeBrowsers() {
  await Promise.all([...browsers.values()].map(async b => (await b).close().catch(() => {})));
  browsers.clear();
}

export interface Session {
  context: BrowserContext;
  page: Page;
  checks: TechnicalChecks;
  notes: string[];
  // Runs axe and records Web Vitals the first time each path is seen.
  auditCurrentPage(): Promise<void>;
  close(): Promise<void>;
}

export async function openSession(persona: Persona, opts: { baseURL: string; kind: BrowserKind; bypassSecret?: string; maxAxePages: number }): Promise<Session> {
  const browser = await launch(opts.kind);
  const device = devices[persona.device];
  const origin = new URL(opts.baseURL).origin;
  const context = await browser.newContext({
    ...device,
    userAgent: `${device.userAgent} ${TEST_UA_TAG}`,
    locale: persona.locale,
    timezoneId: persona.timezone,
    geolocation: persona.geolocation,
    permissions: ["geolocation"],
    colorScheme: persona.colorScheme ?? "light",
    reducedMotion: persona.reducedMotion ?? "no-preference",
    baseURL: origin,
  });

  const checks: TechnicalChecks = { axe: [], auditErrors: [], perf: [], layoutIssues: [], consoleErrors: [], failedRequests: [], interceptedSubmissions: [], blockedExternalLinks: [] };
  const notes: string[] = [];
  const aborted = new Set<string>();

  await context.route("**/*", async route => {
    const req = route.request();
    const url = new URL(req.url());
    const sameOrigin = url.origin === origin;
    const abort = () => { aborted.add(req.url()); return route.abort("blockedbyclient"); };

    if (!sameOrigin && (ANALYTICS.some(r => r.test(url.hostname)) || BLOCKED_HOSTS.some(r => r.test(url.hostname)))) return abort();
    if (!sameOrigin && FIREBASE_WRITES.test(url.pathname + url.search)) {
      checks.interceptedSubmissions.push(`Firestore write (${req.method()})`);
      return abort();
    }
    if (sameOrigin && url.pathname.startsWith("/_vercel/")) return abort(); // Vercel Web Analytics + Speed Insights
    if (sameOrigin && url.pathname.startsWith("/api/") && req.method() !== "GET" && !API_PASSTHROUGH.has(url.pathname)) {
      checks.interceptedSubmissions.push(`${req.method()} ${url.pathname}`);
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, uxTestStub: true }) });
    }
    if (!sameOrigin && isTopLevelNavigation(req)) {
      checks.blockedExternalLinks.push(req.url());
      notes.push(`That link leaves the site (${url.hostname}); it was not opened.`);
      return abort();
    }
    // The preview bypass secret is only ever sent to the site itself, never
    // to the third parties the page talks to.
    if (sameOrigin && opts.bypassSecret) {
      return route.continue({ headers: { ...req.headers(), "x-vercel-protection-bypass": opts.bypassSecret } });
    }
    return route.continue();
  });

  // tsx (esbuild keepNames) wraps named functions in __name(), which also
  // ends up in the code page.evaluate sends to the browser.
  await context.addInitScript("globalThis.__name = globalThis.__name || (fn => fn);");
  // Largest Contentful Paint and Cumulative Layout Shift, read back per page.
  await context.addInitScript(() => {
    const w = window as unknown as { __uxPerf: { lcp: number | null; cls: number } };
    w.__uxPerf = { lcp: null, cls: 0 };
    try {
      new PerformanceObserver(list => {
        const last = list.getEntries().at(-1);
        if (last) w.__uxPerf.lcp = last.startTime;
      }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver(list => {
        for (const e of list.getEntries() as unknown as { value: number; hadRecentInput: boolean }[]) if (!e.hadRecentInput) w.__uxPerf.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    } catch {
      // Not supported in this engine (WebKit has no LCP/CLS); left null.
    }
  });

  const page = await context.newPage();
  // "Failed to load resource" repeats what failedRequests already records.
  page.on("console", msg => { if (msg.type() === "error" && !msg.text().startsWith("Failed to load resource")) pushUnique(checks.consoleErrors, msg.text().slice(0, 300)); });
  page.on("pageerror", err => pushUnique(checks.consoleErrors, `Uncaught: ${err.message.slice(0, 300)}`));
  page.on("requestfailed", req => {
    const reason = req.failure()?.errorText ?? "failed";
    // ERR_ABORTED is the browser cancelling a request because the page moved on.
    if (reason.includes("ERR_ABORTED") || aborted.has(req.url()) || new URL(req.url()).origin !== origin) return;
    pushUnique(checks.failedRequests, `${req.method()} ${pathOf(req.url())} — ${reason}`);
  });
  page.on("response", res => {
    if (res.status() >= 400 && new URL(res.url()).origin === origin) pushUnique(checks.failedRequests, `${res.request().method()} ${pathOf(res.url())} — HTTP ${res.status()}`);
  });
  // Links with target="_blank": keep the persona on one tab, like the
  // report's step timeline assumes. (Only popups: axe opens its own helper
  // page in this context and must be left alone.)
  page.on("popup", async p => {
    notes.push("That opened a new tab; you stayed on the original one.");
    await p.close().catch(() => {});
  });

  const throttle = NETWORK[persona.network];
  if (throttle && opts.kind === "chromium") {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: throttle.latency, downloadThroughput: throttle.down, uploadThroughput: throttle.up });
    if (throttle.cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle.cpu });
  }

  const audited = new Set<string>();
  const axeById = new Map<string, TechnicalChecks["axe"][number]>();

  return {
    context,
    page,
    checks,
    notes,
    async auditCurrentPage() {
      const path = pathOf(page.url());
      if (audited.has(path) || new URL(page.url()).origin !== origin) return;
      audited.add(path);
      checks.perf.push(await readPerf(page, path));
      const screenWidth = page.viewportSize()?.width;
      const layoutWidth = await page.evaluate(() => Math.max(window.innerWidth, document.documentElement.scrollWidth));
      if (screenWidth && layoutWidth > screenWidth + 1) pushUnique(checks.layoutIssues, `${path}: content is ${layoutWidth}px wide on a ${screenWidth}px screen`);
      if (audited.size > opts.maxAxePages) return;
      try {
        const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
        for (const v of result.violations) {
          const existing = axeById.get(v.id);
          if (existing) {
            existing.nodes += v.nodes.length;
            existing.pages.push(path);
          } else {
            const issue = { id: v.id, impact: v.impact ?? "unknown", help: v.help, helpUrl: v.helpUrl, nodes: v.nodes.length, pages: [path] };
            axeById.set(v.id, issue);
            checks.axe.push(issue);
          }
        }
      } catch (err) {
        pushUnique(checks.auditErrors, `${path}: ${(err as Error).message.split("\n")[0].slice(0, 200)}`);
      }
    },
    async close() {
      await context.close().catch(() => {});
    },
  };
}

function isTopLevelNavigation(req: Request) {
  try {
    return req.isNavigationRequest() && req.frame().parentFrame() === null;
  } catch {
    return false; // service-worker requests have no frame
  }
}

async function readPerf(page: Page, path: string): Promise<PagePerf> {
  // Give LCP a moment to settle after load before reading it.
  await page.waitForTimeout(500);
  return page.evaluate(p => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const vitals = (window as unknown as { __uxPerf?: { lcp: number | null; cls: number } }).__uxPerf;
    const round = (n: number | null | undefined) => (n == null || Number.isNaN(n) ? null : Math.round(n));
    return {
      path: p,
      ttfbMs: round(nav?.responseStart),
      domContentLoadedMs: round(nav?.domContentLoadedEventEnd),
      lcpMs: round(vitals?.lcp),
      cls: vitals ? Math.round(vitals.cls * 1000) / 1000 : null,
    };
  }, path);
}

export async function settle(page: Page, network: NetworkProfile) {
  await page.waitForLoadState("domcontentloaded", { timeout: 20_000 }).catch(() => {});
  // Firestore keeps a long-poll open, so "networkidle" may never arrive; cap it.
  await page.waitForLoadState("networkidle", { timeout: network === "slow-3g" ? 8_000 : 4_000 }).catch(() => {});
  await page.waitForTimeout(400);
}

const pathOf = (u: string) => {
  const url = new URL(u);
  return url.pathname + url.search;
};

function pushUnique(list: string[], value: string) {
  if (!list.includes(value) && list.length < 50) list.push(value);
}
