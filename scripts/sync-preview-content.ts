// Copies the live site's public content into the preview Firebase project
// (niramay-me-prev) on every Vercel preview build, so a preview shows the
// same blog posts, reviews, comments and like counts as production instead
// of an empty site.
//
// Only what any visitor can already see is copied: published blogs, their
// visible comments and like totals, and approved reviews. They're read from
// the live project through the public Firestore REST API with the live web
// app's (public) API key, exactly as the browser reads them — so this needs
// no production credential, and firestore.rules decide what's reachable.
// Drafts, unapproved reviews, votes, bookings and accounts never leave
// production.
//
// Writes go to the preview project via the preview build's own
// FIREBASE_SERVICE_ACCOUNT. Mirrored documents keep their production IDs
// and are overwritten on each preview build, so anything edited on a
// preview is reset to production's version by the next one. Documents
// created on a preview (new posts, test reviews) are left alone. Mirrored
// blogs/reviews that production has since removed are deleted, using the
// ID list kept in _previewSync/state (unreadable to clients — the rules'
// default deny covers it).
//
// Never fails the build: a preview with stale or no mirrored content still
// works, so a problem here is only logged.
//
// Usage (runs automatically on Vercel preview builds; skipped elsewhere):
//   FIREBASE_SERVICE_ACCOUNT="$(cat preview-service-account.json)" npx tsx scripts/sync-preview-content.ts --force

import { readFileSync } from "node:fs";
import { GeoPoint, Timestamp, type DocumentData, type Firestore } from "firebase-admin/firestore";
import { PRODUCTION_PROJECT_ID, getAdminDb, getProjectId } from "../api/_lib/firebaseAdmin";

const productionConfig = JSON.parse(readFileSync("firebase-applet-config.json", "utf8"));
const DOCUMENTS_URL = `https://firestore.googleapis.com/v1/projects/${productionConfig.projectId}/databases/${productionConfig.firestoreDatabaseId}/documents`;

interface RestDocument {
  name: string;
  fields?: Record<string, any>;
}

// Firestore REST values → the admin SDK's native types.
function fromRest(value: any): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return Number(value.doubleValue);
  if ("timestampValue" in value) return Timestamp.fromDate(new Date(value.timestampValue));
  if ("nullValue" in value) return null;
  if ("mapValue" in value) return fieldsToData(value.mapValue.fields);
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(fromRest);
  if ("geoPointValue" in value) return new GeoPoint(value.geoPointValue.latitude ?? 0, value.geoPointValue.longitude ?? 0);
  if ("bytesValue" in value) return Buffer.from(value.bytesValue, "base64");
  if ("referenceValue" in value) return value.referenceValue;
  throw new Error(`Unsupported Firestore value: ${JSON.stringify(value)}`);
}

function fieldsToData(fields: Record<string, any> = {}): DocumentData {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, fromRest(value)]));
}

function docId(doc: RestDocument) {
  return doc.name.split("/").pop()!;
}

// Runs `collectionId where field == value` under `parent` (a document path
// relative to the database root, or "" for top-level collections).
async function queryEquals(parent: string, collectionId: string, field: string, value: any): Promise<RestDocument[]> {
  const url = `${DOCUMENTS_URL}${parent ? `/${parent}` : ""}:runQuery?key=${productionConfig.apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value } },
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Querying production ${parent}/${collectionId} failed (${res.status}): ${JSON.stringify(data)}`);
  return (data as { document?: RestDocument }[]).flatMap(row => (row.document ? [row.document] : []));
}

async function getDocument(path: string): Promise<RestDocument | null> {
  const res = await fetch(`${DOCUMENTS_URL}/${path}?key=${productionConfig.apiKey}`);
  if (res.status === 404) return null;
  const data = await res.json();
  if (!res.ok) throw new Error(`Reading production ${path} failed (${res.status}): ${JSON.stringify(data)}`);
  return data;
}

