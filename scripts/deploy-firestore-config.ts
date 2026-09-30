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
// Also enables the TTL policies listed in TTL_POLICIES below.
//
// Required IAM roles for the FIREBASE_SERVICE_ACCOUNT (Google Cloud console →
// IAM & Admin → IAM → the firebase-adminsdk-…@<project>.iam.gserviceaccount.com
// principal → Edit → Add role), in BOTH projects — gen-lang-client-0204527161
// (production) and niramay-me-prev (preview):
//   - Firebase Rules Admin (roles/firebaserules.admin) — rules. The default
//     Firebase Admin SDK service account already has this.
//   - Cloud Datastore Index Admin (roles/datastore.indexAdmin) — composite
//     indexes and TTL policies. NOT granted by default; without it index/TTL
//     creation gets a 403, which is logged as a single warning and the
//     remaining steps still run.
// Or from a shell:
//   gcloud projects add-iam-policy-binding <project> \
//     --member=serviceAccount:<client_email> --role=roles/datastore.indexAdmin
//
// Usage (runs automatically on Vercel builds; skipped locally):
//   FIREBASE_SERVICE_ACCOUNT="$(cat service-account.json)" npx tsx scripts/deploy-firestore-config.ts --force

import { readFileSync } from "node:fs";
import { PRODUCTION_PROJECT_ID, getAdminApp, getDatabaseId, getProjectId } from "../api/_lib/firebaseAdmin";

const RULES_API = "https://firebaserules.googleapis.com/v1";
const FIRESTORE_API = "https://firestore.googleapis.com/v1";
let PROJECT_ID = "";
let DATABASE_ID = "";
let RELEASE_NAME = "";

