// Automatic legal checks for blog posts and comments (Feature 1 of the
// feature spec: "Blog legal review").
//
// German health-advertising law (HWG) and unfair-competition law (UWG)
// restrict healing promises, so every post is run through these checks when
// it is submitted for review, and the reviewer sees the warnings next to the
// text. They are warnings only, never blocking: a word list can't tell
// "Reiki cures cancer" from "Reiki never cures cancer", so a person decides.
//
// The list is deliberately strict (no lawyer yet; see "Open questions" in
// the spec). Shared by the /write editor (src/pages/WritePage.tsx), the
// comment API (api/blog-comments.ts, which holds risky comments for
// approval) and scripts/audit-blog-posts.ts (the backlog audit). Pure
// TypeScript with no imports, so it runs in the browser and on the server;
// it lives here, beside the functions, like util.ts which the site and
// scripts also import.

export type CheckId = "promise" | "illness" | "testimonial" | "disclaimer" | "image" | "links" | "translation";

export type CheckWarning = {
  check: CheckId;
  // Short, human-readable reason shown in the editor.
  message: string;
  // The matched words or sentence, so the reviewer can find them.
  excerpt?: string;
};

export type CheckablePost = {
  title?: string;
  excerpt?: string;
  content?: string;
  category?: string;
  image?: string;
  imageCredit?: string;
  disclaimer?: boolean;
  lang?: "EN" | "DE";
  machineTranslated?: boolean;
};

// Words that promise or guarantee a health outcome. Matched as whole words
// (with common inflections), case-insensitive, in English and German.
const PROMISE_PATTERNS: RegExp[] = [
  /\bcur(?:e|es|ed|ing)\b/i,
  /\bheal(?:s|ed)?\b/i,
  /\bguarantee(?:s|d)?\b/i,
  /\b100\s?%/i,
  /\breplaces? (?:your )?(?:medication|medicine|treatment|therapy|doctor)/i,
  /\binstead of (?:your )?(?:medication|medicine|treatment|doctor)/i,
  /\b(?:stop|quit) (?:taking )?(?:your )?(?:medication|medicine|pills)/i,
  /\bmiracle\b/i,
  /\bpermanently (?:removes?|eliminates?|ends?)\b/i,
  // "heilt", "heilen", "geheilt" — not "Heilung"/"Heilpraxis", which are
  // how the practice is named, not a promise.
  /\b(?:ge)?heil(?:t|en|te|ten)\b/i,
  /\bgarantier(?:t|en|te)?\b/i,
  /\bgarantie\b/i,
  /\bersetzt (?:die |das |den |ihre |ihr )?(?:medikament|arzt|ärztin|therapie|behandlung)/i,
  /\bstatt (?:der |des |ihrer )?(?:medikament|arzt|therapie|behandlung)/i,
  /\bwunder(?:heilung|mittel)?\b/i,
  /\bbefreit (?:sie )?(?:dauerhaft|für immer)\b/i,
];

// Named illnesses: a post may discuss them, but next to a promise word (or
// "for <illness>" in a heading-like phrase) they read as a healing claim.
const ILLNESS_PATTERN = /\b(?:cancer|tumou?r|diabetes|depression|anxiety disorder|arthritis|asthma|hypertension|high blood pressure|heart disease|infertility|migraine|insomnia|multiple sclerosis|parkinson'?s?|alzheimer'?s?|dementia|covid|autism|adhd|epilepsy|thyroid|pcos|krebs|depressionen?|angststörung(?:en)?|arthrose|bluthochdruck|herzerkrankung(?:en)?|unfruchtbarkeit|migräne|schlafstörung(?:en)?|demenz|epilepsie|schilddrüse)\b/i;

// Before/after and recovery stories: testimonial-style health claims.
const TESTIMONIAL_PATTERNS: RegExp[] = [
  /\bbefore and after\b/i,
  /\bvorher[- ]nachher\b/i,
  /\b(?:no longer|don'?t|doesn'?t) need (?:my |her |his |their )?(?:medication|medicine|pills|surgery)\b/i,
  /\b(?:fully|completely) recovered\b/i,
  /\bmy (?:doctor|physician) (?:was|were) (?:amazed|shocked|surprised)\b/i,
  /\b(?:pain|symptoms?) (?:is|are|was|were) (?:completely )?gone\b/i,
  /\b(?:brauche|braucht) (?:keine|kein) (?:medikamente|tabletten|operation)\b/i,
  /\bvöllig (?:geheilt|genesen|schmerzfrei)\b/i,
  /\bschmerzen (?:sind|waren) (?:komplett |völlig )?weg\b/i,
];