// Batched writes, kept under Firestore's 500-operations-per-batch limit.
async function commitAll(db: Firestore, ops: ((batch: FirebaseFirestore.WriteBatch) => void)[]) {
  for (let i = 0; i < ops.length; i += 400) {
    const batch = db.batch();
    ops.slice(i, i + 400).forEach(op => op(batch));
    await batch.commit();
  }
}

async function main() {
  const force = process.argv.includes("--force");
  if (!force && process.env.VERCEL_ENV !== "preview") {
    console.log("[preview-sync] not a Vercel preview build — skipping");
    return;
  }

  try {
    // The target is whichever project FIREBASE_SERVICE_ACCOUNT belongs to —
    // never write into the live project, even if a preview was handed its key.
    if (getProjectId() === PRODUCTION_PROJECT_ID) {
      console.warn("[preview-sync] FIREBASE_SERVICE_ACCOUNT is the live project's — skipping");
      return;
    }
    const db = getAdminDb();
    const stateRef = db.collection("_previewSync").doc("state");
    const previous = (await stateRef.get()).data() ?? {};

    const [blogs, reviews] = await Promise.all([
      queryEquals("", "blogs", "published", { booleanValue: true }),
      queryEquals("", "reviews", "approved", { booleanValue: true }),
    ]);
    const perBlog = await Promise.all(
      blogs.map(async blog => {
        const id = docId(blog);
        const [comments, stats] = await Promise.all([
          queryEquals(`blogs/${id}`, "comments", "status", { stringValue: "visible" }),
          getDocument(`blogStats/${id}`),
        ]);
        return { id, comments, stats };
      }),
    );

    const ops: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [];
    for (const blog of blogs) {
      ops.push(b => b.set(db.collection("blogs").doc(docId(blog)), fieldsToData(blog.fields)));
    }
    for (const { id, comments, stats } of perBlog) {
      for (const comment of comments) {
        ops.push(b => b.set(db.collection("blogs").doc(id).collection("comments").doc(docId(comment)), fieldsToData(comment.fields)));
      }
      if (stats) ops.push(b => b.set(db.collection("blogStats").doc(id), fieldsToData(stats.fields)));
    }
    for (const review of reviews) {
      ops.push(b => b.set(db.collection("reviews").doc(docId(review)), fieldsToData(review.fields)));
    }

    // Blogs/reviews mirrored last time that production no longer shows
    // (deleted, unpublished, unapproved) are removed here too.
    const blogIds = blogs.map(docId);
    const reviewIds = reviews.map(docId);
    const removedBlogs = ((previous.blogIds as string[]) ?? []).filter(id => !blogIds.includes(id));
    const removedReviews = ((previous.reviewIds as string[]) ?? []).filter(id => !reviewIds.includes(id));
    for (const id of removedBlogs) {
      ops.push(b => b.delete(db.collection("blogs").doc(id)));
      ops.push(b => b.delete(db.collection("blogStats").doc(id)));
    }
    for (const id of removedReviews) ops.push(b => b.delete(db.collection("reviews").doc(id)));

    await commitAll(db, ops);
    await Promise.all(removedBlogs.map(id => db.recursiveDelete(db.collection("blogs").doc(id).collection("comments"))));
    await stateRef.set({ blogIds, reviewIds, syncedAt: Timestamp.now() });

    const commentCount = perBlog.reduce((n, p) => n + p.comments.length, 0);
    console.log(
      `[preview-sync] mirrored ${blogs.length} blogs, ${commentCount} comments, ${reviews.length} reviews from production` +
        (removedBlogs.length || removedReviews.length ? `; removed ${removedBlogs.length} blogs, ${removedReviews.length} reviews` : ""),
    );
  } catch (error) {
    console.warn("[preview-sync] WARNING: could not mirror production content — this preview shows whatever the preview project already holds.");
    console.warn(error);
  }
}

main();
