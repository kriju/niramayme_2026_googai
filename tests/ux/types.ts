// Shared shapes for the persona UX suite (tests/ux). Personas live as JSON in
// tests/personas; see tests/ux/README.md for the field reference.

export type NetworkProfile = "slow-3g" | "fast-3g" | "4g" | "wifi";
export type Severity = "critical" | "major" | "minor" | "positive";

export interface Persona {
  id: string;
  name: string;
  age: number;
  location: { city: string; country: string };
  locale: string;
  timezone: string;
  geolocation: { latitude: number; longitude: number };
  // Which language version of the site this person starts on and reads.
  language: "EN" | "DE";
  // A Playwright device name, e.g. "Pixel 5", "iPhone 13", "Desktop Chrome".
  device: string;
  network: NetworkProfile;
  colorScheme?: "light" | "dark";
  reducedMotion?: "reduce" | "no-preference";
  keyboardOnly?: boolean;
  techComfort: "low" | "medium" | "high";
  background: string;
  goal: string;
  startPath: string;
  accessibilityNeeds?: string;
}

export interface Finding {
  severity: Severity;
  where: string;
  issue: string;
  suggestion?: string;
}

export interface Step {
  n: number;
  url: string;
  action: string;
  thought: string;
  result: string;
  screenshot: string; // path relative to the report directory
  observation?: Finding;
}

export interface PersonaVerdict {
  taskCompleted: "yes" | "partially" | "no";
  summary: string;
  ratings: { ease: number; clarity: number; trust: number; look_and_feel: number; speed: number };
  findings: Finding[];
  wouldRecommend: "yes" | "maybe" | "no";
  quote: string;
}

export interface AxeIssue {
  id: string;
  impact: string;
  help: string;
  helpUrl: string;
  nodes: number;
  pages: string[];
}

export interface PagePerf {
  path: string;
  ttfbMs: number | null;
  domContentLoadedMs: number | null;
  lcpMs: number | null;
  cls: number | null;
}

export interface TechnicalChecks {
  axe: AxeIssue[];
  // Pages axe failed to scan; an empty axe list only means "clean" when this is empty too.
  auditErrors: string[];
  perf: PagePerf[];
  // Pages wider than the device screen (mobile browsers then zoom out or scroll sideways).
  layoutIssues: string[];
  consoleErrors: string[];
  failedRequests: string[];
  interceptedSubmissions: string[];
  blockedExternalLinks: string[];
}

export interface Usage {
  inputTokens: number;
  cacheWriteTokens: number;
  cacheReadTokens: number;
  outputTokens: number;
}

export interface PersonaResult {
  persona: Persona;
  browser: string;
  mode: "persona" | "checks-only";
  steps: Step[];
  verdict: PersonaVerdict | null;
  checks: TechnicalChecks;
  usage: Usage;
  error?: string;
  durationMs: number;
}