interface IndexField {
  fieldPath: string;
  order?: string;
  arrayConfig?: string;
  vectorConfig?: unknown;
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

// Index/TTL changes the service account isn't allowed to make. Collected
// instead of thrown, so one missing role doesn't skip the other steps, and
// reported once at the end as a single warning.
const INDEX_ADMIN_ROLE = "roles/datastore.indexAdmin";
const permissionDenied: string[] = [];

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

// Firestore appends an implicit __name__ field to stored indexes (with the
// same direction as the last field), so it's dropped before comparing
// against what firestore.indexes.json declares. The list API always returns
// queryScope, but it's optional in firestore.indexes.json (default COLLECTION).
function indexKey(index: IndexDef) {
  const fields = index.fields
    .filter(f => f.fieldPath !== "__name__")
    .map(f => `${f.fieldPath}:${f.order ?? f.arrayConfig ?? (f.vectorConfig ? "VECTOR" : "")}`)
    .join(",");
  return `${index.collectionGroup}|${index.queryScope || "COLLECTION"}|${fields}`;
}

async function deployIndexes(token: string) {
  const wanted: IndexDef[] = JSON.parse(readFileSync("firestore.indexes.json", "utf8")).indexes;
  const dbPath = `${FIRESTORE_API}/projects/${PROJECT_ID}/databases/${DATABASE_ID}`;

  const existing = new Set<string>();
  let pageToken = "";
  do {
    const query = pageToken ? `?pageToken=${encodeURIComponent(pageToken)}` : "";
    const list = await api(token, "GET", `${dbPath}/collectionGroups/-/indexes${query}`);
    if (!list.ok) fail("Listing indexes", list);
    for (const index of list.data.indexes ?? []) {
      // name looks like .../collectionGroups/{group}/indexes/{id}
      const collectionGroup = String(index.name).split("/collectionGroups/")[1].split("/")[0];
      existing.add(indexKey({ collectionGroup, queryScope: index.queryScope, fields: index.fields }));
    }
    pageToken = list.data.nextPageToken ?? "";
  } while (pageToken);

  let missing = 0;
  for (const index of wanted) {
    const key = indexKey(index);
    if (existing.has(key)) continue;
    missing++;
    const result = await api(token, "POST", `${dbPath}/collectionGroups/${index.collectionGroup}/indexes`, {
      queryScope: index.queryScope || "COLLECTION",
      fields: index.fields,
    });
    if (result.status === 403) {
      permissionDenied.push(`index ${key} (${result.data?.error?.message ?? "no details"})`);
      continue;
    }
    // 409 = an identical index already exists or is being built.
    if (result.status === 409) {
      console.log(`[firestore] index already exists (not matched in list): ${key}`);
      continue;
    }
    if (!result.ok) fail(`Creating index ${key}`, result);
    console.log(`[firestore] index creation started: ${key}`);
  }
  if (!missing) {
    console.log("[firestore] indexes unchanged — skipping");
  } else {
    // Shows what the list API actually returned, so a declared index that
    // exists under a slightly different definition is easy to spot.
    const groups = new Set(wanted.map(i => i.collectionGroup));
    const listed = [...existing].filter(k => groups.has(k.split("|")[0]));
    console.log(`[firestore] listed indexes: ${listed.length ? listed.join("  ") : "(none)"}`);
  }
}

// Firestore TTL policies: docs whose field holds a past timestamp are
// deleted automatically (within ~24h of expiry). Declared here rather than
// in firestore.indexes.json since firebase-tools has no file format for
// them. Only ever enabled, never removed.
const TTL_POLICIES = [
  // Blog comment/vote rate-limit buckets (api/_lib/engagement.ts) — they're
  // only needed for their 10-minute window, and hold a hashed IP.
  { collectionGroup: "rateLimits", field: "expiresAt" },
];

async function deployTtlPolicies(token: string) {
  const dbPath = `${FIRESTORE_API}/projects/${PROJECT_ID}/databases/${DATABASE_ID}`;
  for (const { collectionGroup, field } of TTL_POLICIES) {
    const fieldUrl = `${dbPath}/collectionGroups/${collectionGroup}/fields/${field}`;
    const current = await api(token, "GET", fieldUrl);
    if (!current.ok && current.status !== 404) fail(`Reading TTL policy ${collectionGroup}.${field}`, current);
    const state = current.data.ttlConfig?.state;
    if (state === "ACTIVE" || state === "CREATING") {
      console.log(`[firestore] TTL ${collectionGroup}.${field} ${state.toLowerCase()} — skipping`);
      continue;
    }
    const result = await api(token, "PATCH", `${fieldUrl}?updateMask=ttlConfig`, { ttlConfig: {} });
    if (result.status === 403) {
      permissionDenied.push(`TTL ${collectionGroup}.${field} (${result.data?.error?.message ?? "no details"})`);
      continue;
    }
    // 409 = a TTL change on this field is already in progress.
    if (!result.ok && result.status !== 409) fail(`Enabling TTL ${collectionGroup}.${field}`, result);
    console.log(`[firestore] TTL policy enabling: ${collectionGroup}.${field}`);
  }
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
    // A preview build still holding the live project's key must never push
    // an unmerged branch's rules to the live site.
    if (vercelEnv === "preview" && PROJECT_ID === PRODUCTION_PROJECT_ID) {
      console.warn("[firestore] preview build has the live project's FIREBASE_SERVICE_ACCOUNT — skipping rules/index deploy");
      return;
    }
    // The (default) database's release is plain cloud.firestore; named ones
    // get their own, the same way firebase-tools names them.
    RELEASE_NAME = `projects/${PROJECT_ID}/releases/cloud.firestore${DATABASE_ID === "(default)" ? "" : `/${DATABASE_ID}`}`;
    console.log(`[firestore] ${vercelEnv ?? "manual"} build → project ${PROJECT_ID}, database ${DATABASE_ID}`);
    const credential = getAdminApp().options.credential;
    if (!credential) throw new Error("Firebase admin app has no credential");
    const { access_token } = await credential.getAccessToken();

    // Each step runs even if an earlier one failed.
    const steps: [string, (token: string) => Promise<void>][] = [
      ["rules", deployRules],
      ["indexes", deployIndexes],
      ["TTL policies", deployTtlPolicies],
    ];
    for (const [name, step] of steps) {
      try {
        await step(access_token);
      } catch (error) {
        console.warn(`[firestore] WARNING: could not deploy ${name} — the previously deployed ones stay live.`);
        console.warn(error);
      }
    }

    if (permissionDenied.length) {
      const account = (process.env.FIREBASE_SERVICE_ACCOUNT && JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT).client_email) || "FIREBASE_SERVICE_ACCOUNT";
      console.warn(
        `[firestore] WARNING: ${account} lacks permission (403) to create ${permissionDenied.join(", ")} ` +
          `in project ${PROJECT_ID}. Grant it ${INDEX_ADMIN_ROLE} ("Cloud Datastore Index Admin") to deploy ` +
          `these automatically (see the header of scripts/deploy-firestore-config.ts).`
      );
    }
  } catch (error) {
    console.warn("[firestore] WARNING: could not deploy rules/indexes — the previously deployed ones stay live.");
    console.warn(error);
  }
}

main();
