import fs from "node:fs";
import path from "node:path";
import { devices } from "playwright";
import type { Persona } from "./types.ts";

const NETWORKS = ["slow-3g", "fast-3g", "4g", "wifi"];

// Reads tests/personas/*.json and fails loudly on a malformed file, so a typo
// shows up before any browser or API call is paid for.
export function loadPersonas(dir: string, only?: string[]): Persona[] {
  const files = fs.readdirSync(dir).filter(f => f.endsWith(".json")).sort();
  const personas = files.map(f => validate(JSON.parse(fs.readFileSync(path.join(dir, f), "utf8")), f));
  const ids = new Set<string>();
  for (const p of personas) {
    if (ids.has(p.id)) throw new Error(`Duplicate persona id "${p.id}"`);
    ids.add(p.id);
  }
  if (!only?.length) return personas;
  const unknown = only.filter(id => !ids.has(id));
  if (unknown.length) throw new Error(`Unknown persona id(s): ${unknown.join(", ")}. Known: ${[...ids].join(", ")}`);
  return personas.filter(p => only.includes(p.id));
}

function validate(raw: unknown, file: string): Persona {
  const p = raw as Partial<Persona>;
  const fail = (msg: string): never => { throw new Error(`${file}: ${msg}`); };
  const str = (v: unknown, name: string) => (typeof v === "string" && v.trim()) || fail(`"${name}" must be a non-empty string`);

  str(p.id, "id");
  if (!/^[a-z0-9-]+$/.test(p.id!)) fail(`"id" may only contain a-z, 0-9 and "-"`);
  for (const k of ["name", "locale", "timezone", "device", "background", "goal", "startPath"] as const) str(p[k], k);
  if (typeof p.age !== "number" || p.age < 1) fail(`"age" must be a positive number`);
  if (!p.location?.city || !p.location?.country) fail(`"location" needs "city" and "country"`);
  if (typeof p.geolocation?.latitude !== "number" || typeof p.geolocation?.longitude !== "number") fail(`"geolocation" needs numeric "latitude" and "longitude"`);
  if (p.language !== "EN" && p.language !== "DE") fail(`"language" must be "EN" or "DE"`);
  if (!devices[p.device!]) fail(`"device" "${p.device}" is not a Playwright device name`);
  if (!NETWORKS.includes(p.network as string)) fail(`"network" must be one of ${NETWORKS.join(", ")}`);
  if (!["low", "medium", "high"].includes(p.techComfort as string)) fail(`"techComfort" must be low, medium or high`);
  if (!p.startPath!.startsWith("/")) fail(`"startPath" must start with "/"`);
  try {
    new Intl.DateTimeFormat(p.locale, { timeZone: p.timezone });
  } catch {
    fail(`"locale" or "timezone" is not valid`);
  }
  return p as Persona;
}
