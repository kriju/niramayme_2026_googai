// Pushes firestore.rules and firestore.indexes.json to Firestore as part of
// every Vercel build (see "build" in package.json), so changing either file
// needs no `firebase deploy` and no pasting rules into the Firebase console.
// Production builds update the live project; preview builds update the
// separate preview project (whichever FIREBASE_SERVICE_ACCOUNT Vercel hands
// that environment), so a branch's rules can be tried out before merging.
//
// Talks to the Firebase Rules and Firestore Admin REST APIs directly using
// the FIREBASE_SERVICE_ACCOUNT the API routes already use, rather than
// pulling in firebase-tools. Indexes are only ever added, never deleted, so
// an index created by hand in the console is left alone.
//
// Never fails the build: the site keeps working on the previously deployed
// rules/indexes, so a problem here is logged loudly instead.
//
// Usage (runs automatically on Vercel builds; skipped locally):
//   FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" npx tsx scripts/deploy-firestore-config.ts --force

import { readFileSync } from "node:fs";
import { getAdminApp, getDatabaseId, getProjectId } from "../api/_lib/firebaseAdmin";

const RULES_API = "https://firebaserules.googleapis.com/v1";
const FIRESTORE_API = "https://firestore.googleapis.com/v1";
let PROJECT_ID = "";
let DATABASE_ID = "";
let RELEASE_NAME = "";

interface IndexField {
  fieldPath: string;
  order?: string;
  arrayConfig?: string;
}

interface IndexDef {
  collectionGroup: string;
  queryScope: string;
  fields: IndexField[];
}

async function api(token: string, method: string, url: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  return { ok: res.ok, status: res.status, data };
}

function fail(what: string, result: { status: number; data: any }): never {
  throw new Error(`${what} failed (${result.status}): ${JSON.stringify(result.data)}`);
}

async function deployRules(token: string) {
  const source = readFileSync("firestore.rules", "utf8");

  const current = await api(token, "GET", `${RULES_API}/${RELEASE_NAME}`);
  if (current.ok) {
    const ruleset = await api(token, "GET", `${RULES_API}/${current.data.rulesetName}`);
    if (!ruleset.ok) fail("Reading current ruleset", ruleset);
    if (ruleset.data.source?.files?.[0]?.content === source) {
      console.log("[firestore] rules unchanged — skipping");
      return;
    }
  } else if (current.status !== 404) {
    fail("Reading current rules release", current);
  }

  const created = await api(token, "POST", `${RULES_API}/projects/${PROJECT_ID}/rulesets`, {
    source: { files: [{ name: "firestore.rules", content: source }] },
  });
  if (!created.ok) fail("Creating ruleset", created);
  const rulesetName: string = created.data.name;

  const release = current.ok
    ? await api(token, "PATCH", `${RULES_API}/${RELEASE_NAME}`, {
        release: { name: RELEASE_NAME, rulesetName },
      })
    : await api(token, "POST", `${RULES_API}/projects/${PROJECT_ID}/releases`, {
        name: RELEASE_NAME,
        rulesetName,
      });
  if (!release.ok) fail("Releasing ruleset", release);
  console.log(`[firestore] rules deployed (${rulesetName})`);
}

// Firestore appends an implicit __name__ field to stored indexes, so it's
// dropped before comparing against what firestore.indexes.json declares.
function indexKey(index: IndexDef) {
  const fields = index.fields
    .filter(f => f.fieldPath !== "__name__")
    .map(f => `${f.fieldPath}:${f.order ?? f.arrayConfig}`)
    .join(",");
  return `${index.collectionGroup}|${index.queryScope}|${fields}`;
}

async function deployIndexes(token: string) {
  const wanted: IndexDef[] = JSON.parse(readFileSync("firestore.indexes.json", "utf8")).indexes;
  const dbPath = `${FIRESTORE_API}/projects/${PROJECT_ID}/databases/${DATABASE_ID}`;

  const existing = new Set<string>();
  let pageToken = "";
  do {
    const list = await api(token, "GET", `${dbPath}/collectionGroups/-/indexes${pageToken ? `?pageToken=${pageToken}` : ""}`);
    if (!list.ok) fail("Listing indexes", list);
    for (const index of list.data.indexes ?? []) {
      // name looks like .../collectionGroups/{group}/indexes/{id}
      const collectionGroup = String(index.name).split("/collectionGroups/")[1].split("/")[0];
      existing.add(indexKey({ collectionGroup, queryScope: index.queryScope, fields: index.fields }));
    }
    pageToken = list.data.nextPageToken ?? "";
  } while (pageToken);

  let created = 0;
  for (const index of wanted) {
    if (existing.has(indexKey(index))) continue;
    const result = await api(token, "POST", `${dbPath}/collectionGroups/${index.collectionGroup}/indexes`, {
      queryScope: index.queryScope,
      fields: index.fields,
    });
    // 409 = an identical index is already being built from an earlier run.
    if (!result.ok && result.status !== 409) fail(`Creating index ${indexKey(index)}`, result);
    console.log(`[firestore] index creation started: ${indexKey(index)}`);
    created++;
  }
  if (!created) console.log("[firestore] indexes unchanged — skipping");
}

async function main() {
  const force = process.argv.includes("--force");
  const vercelEnv = process.env.VERCEL_ENV;
  if (!force && vercelEnv !== "production" && vercelEnv !== "preview") {
    console.log("[firestore] not a Vercel build — skipping rules/index deploy");
    return;
  }

  try {
    PROJECT_ID = getProjectId();
    DATABASE_ID = getDatabaseId();
    // The (default) database's release is plain cloud.firestore; named ones
    // get their own, the same way firebase-tools names them.
    RELEASE_NAME = `projects/${PROJECT_ID}/releases/cloud.firestore${DATABASE_ID === "(default)" ? "" : `/${DATABASE_ID}`}`;
    console.log(`[firestore] ${vercelEnv ?? "manual"} build → project ${PROJECT_ID}, database ${DATABASE_ID}`);
    const credential = getAdminApp().options.credential;
    if (!credential) throw new Error("Firebase admin app has no credential");
    const { access_token } = await credential.getAccessToken();
    await deployRules(access_token);
    await deployIndexes(access_token);
  } catch (error) {
    console.warn("[firestore] WARNING: could not deploy rules/indexes — the previously deployed ones stay live.");
    console.warn(error);
  }
}

main();