// Shop links that need an "Anzeige"/affiliate label next to them.
const SHOP_LINK_PATTERN = /\b(?:https?:\/\/)?(?:www\.)?(?:amazon\.[a-z.]+|amzn\.(?:to|eu)|a\.co|ebay\.[a-z.]+|etsy\.com|thalia\.de|hugendubel\.de)\S*/i;
const AD_LABEL_PATTERN = /\b(?:anzeige|werbung|affiliate|advertisement|sponsored|partnerlink|provisionslink)\b/i;

// Categories where the standard health disclaimer must be shown (its text
// is TRANSLATIONS[lang].blogPost.disclaimer in src/constants.ts).
export const DISCLAIMER_CATEGORIES = ["Physical Wellness", "Mental Clarity", "Spiritual Healing", "Kids Yoga", "Chair Yoga"];

export const needsDisclaimer = (category?: string) => !!category && DISCLAIMER_CATEGORIES.includes(category);

// Splits text into sentences (roughly), keeping them short enough to show.
function sentences(text: string): string[] {
  return text
    .replace(/[#*|]/g, " ")
    // No lookbehind: older Safari can't parse it, and the site imports this.
    .replace(/([.!?])\s+/g, "$1\n")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const clip = (s: string, max = 160) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

function matchAll(patterns: RegExp[], text: string): string[] {
  const found = new Set<string>();
  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) found.add(m[0].toLowerCase());
  }
  return [...found];
}

// Runs the word-list checks over free text (a post body or a comment).
export function checkText(text: string): CheckWarning[] {
  const warnings: CheckWarning[] = [];
  for (const sentence of sentences(text)) {
    const promises = matchAll(PROMISE_PATTERNS, sentence);
    const illness = sentence.match(ILLNESS_PATTERN)?.[0];
    if (promises.length && illness) {
      warnings.push({
        check: "illness",
        message: `Healing promise next to a named illness ("${promises.join('", "')}" + "${illness.toLowerCase()}"). Reword as experience, not a result.`,
        excerpt: clip(sentence),
      });
    } else if (promises.length) {
      warnings.push({
        check: "promise",
        message: `Healing promise: "${promises.join('", "')}". Say what many students experience, not what the practice does.`,
        excerpt: clip(sentence),
      });
    }
    const testimonial = matchAll(TESTIMONIAL_PATTERNS, sentence);
    if (testimonial.length) {
      warnings.push({
        check: "testimonial",
        message: `Recovery or before/after claim ("${testimonial.join('", "')}"). Testimonials about healing an illness are restricted (HWG).`,
        excerpt: clip(sentence),
      });
    }
  }
  return warnings;
}

// All checks for a blog post. Every warning is advisory.
export function checkPost(post: CheckablePost): CheckWarning[] {
  const text = [post.title, post.excerpt, post.content].filter(Boolean).join("\n");
  const warnings = checkText(text);

  if (needsDisclaimer(post.category) && !post.disclaimer) {
    warnings.push({
      check: "disclaimer",
      message: `Posts in "${post.category}" need the standard health disclaimer. Tick "Show the standard health disclaimer".`,
    });
  }

  if (post.image && !post.imageCredit?.trim()) {
    warnings.push({
      check: "image",
      message: "The cover image has no source or licence. Fill in \"Image source / licence\" (e.g. \"Own photo\" or \"Unsplash, Jane Doe\").",
    });
  }

  for (const sentence of sentences(post.content ?? "")) {
    const link = sentence.match(SHOP_LINK_PATTERN)?.[0];
    if (link && !AD_LABEL_PATTERN.test(sentence)) {
      warnings.push({
        check: "links",
        message: `Shop link without an "Anzeige" / affiliate note: ${clip(link, 80)}`,
        excerpt: clip(sentence),
      });
    }
  }

  if (post.lang === "DE" && post.machineTranslated) {
    warnings.push({
      check: "translation",
      message: "This German text was machine-translated (DeepL) and hasn't been read by a person yet.",
    });
  }

  return warnings;
}

// Comments are held for approval when they contain a healing promise or a
// recovery story; the reviewer decides whether to publish them.
export function commentNeedsReview(content: string): boolean {
  return checkText(content).length > 0;
}

// What the reviewer confirms before approving (stored with the approval).
export const REVIEW_CHECKLIST = [
  { id: "claimsAsExperience", label: "Claims are worded as experience (\"many students find…\"), not promises" },
  { id: "disclaimerPresent", label: "The health disclaimer is shown where needed" },
  { id: "imageRights", label: "Image rights confirmed (own photo, licence or permission)" },
  { id: "clientData", label: "Client personal data removed, or the client consented" },
  { id: "germanRead", label: "The German text was read by a person (or the post is English only)" },
] as const;

export type ChecklistId = (typeof REVIEW_CHECKLIST)[number]["id"];
