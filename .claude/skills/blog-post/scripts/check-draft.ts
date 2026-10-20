// Checks a blog draft written by the blog-post skill (../SKILL.md) before it
// is pasted into /write: runs the same automatic legal checks the editor
// shows (api/_lib/claimsCheck.ts), and the field limits, categories and slug
// /write applies. Category and limit lists are read out of
// src/pages/WritePage.tsx rather than copied, so they can't drift.
//
// Read-only and offline: it reads one local file and changes nothing.
//
// Usage:
//   npx tsx .claude/skills/blog-post/scripts/check-draft.ts blog-drafts/<slug>.<lang>.md
//
// Exits 1 on anything /write would refuse (missing field, over a limit,
// unknown category); the claims-check warnings are advisory, like in /write.

import { readFileSync } from "node:fs";
import { checkPost, needsDisclaimer } from "../../../../api/_lib/claimsCheck";

const file = process.argv[2];
if (!file) {
  console.error("Usage: npx tsx .claude/skills/blog-post/scripts/check-draft.ts <draft.md>");
  process.exit(2);
}

// --- What /write accepts, read from the editor itself ---
const writePage = readFileSync(new URL("../../../../src/pages/WritePage.tsx", import.meta.url), "utf8");
const categoriesSrc = writePage.match(/const BLOG_CATEGORIES = (\[[^\]]*\])/)?.[1];
const limitsSrc = writePage.match(/const BLOG_FIELD_LIMITS = (\{[^}]*\})/)?.[1];
if (!categoriesSrc || !limitsSrc) {
  console.error("Couldn't find BLOG_CATEGORIES / BLOG_FIELD_LIMITS in src/pages/WritePage.tsx; update this script.");
  process.exit(2);
}
const BLOG_CATEGORIES: string[] = JSON.parse(categoriesSrc);
const BLOG_FIELD_LIMITS: Record<string, number> = JSON.parse(limitsSrc.replace(/(\w+):/g, '"$1":'));
const PUBLISHABLE_LANGS = ["EN", "DE"]; // firestore.rules: data.lang in ['EN', 'DE']

// Same as slugify() in src/pages/WritePage.tsx (which then makes it unique).
function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

// --- Parse the draft: "---" front matter of single-line "key: value", then the body ---
const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const fm = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
if (!fm) {
  console.error(`${file}: no front matter. Start the file with a --- block (see SKILL.md, stage 3).`);
  process.exit(2);
}
const meta: Record<string, string> = {};
for (const line of fm[1].split("\n")) {
  const m = line.match(/^(\w+):\s*(.*)$/);
  if (m) meta[m[1]] = m[2].trim();
}
const post = {
  title: meta.title ?? "",
  excerpt: meta.excerpt ?? "",
  content: fm[2].trim(),
  category: meta.category ?? "",
  image: meta.image ?? "",
  imageCredit: meta.imageCredit ?? "",
  disclaimer: meta.disclaimer === "true",
  lang: (meta.lang ?? "").toUpperCase(),
};

const errors: string[] = [];
const notes: string[] = [];

if (!post.title) errors.push("title is empty.");
if (!post.content) errors.push("content (the body below the front matter) is empty.");
for (const [field, limit] of Object.entries(BLOG_FIELD_LIMITS)) {
  const length = (post as Record<string, unknown>)[field];
  if (typeof length === "string" && length.length > limit) errors.push(`${field} is ${length.length} characters; /write's limit is ${limit}.`);
}
if (!BLOG_CATEGORIES.includes(post.category)) errors.push(`category "${post.category}" isn't one of: ${BLOG_CATEGORIES.join(", ")}.`);
if (!PUBLISHABLE_LANGS.includes(post.lang)) {
  notes.push(`lang "${post.lang}" can't be published yet; the site only accepts ${PUBLISHABLE_LANGS.join(" and ")}.`);
}
if (!meta.author) notes.push("No author set. /write uses the signed-in founder's name, so confirm the byline with Riju.");

// German posts address the reader as "du"; flag a switch to "Sie" partway
// through. Capitalised Sie/Ihnen/Ihr mid-sentence is the formal "you".
if (post.lang === "DE") {
  const du = post.content.match(/\b(?:du|dich|dir|dein\w*)\b/gi)?.length ?? 0;
  const sie = post.content.match(/[^.!?:\n"„*]\s+(?:Sie|Ihnen|Ihr\w*)\b/g)?.length ?? 0;
  if (du && sie) notes.push(`German mixes "du" (${du}×) and formal "Sie" (${sie}×). Use "du" throughout (see references/voice.md).`);
}

const links = [...post.content.matchAll(/\]\((https?:\/\/[^)\s]+)\)|(?<!\()\bhttps?:\/\/[^\s)]+/g)].map((m) => m[1] ?? m[0]);

// claimsCheck has no languages beyond EN/DE; anything else is checked as-is.
const warnings = checkPost({ ...post, lang: post.lang === "DE" ? "DE" : "EN" });

// --- Report ---
console.log(`\n${file}`);
console.log(`  ${post.lang} · ${post.category} · by ${meta.author || "?"} · ${post.content.split(/\s+/).filter(Boolean).length} words`);
console.log(`  slug (before /write makes it unique): ${slugify(post.title)}`);
console.log(`  health disclaimer: ${post.disclaimer ? "on" : "off"}${needsDisclaimer(post.category) ? " (required for this category)" : ""}`);

if (errors.length) {
  console.log(`\n/write would refuse this (${errors.length}):`);
  for (const e of errors) console.log(`  ✗ ${e}`);
}
console.log(`\nClaims check (${warnings.length} warning${warnings.length === 1 ? "" : "s"}, same as /write):`);
for (const w of warnings) console.log(`  ! [${w.check}] ${w.message}${w.excerpt ? `\n      "${w.excerpt}"` : ""}`);
if (!warnings.length) console.log("  none");
if (notes.length) {
  console.log("\nNotes:");
  for (const n of notes) console.log(`  · ${n}`);
}
console.log(`\nOutbound links to verify (${links.length}):`);
for (const l of links) console.log(`  ${l}`);
if (!links.length) console.log("  none");
console.log("");

process.exit(errors.length ? 1 : 0);
