import React, { useState, useEffect, useMemo } from "react";
import { Upload, Trash2, LogOut, Lock, Pencil, Languages, AlertTriangle, ClipboardCheck, Globe, MessageSquare, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "../lib/firebase";
import { auth } from "../lib/firebase-auth";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  updateDoc,
  writeBatch,
  deleteField,
  getDocs,
  doc,
  serverTimestamp,
  Timestamp,
  where
} from "firebase/firestore";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User
} from "firebase/auth";
import { upload as uploadBlob } from "@vercel/blob/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TRANSLATIONS, BLOG_ADMIN_USERNAMES, usernameToLoginEmail } from "../constants";
import { SITE_URL, useSeo, useNoIndex } from "../lib/seo";
import { checkPost, needsDisclaimer, REVIEW_CHECKLIST, type CheckWarning, type ChecklistId } from "../../api/_lib/claimsCheck";

// Only used by the /write dashboard to greet whoever's signed in and to
// credit posts by name instead of their internal login username.
const USERNAME_DISPLAY_NAME: Record<string, string> = { rijuk: "Riju", richak: "Richa" };

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFKD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "post";
}

// Blog slugs are auto-generated from the title rather than typed by hand —
// one less field for Richa/Riju to think about — so a collision (two posts
// titled similarly) needs to be resolved automatically too.
async function uniqueSlug(base: string, excludeId?: string): Promise<string> {
  let candidate = base;
  for (let n = 2; ; n++) {
    const snapshot = await getDocs(query(collection(db, "blogs"), where("slug", "==", candidate)));
    if (!snapshot.docs.some(d => d.id !== excludeId)) return candidate;
    candidate = `${base}-${n}`;
  }
}

const LoginForm = () => {
  const wt = TRANSLATIONS.EN.write;
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const normalized = username.trim().toLowerCase();
    if (!(BLOG_ADMIN_USERNAMES as readonly string[]).includes(normalized)) {
      setError(wt.invalidCredentials);
      return;
    }
    setSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, usernameToLoginEmail(normalized), password);
    } catch {
      setError(wt.invalidCredentials);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-stone-50 px-6">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-stone-100 shadow-sm p-8">
        <div className="flex items-center gap-2 mb-8 justify-center">
          <img src="/logo.svg" alt="Niramay Logo" className="w-8 h-8" referrerPolicy="no-referrer" />
          <span className="font-serif text-xl font-bold">{wt.pageTitle}</span>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-600">{wt.usernameLabel}</label>
            <input
              required
              autoFocus
              autoComplete="username"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={username}
              onChange={e => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-600">{wt.passwordLabel}</label>
            <input
              required
              type="password"
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <Button type="submit" className="w-full rounded-full gap-2" disabled={submitting}>
            <Lock className="w-4 h-4" />
            {submitting ? wt.signingIn : wt.signIn}
          </Button>
        </form>
      </div>
    </div>
  );
};

type BlogPostDoc = {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content: string;
  category?: string;
  image?: string;
  imageCredit?: string;
  audioUrl?: string;
  disclaimer?: boolean;
  author?: string;
  lang: "EN" | "DE";
  published: boolean;
  // Bumped on every change to what readers see; an approval names the
  // revision it approved (see blogUpdateAllowed in firestore.rules).
  revision?: number;
  // Id of the post (in the other language) this one translates — see
  // findTranslation in App.tsx, which the site's language switch uses.
  translationOf?: string;
  createdAt?: Timestamp;
};

// Blog legal review (feature spec, Feature 1). One blogReviews/{blogId} doc
// per post, readable only by Richa and Riju. A post goes
// Draft -> In review -> Approved (by the other founder) -> Published, and
// firestore.rules refuse to publish anything else. Edits to a live post wait
// in `pending` until they're approved, so readers never see unreviewed text;
// small typo fixes are the exception and are logged.
type ReviewStatus = "draft" | "in_review" | "changes_requested" | "approved";

type PostFields = {
  title: string;
  excerpt: string;
  content: string;
  category: string;
  image: string;
  imageCredit: string;
  audioUrl: string;
  disclaimer: boolean;
  lang: "EN" | "DE";
};

type BlogReviewDoc = {
  authorEmail: string;
  status: ReviewStatus;
  submittedBy?: string;
  submittedAt?: Timestamp;
  note?: string;
  noteBy?: string;
  noteAt?: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
  approvedRevision?: number;
  approvalId?: string;
  typoFixId?: string;
  typoFixRevision?: number;
  machineTranslated?: boolean;
  pending?: (PostFields & { updatedBy?: string }) | null;
};

const BLOG_CATEGORIES = ["Physical Wellness", "Mental Clarity", "Spiritual Healing", "Kids Yoga", "Dance Therapy", "Tarot Reading", "Chair Yoga"];
// Cheat sheet shown under the content box — keep in sync with
// renderPostContent in App.tsx, which is what actually renders these.
const FORMATTING_GUIDE: [string, string][] = [
  ["## Heading", "Subheading (on its own line)"],
  ["**bold text**", "Bold"],
  ["*italic text*", "Italic"],
  ["- item", "Bullet point (one per line)"],
  ["| A | B |", "Table row; put |---|---| under the first row to make it the header"],
  ["Enter", "Starts a new paragraph"],
];
// iPhone Safari is inconsistent about File.type for audio — an .m4a from
// Voice Memos/Files can come through as "audio/x-m4a", "audio/mp4",
// "video/mp4" or an empty string — and Vercel Blob otherwise has to guess
// the type itself. So upload() always gets an explicit type: the browser's
// when it's plausible for the field, else one looked up from the extension.
const MEDIA_TYPES_BY_EXTENSION: Record<string, string> = {
  m4a: "audio/mp4", mp3: "audio/mpeg", aac: "audio/aac", wav: "audio/wav",
  caf: "audio/x-caf", aif: "audio/aiff", aiff: "audio/aiff", flac: "audio/flac",
  ogg: "audio/ogg", opus: "audio/ogg", weba: "audio/webm",
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif",
  webp: "image/webp", heic: "image/heic", heif: "image/heif", avif: "image/avif",
};
// Listed explicitly alongside the wildcard because iOS's file picker greys
// out some .m4a files for a bare "audio/*".
const AUDIO_ACCEPT = "audio/*,.m4a,.mp3,.aac,.wav,.caf,.aif,.aiff,.flac,.ogg,.opus";
// Keep in sync with maximumSizeInBytes in api/blog-upload.ts. Generous
// because a Voice Memos recording in Lossless mode is ~5 MB per minute.
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;
// Above this, upload in chunks so a flaky mobile connection doesn't have to
// restart one huge request from scratch.
const MULTIPART_THRESHOLD_BYTES = 20 * 1024 * 1024;

function resolveContentType(file: File, kind: "image" | "audio"): string | null {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const byExtension = MEDIA_TYPES_BY_EXTENSION[extension];
  if (byExtension?.startsWith(`${kind}/`)) return byExtension;
  if (file.type.startsWith(`${kind}/`)) return file.type;
  return null;
}

// Mirrors the caps in isValidBlog (firestore.rules), so an over-long field
// gets a specific message here instead of a generic permission-denied.
const BLOG_FIELD_LIMITS = { title: 300, excerpt: 1500, content: 100000, imageCredit: 300 } as const;

const EMPTY_POST_FORM = {
  title: "", excerpt: "", content: "", category: BLOG_CATEGORIES[0], image: "", imageCredit: "", audioUrl: "",
  disclaimer: needsDisclaimer(BLOG_CATEGORIES[0]), lang: "EN" as "EN" | "DE", translationOf: "", machineTranslated: false,
};
type PostForm = typeof EMPTY_POST_FORM;

// Login emails by byline and back. Posts written before reviews existed
// have only the byline; firestore.rules (authorOk) use the same mapping.
const ADMIN_EMAIL_BY_NAME: Record<string, string> = { Riju: "rijuk@niramay.me", Richa: "richak@niramay.me" };
const nameOf = (email?: string) => USERNAME_DISPLAY_NAME[email?.split("@")[0] ?? ""] ?? email ?? "";

// A typo fix may change only this many characters of a live post without a
// new review (spec: "small typo fixes, which the author marks as such").
const TYPO_FIX_MAX_CHARS = 40;

const fieldsOf = (post: BlogPostDoc): PostFields => ({
  title: post.title,
  excerpt: post.excerpt || "",
  content: post.content,
  category: post.category || BLOG_CATEGORIES[0],
  image: post.image || "",
  imageCredit: post.imageCredit || "",
  audioUrl: post.audioUrl || "",
  disclaimer: !!post.disclaimer,
  lang: post.lang,
});

const fieldsFromForm = (form: PostForm): PostFields => ({
  title: form.title.trim(),
  excerpt: form.excerpt.trim(),
  content: form.content,
  category: form.category,
  image: form.image,
  imageCredit: form.imageCredit.trim(),
  audioUrl: form.audioUrl,
  disclaimer: form.disclaimer,
  lang: form.lang,
});

const sameFields = (a: PostFields, b: PostFields) =>
  (Object.keys(a) as (keyof PostFields)[]).every(key => a[key] === b[key]);

// Characters changed between two strings: everything between their common
// prefix and common suffix. Rough, but right for "fixed a typo".
function changedChars(a: string, b: string): number {
  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let end = 0;
  while (end < a.length - start && end < b.length - start && a[a.length - 1 - end] === b[b.length - 1 - end]) end++;
  return Math.max(a.length, b.length) - start - end;
}

function isTypoFix(before: PostFields, after: PostFields): boolean {
  const textKeys = ["title", "excerpt", "content"] as const;
  const otherKeysSame = (Object.keys(before) as (keyof PostFields)[])
    .filter(key => !(textKeys as readonly string[]).includes(key))
    .every(key => before[key] === after[key]);
  const changed = textKeys.reduce((sum, key) => sum + changedChars(before[key], after[key]), 0);
  return otherKeysSame && changed > 0 && changed <= TYPO_FIX_MAX_CHARS;
}

// Where a post stands, for the list badges and which buttons to show.
type PostState =
  | "draft" | "in_review" | "changes_requested" | "approved"
  | "live" | "live_unreviewed" | "live_pending";

const STATE_LABELS: Record<PostState, string> = {
  draft: "Draft",
  in_review: "In review",
  changes_requested: "Changes requested",
  approved: "Approved, ready to publish",
  live: "Published",
  live_unreviewed: "Published, not yet reviewed",
  live_pending: "Published, changes waiting",
};

const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  draft: "draft",
  in_review: "in review",
  changes_requested: "changes requested",
  approved: "approved",
};

const isApprovedCurrent = (post: BlogPostDoc, review?: BlogReviewDoc) =>
  !!review?.approvalId && review.approvedRevision === (post.revision ?? 0);

function postState(post: BlogPostDoc, review?: BlogReviewDoc): PostState {
  if (post.published) {
    if (review?.pending) return "live_pending";
    return isApprovedCurrent(post, review) ? "live" : "live_unreviewed";
  }
  if (isApprovedCurrent(post, review) && review?.status === "approved") return "approved";
  if (review?.status === "in_review" || review?.status === "changes_requested") return review.status;
  return "draft";
}

const WarningList = ({ warnings, empty }: { warnings: CheckWarning[]; empty?: string }) => {
  if (!warnings.length) {
    return empty ? <p className="text-xs text-green-700 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" />{empty}</p> : null;
  }
  return (
    <ul className="space-y-2">
      {warnings.map((w, i) => (
        <li key={i} className="flex gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-600" />
          <span>
            {w.message}
            {w.excerpt && <span className="block mt-1 italic text-amber-800/80">"{w.excerpt}"</span>}
          </span>
        </li>
      ))}
    </ul>
  );
};

const WriteDashboard = ({ user }: { user: User }) => {
  const wt = TRANSLATIONS.EN.write;
  const et = TRANSLATIONS.EN.blog.editor;
  const me = user.email ?? "";
  const username = me.split("@")[0] ?? "";
  const displayName = USERNAME_DISPLAY_NAME[username] ?? username;
  const otherFounder = Object.values(ADMIN_EMAIL_BY_NAME).find(email => email !== me) ?? "";

  const [posts, setPosts] = useState<BlogPostDoc[]>([]);
  const [reviews, setReviews] = useState<Record<string, BlogReviewDoc>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [form, setForm] = useState<PostForm>({ ...EMPTY_POST_FORM });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingAudio, setUploadingAudio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // No published filter here — Richa/Riju signed in can see every post,
    // draft or live (see the isBlogAdmin() OR clause in firestore.rules).
    const q = query(collection(db, "blogs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, snapshot => {
      setPosts(snapshot.docs.map(d => ({ id: d.id, ...d.data() }) as BlogPostDoc));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "blogReviews"), snapshot => {
      setReviews(Object.fromEntries(snapshot.docs.map(d => [d.id, d.data() as BlogReviewDoc])));
    });
    return () => unsubscribe();
  }, []);

  const editingPost = editingId ? posts.find(p => p.id === editingId) : undefined;
  const editingReview = editingId ? reviews[editingId] : undefined;

  // The author of record: the review's, else the byline's. A post with
  // neither (an old post without a byline) counts as the other founder's,
  // so either of them can review it.
  const authorEmailOf = (post: BlogPostDoc) =>
    reviews[post.id]?.authorEmail ?? ADMIN_EMAIL_BY_NAME[post.author ?? ""] ?? null;
  const canReview = (post: BlogPostDoc) => authorEmailOf(post) !== me;
  // What a new review doc records as author (see authorOk in firestore.rules).
  const authorForNewReview = (post: BlogPostDoc) => {
    const byline = ADMIN_EMAIL_BY_NAME[post.author ?? ""];
    if (byline) return byline;
    return canReview(post) ? otherFounder : me;
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_POST_FORM });
    setError(null);
    setNotice(null);
  };

  const startEdit = (post: BlogPostDoc) => {
    const review = reviews[post.id];
    // Edits to a live post that are still waiting for review are what the
    // author carries on editing; the live text stays as it is.
    const fields = review?.pending ?? fieldsOf(post);
    setReviewingId(null);
    setEditingId(post.id);
    setForm({
      ...fields,
      excerpt: fields.excerpt || "",
      imageCredit: fields.imageCredit || "",
      translationOf: post.translationOf || "",
      machineTranslated: !!review?.machineTranslated,
    });
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const startReview = (post: BlogPostDoc) => {
    setEditingId(null);
    setForm({ ...EMPTY_POST_FORM });
    setReviewingId(post.id);
    setError(null);
    setNotice(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Posts this one could be a translation of: the other language's, minus itself.
  const translationCandidates = posts.filter(p => p.lang !== form.lang && p.id !== editingId);
  // Linked in either direction, or matched by the same cover image/audio
  // (see findTranslation in App.tsx) — only published pairs count on the site.
  const hasTranslation = (post: BlogPostDoc) =>
    !!post.translationOf || posts.some(p => p.translationOf === post.id
      || (p.lang !== post.lang && ((!!post.image && p.image === post.image) || (!!post.audioUrl && p.audioUrl === post.audioUrl))));

  // The automatic checks, live as the post is written (warnings only).
  const formWarnings = useMemo(
    () => checkPost({ ...fieldsFromForm(form), machineTranslated: form.machineTranslated }),
    [form],
  );

  const handleUpload = async (file: File, kind: "image" | "audio") => {
    const setUploading = kind === "image" ? setUploadingImage : setUploadingAudio;
    setError(null);
    const contentType = resolveContentType(file, kind);
    if (!contentType) {
      setError(`Couldn't upload "${file.name}": it doesn't look like an ${kind} file.`);
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = Math.round(file.size / (1024 * 1024));
      setError(`Couldn't upload "${file.name}": it's ${sizeMb} MB, and the limit is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`);
      return;
    }
    setUploading(true);
    try {
      // api/blog-upload.ts is the actual security boundary — it checks this
      // ID token against the two-account allowlist before issuing a token
      // the browser can upload with, since the client never holds Vercel
      // Blob's write token directly.
      const idToken = await user.getIdToken();
      // Preview deployments share production's Blob store, so their uploads
      // get their own prefix — api/blog-delete-blob.ts only lets a preview
      // delete those, never the live posts' media mirrored into it.
      const prefix = import.meta.env.VITE_FIREBASE_TARGET === "preview" ? "preview/blog-media" : "blog-media";
      const path = `${prefix}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const blob = await uploadBlob(path, file, {
        access: "public",
        contentType,
        multipart: file.size > MULTIPART_THRESHOLD_BYTES,
        handleUploadUrl: "/api/blog-upload",
        clientPayload: idToken,
      });
      // A new image needs its own source / licence.
      setForm(f => kind === "image" ? { ...f, image: blob.url, imageCredit: "" } : { ...f, audioUrl: blob.url });
    } catch (err) {
      console.error(`Error uploading ${kind}:`, err);
      const reason = err instanceof Error ? err.message : String(err);
      setError(`Couldn't upload that file: ${reason}`);
    } finally {
      setUploading(false);
    }
  };

  // mode: "draft" saves, "submit" saves and asks the other founder to
  // review, "typo" saves a small fix straight to a live post (logged).
  const handleSave = async (mode: "draft" | "submit" | "typo") => {
    if (!form.title.trim() || !form.content.trim()) return;
    const tooLong = (Object.keys(BLOG_FIELD_LIMITS) as (keyof typeof BLOG_FIELD_LIMITS)[])
      .find(field => form[field].trim().length > BLOG_FIELD_LIMITS[field]);
    if (tooLong) {
      setError(`Couldn't save the post: the ${tooLong} is ${form[tooLong].trim().length} characters, and the limit is ${BLOG_FIELD_LIMITS[tooLong]}.`);
      return;
    }
    const fields = fieldsFromForm(form);
    const post = editingPost;
    const review = editingReview;
    if (mode === "typo" && (!post?.published || review?.pending || !isTypoFix(fieldsOf(post), fields))) {
      setError(`That's more than a typo fix (up to ${TYPO_FIX_MAX_CHARS} changed characters in the title, summary or text, nothing else). Submit it for review instead.`);
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      // Only a post in the other language can be this one's translation
      // (the language dropdown may have changed since it was picked).
      const translationOf = translationCandidates.some(p => p.id === form.translationOf) ? form.translationOf : "";
      const submitted = mode === "submit" ? { submittedBy: me, submittedAt: serverTimestamp() } : {};
      const batch = writeBatch(db);

      if (!post) {
        const blogRef = doc(collection(db, "blogs"));
        const slug = await uniqueSlug(slugify(form.title));
        batch.set(blogRef, {
          ...fields, ...(translationOf ? { translationOf } : {}),
          slug, author: displayName, published: false, revision: 1, createdAt: serverTimestamp(),
        });
        batch.set(doc(db, "blogReviews", blogRef.id), {
          authorEmail: me, status: mode === "submit" ? "in_review" : "draft",
          machineTranslated: form.machineTranslated, updatedAt: serverTimestamp(), ...submitted,
        });
      } else {
        const blogRef = doc(db, "blogs", post.id);
        const reviewRef = doc(db, "blogReviews", post.id);
        const revision = post.revision ?? 0;
        const reviewBase = review ? {} : { authorEmail: authorForNewReview(post) };
        if (post.published && mode === "typo") {
          // Live straight away, logged as a typo fix; an approval of the
          // previous text carries over to the fixed one.
          const logRef = doc(collection(db, "blogs", post.id, "approvals"));
          batch.set(logRef, {
            kind: "typo-fix", by: me, at: serverTimestamp(), revision: revision + 1,
            title: fields.title, excerpt: fields.excerpt, content: fields.content, lang: fields.lang,
          });
          batch.set(reviewRef, {
            ...reviewBase, ...(review ? {} : { status: "draft" }),
            typoFixId: logRef.id, typoFixRevision: revision + 1,
            ...(isApprovedCurrent(post, review) ? { approvedRevision: revision + 1 } : {}),
            updatedAt: serverTimestamp(),
          }, { merge: true });
          batch.update(blogRef, { ...fields, revision: revision + 1, updatedAt: serverTimestamp() });
        } else if (post.published) {
          // Readers keep seeing the approved text; the edit waits for review.
          const changed = !sameFields(fieldsOf(post), fields);
          batch.set(reviewRef, {
            ...reviewBase,
            pending: changed ? { ...fields, updatedBy: me } : null,
            status: mode === "submit" ? "in_review" : changed ? "draft" : (review?.status ?? "draft"),
            machineTranslated: form.machineTranslated, updatedAt: serverTimestamp(), ...submitted,
          }, { merge: true });
        } else {
          const changed = !sameFields(fieldsOf(post), fields);
          // Unchanged fields aren't rewritten: the rules count any written
          // content field (even an empty one that was missing) as a change.
          batch.update(blogRef, changed ? { ...fields, revision: revision + 1, updatedAt: serverTimestamp() } : { updatedAt: serverTimestamp() });
          batch.set(reviewRef, {
            ...reviewBase,
            // Changing approved text means it needs another look.
            status: mode === "submit" ? "in_review" : changed ? "draft" : (review?.status ?? "draft"),
            machineTranslated: form.machineTranslated, updatedAt: serverTimestamp(), ...submitted,
          }, { merge: true });
        }
        if ((post.translationOf ?? "") !== translationOf) {
          batch.update(blogRef, { translationOf: translationOf || deleteField() });
        }
      }
      await batch.commit();
      resetForm();
      setNotice(
        mode === "submit" ? `Sent to ${nameOf(otherFounder)} for review.`
          : mode === "typo" ? "Typo fix is live (logged)."
          : post?.published ? "Saved. Your changes stay private until they're reviewed and approved."
          : "Draft saved.",
      );
    } catch (err) {
      console.error("Error saving post:", err);
      setError("Couldn't save the post. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // Publishing an approved post. The rules check the approval too.
  const handlePublish = async (post: BlogPostDoc) => {
    setError(null);
    setNotice(null);
    try {
      await updateDoc(doc(db, "blogs", post.id), { published: true, updatedAt: serverTimestamp() });
      void announceToSubscribers(post.id);
    } catch (err) {
      console.error("Error publishing post:", err);
      setError("Couldn't publish the post. Only a post approved in its current version can be published.");
    }
  };

  const handleUnpublish = async (post: BlogPostDoc) => {
    if (!window.confirm("Take this post offline? It stays approved and can be published again.")) return;
    try {
      await updateDoc(doc(db, "blogs", post.id), { published: false, updatedAt: serverTimestamp() });
    } catch (err) {
      console.error("Error unpublishing post:", err);
      setError("Couldn't take the post offline. Please try again.");
    }
  };

  // Old live posts (the backlog audit) and live posts without a review doc
  // are sent for review as they stand.
  const handleRequestReview = async (post: BlogPostDoc) => {
    setError(null);
    try {
      await setDoc(doc(db, "blogReviews", post.id), {
        ...(reviews[post.id] ? {} : { authorEmail: authorForNewReview(post) }),
        status: "in_review", submittedBy: me, submittedAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, { merge: true });
      setNotice(`Sent to ${nameOf(otherFounder)} for review.`);
    } catch (err) {
      console.error("Error requesting review:", err);
      setError("Couldn't send the post for review. Please try again.");
    }
  };

  const handleDiscardPending = async (post: BlogPostDoc) => {
    if (!window.confirm("Discard the changes waiting for review? The live post stays as it is.")) return;
    const review = reviews[post.id];
    try {
      await updateDoc(doc(db, "blogReviews", post.id), {
        pending: null,
        status: isApprovedCurrent(post, review) ? "approved" : "draft",
        updatedAt: serverTimestamp(),
      });
      if (editingId === post.id) resetForm();
    } catch (err) {
      console.error("Error discarding changes:", err);
      setError("Couldn't discard the changes. Please try again.");
    }
  };

  const handleApprove = async (post: BlogPostDoc, checklist: Record<ChecklistId, boolean>, note: string) => {
    const review = reviews[post.id];
    const fields = review?.pending ?? fieldsOf(post);
    const warnings = checkPost({ ...fields, machineTranslated: !!review?.machineTranslated });
    // Approving changes to a live post puts them live in the same write.
    const revision = (post.revision ?? 0) + (review?.pending ? 1 : 0);
    const batch = writeBatch(db);
    const logRef = doc(collection(db, "blogs", post.id, "approvals"));
    batch.set(logRef, {
      kind: "approval", by: me, at: serverTimestamp(), revision, checklist,
      warnings: warnings.map(w => w.excerpt ? `${w.message} — "${w.excerpt}"` : w.message),
      ...(note.trim() ? { note: note.trim() } : {}),
      title: fields.title, excerpt: fields.excerpt, content: fields.content, lang: fields.lang,
    });
    batch.set(doc(db, "blogReviews", post.id), {
      ...(review ? {} : { authorEmail: authorForNewReview(post) }),
      status: "approved", approvedBy: me, approvedAt: serverTimestamp(), approvedRevision: revision, approvalId: logRef.id,
      pending: null, note: deleteField(), noteBy: deleteField(), noteAt: deleteField(),
      machineTranslated: checklist.germanRead ? false : !!review?.machineTranslated,
      updatedAt: serverTimestamp(),
    }, { merge: true });
    if (review?.pending) {
      const { updatedBy: _updatedBy, ...pendingFields } = review.pending;
      batch.update(doc(db, "blogs", post.id), { ...pendingFields, revision, updatedAt: serverTimestamp() });
    }
    try {
      await batch.commit();
      setReviewingId(null);
      setNotice(post.published
        ? review?.pending ? "Approved — the changes are live now." : "Approved. The post now has an approval record."
        : "Approved. It can be published now.");
    } catch (err) {
      console.error("Error approving post:", err);
      setError("Couldn't save the approval. Please try again.");
    }
  };

  const handleRequestChanges = async (post: BlogPostDoc, note: string) => {
    try {
      await setDoc(doc(db, "blogReviews", post.id), {
        ...(reviews[post.id] ? {} : { authorEmail: authorForNewReview(post) }),
        status: "changes_requested", note: note.trim(), noteBy: me, noteAt: serverTimestamp(), updatedAt: serverTimestamp(),
      }, { merge: true });
      setReviewingId(null);
      setNotice(`Sent back to ${nameOf(authorEmailOf(post) ?? "")} with your note.`);
    } catch (err) {
      console.error("Error requesting changes:", err);
      setError("Couldn't send the note. Please try again.");
    }
  };

  // Best-effort and after the save: the post is live either way, so a
  // newsletter hiccup is reported but never blocks publishing. The server
  // guarantees each post is announced at most once.
  const announceToSubscribers = async (blogId: string) => {
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/newsletter-announce", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ blogId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
      if (data.status === "draft") setNotice("Published. A newsletter email for subscribers is ready as a draft in Brevo — review and send it there.");
      else if (data.status === "sent") setNotice("Published, and subscribers are being emailed about it.");
      else setNotice("Published.");
    } catch (err) {
      console.error("Error announcing post:", err);
      const reason = err instanceof Error ? err.message : String(err);
      setError(`The post is published, but the newsletter email couldn't be prepared: ${reason}`);
    }
  };

  // Machine-translates the currently loaded (already-saved English) post and
  // drops the result into a brand-new, unsaved German draft — editingId is
  // cleared so the next Save creates a new document instead of overwriting
  // the English original. Image/audio carry over unchanged since neither
  // needs translating. Marked as machine-translated until the reviewer
  // confirms a person has read the German.
  const handleTranslate = async () => {
    setTranslating(true);
    setError(null);
    try {
      const idToken = await user.getIdToken();
      const response = await fetch("/api/translate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ title: form.title, excerpt: form.excerpt, content: form.content }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Translation failed");
      // Linked to the English original, so the site's language switch on
      // either one goes straight to the other once both are published.
      const originalId = editingId ?? "";
      setEditingId(null);
      setForm(f => ({ ...f, title: data.title, excerpt: data.excerpt, content: data.content, lang: "DE", translationOf: originalId, machineTranslated: true }));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error translating post:", err);
      setError(et.translateError);
    } finally {
      setTranslating(false);
    }
  };

  const deleteBlob = async (url: string) => {
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/blog-delete-blob", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ url }),
      });
    } catch (err) {
      console.error("Error deleting blob:", err);
    }
  };

  // Firestore doesn't cascade deletes into subcollections, so the post's
  // comments and like/dislike records are removed server-side afterwards.
  // Best-effort like deleteBlob: leftovers are unreadable once the post
  // is gone (see firestore.rules), just untidy. The approval log is kept.
  const purgeEngagement = async (blogId: string) => {
    try {
      const idToken = await user.getIdToken();
      await fetch("/api/blog-comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ blogId }),
      });
    } catch (err) {
      console.error("Error purging comments:", err);
    }
  };

  const handleDelete = async (post: BlogPostDoc) => {
    if (!window.confirm(et.deleteConfirm)) return;
    try {
      const batch = writeBatch(db);
      batch.delete(doc(db, "blogs", post.id));
      if (reviews[post.id]) batch.delete(doc(db, "blogReviews", post.id));
      await batch.commit();
      if (post.image) deleteBlob(post.image);
      if (post.audioUrl) deleteBlob(post.audioUrl);
      const pending = reviews[post.id]?.pending;
      if (pending?.image && pending.image !== post.image) deleteBlob(pending.image);
      if (pending?.audioUrl && pending.audioUrl !== post.audioUrl) deleteBlob(pending.audioUrl);
      purgeEngagement(post.id);
      if (editingId === post.id) resetForm();
      if (reviewingId === post.id) setReviewingId(null);
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

  const livePosts = posts.filter(p => p.published);
  const liveApproved = livePosts.filter(p => isApprovedCurrent(p, reviews[p.id]));
  const waitingForMe = posts.filter(p => {
    const status = reviews[p.id]?.status;
    return status === "in_review" && canReview(p);
  });
  const backToMe = posts.filter(p => reviews[p.id]?.status === "changes_requested" && !canReview(p));
  const reviewingPost = reviewingId ? posts.find(p => p.id === reviewingId) : undefined;

  const editingState = editingPost ? postState(editingPost, editingReview) : null;
  const editingLive = !!editingPost?.published;
  const saveDisabled = saving || uploadingImage || uploadingAudio || !form.title.trim() || !form.content.trim();

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Niramay Logo" className="w-8 h-8" referrerPolicy="no-referrer" />
          <span className="font-serif text-xl font-bold">{wt.pageTitle}</span>
          <span className="text-sm text-muted-foreground">— {displayName}</span>
        </div>
        <Button variant="ghost" size="sm" className="gap-2" onClick={() => signOut(auth)}>
          <LogOut className="w-4 h-4" /> {wt.signOut}
        </Button>
      </div>

      {(waitingForMe.length > 0 || backToMe.length > 0 || liveApproved.length < livePosts.length) ? (
        <Card className="border-amber-200 bg-amber-50/40 mb-8">
          <CardHeader className="pb-2">
            <CardTitle className="font-serif text-lg flex items-center gap-2"><ClipboardCheck className="w-5 h-5 text-amber-700" />Legal review</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {livePosts.length > 0 && (
              <p>
                <span className="font-medium">Backlog audit:</span> {liveApproved.length} of {livePosts.length} live posts have an approval record.
                {liveApproved.length < livePosts.length && " Posts marked \"not yet reviewed\" below need a check by the other founder."}
              </p>
            )}
            {waitingForMe.length > 0 && (
              <div>
                <p className="font-medium mb-1">Waiting for your review</p>
                <ul className="space-y-1">
                  {waitingForMe.map(p => (
                    <li key={p.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">{p.title}</span>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => startReview(p)}>Review</Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {backToMe.length > 0 && (
              <div>
                <p className="font-medium mb-1">Changes requested on your posts</p>
                <ul className="space-y-1">
                  {backToMe.map(p => (
                    <li key={p.id} className="flex items-center justify-between gap-3">
                      <span className="truncate">{p.title}</span>
                      <Button size="sm" variant="outline" className="shrink-0" onClick={() => startEdit(p)}>Edit</Button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      ) : livePosts.length > 0 && (
        <p className="text-sm text-green-700 flex items-center gap-1.5 mb-8">
          <ShieldCheck className="w-4 h-4" />Backlog audit complete: all {livePosts.length} live posts have an approval record.
        </p>
      )}

      {notice && !reviewingPost && <p className="text-sm text-green-700 mb-6">{notice}</p>}

      {reviewingPost ? (
        <ReviewPanel
          post={reviewingPost}
          review={reviews[reviewingPost.id]}
          authorName={nameOf(authorEmailOf(reviewingPost) ?? "") || reviewingPost.author || "the author"}
          error={error}
          onApprove={(checklist, note) => handleApprove(reviewingPost, checklist, note)}
          onRequestChanges={note => handleRequestChanges(reviewingPost, note)}
          onClose={() => { setReviewingId(null); setError(null); }}
        />
      ) : (
      <Card className="border-stone-100 mb-12">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">{editingId ? et.editTitle : et.newTitle}</CardTitle>
          {editingState && (
            <p className="text-sm text-muted-foreground">
              {STATE_LABELS[editingState]}
              {editingLive && " — readers keep seeing the published version until your changes are approved."}
            </p>
          )}
          {editingReview?.status === "changes_requested" && editingReview.note && (
            <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium flex items-center gap-1.5"><MessageSquare className="w-4 h-4" />{nameOf(editingReview.noteBy)} asked for changes:</p>
              <p className="mt-1 whitespace-pre-line">{editingReview.note}</p>
            </div>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-600">{et.titleLabel}</label>
            <input
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif italic text-lg"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">{et.categoryLabel}</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={form.category}
                // Health categories switch the disclaimer on; it can still be
                // unticked, which the checks then flag.
                onChange={e => { const category = e.target.value; setForm(f => ({ ...f, category, disclaimer: f.disclaimer || needsDisclaimer(category) })); }}
              >
                {BLOG_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">Language</label>
              <select
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={form.lang}
                onChange={e => setForm(f => ({ ...f, lang: e.target.value as "EN" | "DE" }))}
              >
                <option value="EN">English</option>
                <option value="DE">Deutsch</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-600">{et.translationOfLabel}</label>
            <p className="text-xs text-muted-foreground">{et.translationOfHint}</p>
            <select
              className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              value={translationCandidates.some(p => p.id === form.translationOf) ? form.translationOf : ""}
              onChange={e => setForm(f => ({ ...f, translationOf: e.target.value }))}
            >
              <option value="">{et.translationOfNone}</option>
              {translationCandidates.map(p => (
                <option key={p.id} value={p.id}>
                  {p.lang} · {p.title}{p.published ? "" : ` (${et.statusDraft})`}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-600">{et.excerptLabel}</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all h-20 resize-none"
              value={form.excerpt}
              onChange={e => setForm(f => ({ ...f, excerpt: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-600">{et.contentLabel}</label>
            <p className="text-xs text-muted-foreground">{et.contentHint}</p>
            <details open className="rounded-xl border border-stone-200 bg-stone-50 px-4 py-2 text-xs text-stone-600">
              <summary className="cursor-pointer font-medium text-stone-700">{et.formattingGuideTitle}</summary>
              <table className="mt-2 mb-1 w-full">
                <tbody>
                  {FORMATTING_GUIDE.map(([syntax, result]) => (
                    <tr key={syntax} className="align-top">
                      <td className="py-1 pr-4 font-mono whitespace-nowrap text-stone-800">{syntax}</td>
                      <td className="py-1">{result}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all h-64"
              value={form.content}
              onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
            />
          </div>

          <label className="flex items-start gap-3 text-sm text-stone-700">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.disclaimer}
              onChange={e => setForm(f => ({ ...f, disclaimer: e.target.checked }))}
            />
            <span>
              Show the standard health disclaimer under the post
              <span className="block text-xs text-muted-foreground">"Not medical advice; doesn't replace a doctor or therapist." Needed for anything about health, the body or the mind.</span>
            </span>
          </label>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">{et.imageLabel}</label>
              {form.image ? (
                <div className="relative w-fit">
                  <img src={form.image} className="h-28 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 border border-stone-200 shadow-sm hover:text-red-600"
                    onClick={() => setForm(f => ({ ...f, image: "", imageCredit: "" }))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-stone-300 text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:text-primary transition-colors w-fit">
                  <Upload className="w-4 h-4" />
                  {uploadingImage ? et.uploading : et.uploadImage}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingImage}
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleUpload(file, "image"); e.target.value = ""; }}
                  />
                </label>
              )}
              {form.image && (
                <input
                  className="w-full px-3 py-2 rounded-lg border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder={'Image source / licence, e.g. "Own photo" or "Unsplash, Jane Doe"'}
                  value={form.imageCredit}
                  onChange={e => setForm(f => ({ ...f, imageCredit: e.target.value }))}
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">{et.audioLabel}</label>
              {form.audioUrl ? (
                <div className="flex items-center gap-2">
                  <audio controls src={form.audioUrl} className="h-10 max-w-[220px]" />
                  <button
                    type="button"
                    className="p-1.5 rounded-full border border-stone-200 hover:text-red-600"
                    onClick={() => setForm(f => ({ ...f, audioUrl: "" }))}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed border-stone-300 text-sm text-muted-foreground cursor-pointer hover:border-primary/40 hover:text-primary transition-colors w-fit">
                  <Upload className="w-4 h-4" />
                  {uploadingAudio ? et.uploading : et.uploadAudio}
                  <input
                    type="file"
                    accept={AUDIO_ACCEPT}
                    className="hidden"
                    disabled={uploadingAudio}
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleUpload(file, "audio"); e.target.value = ""; }}
                  />
                </label>
              )}
            </div>
          </div>

          {(form.title.trim() || form.content.trim()) && (
            <div className="space-y-2 rounded-xl border border-stone-200 px-4 py-3">
              <p className="text-sm font-medium text-stone-700">Automatic checks</p>
              <WarningList warnings={formWarnings} empty="No warnings. The reviewer still reads it in full." />
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {editingId && form.lang === "EN" && form.title.trim() && form.content.trim() && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-stone-300 px-4 py-3">
              <p className="text-xs text-muted-foreground">{et.translateHint}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2 shrink-0"
                disabled={translating}
                onClick={handleTranslate}
              >
                <Languages className="w-4 h-4" />
                {translating ? et.translating : et.translateToGerman}
              </Button>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-3 pt-2">
            {editingId && <Button type="button" variant="ghost" onClick={resetForm}>{et.cancel}</Button>}
            {editingLive && !editingReview?.pending && (
              <Button type="button" variant="outline" disabled={saveDisabled} onClick={() => handleSave("typo")}>
                Save typo fix (stays live)
              </Button>
            )}
            <Button type="button" variant="outline" disabled={saveDisabled} onClick={() => handleSave("draft")}>
              {saving ? et.saving : et.saveDraft}
            </Button>
            <Button type="button" className="gap-2" disabled={saveDisabled} onClick={() => handleSave("submit")}>
              <Send className="w-4 h-4" />
              {saving ? et.saving : "Submit for review"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-right">
            {nameOf(otherFounder)} reviews and approves it; then it can be published.
          </p>
        </CardContent>
      </Card>
      )}

      <h2 className="text-xl font-serif font-bold mb-4">{et.yourPosts}</h2>
      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{et.noPosts}</p>
      ) : (
        <div className="space-y-3">
          {posts.map(post => {
            const review = reviews[post.id];
            const state = postState(post, review);
            const reviewer = canReview(post);
            const pendingStatus = state === "live_pending" || state === "live_unreviewed" ? review?.status : undefined;
            return (
              <div key={post.id} className="p-4 rounded-xl border border-stone-100 bg-white">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge
                        variant={state === "live" ? "secondary" : "outline"}
                        className={`text-xs ${state === "live_unreviewed" || state === "changes_requested" ? "border-amber-300 text-amber-800" : ""}`}
                      >
                        {STATE_LABELS[state]}
                      </Badge>
                      {pendingStatus && pendingStatus !== "approved" && <Badge variant="outline" className="text-xs">{REVIEW_STATUS_LABELS[pendingStatus]}</Badge>}
                      <Badge variant="outline" className="text-xs">{post.lang}</Badge>
                      {hasTranslation(post) && <Badge variant="outline" className="text-xs">{et.translationLinked}</Badge>}
                    </div>
                    <p className="font-medium truncate">{post.title}</p>
                    <p className="text-xs text-muted-foreground">
                      by {nameOf(authorEmailOf(post) ?? undefined) || post.author || "—"}
                      {review?.approvedBy && ` · approved by ${nameOf(review.approvedBy)}${review.approvedAt?.toDate ? ` on ${review.approvedAt.toDate().toLocaleDateString("en-GB")}` : ""}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" title="Edit" onClick={() => startEdit(post)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="hover:text-red-600" title="Delete" onClick={() => handleDelete(post)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 mt-3 empty:hidden">
                  {reviewer && (review?.status === "in_review" || state === "live_unreviewed") && state !== "live" && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => startReview(post)}>
                      <ClipboardCheck className="w-3.5 h-3.5" />Review
                    </Button>
                  )}
                  {!reviewer && state === "live_unreviewed" && review?.status !== "in_review" && (
                    <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleRequestReview(post)}>
                      <Send className="w-3.5 h-3.5" />Ask {nameOf(otherFounder)} to review
                    </Button>
                  )}
                  {state === "approved" && (
                    <Button size="sm" className="gap-1.5" onClick={() => handlePublish(post)}>
                      <Globe className="w-3.5 h-3.5" />{et.publish}
                    </Button>
                  )}
                  {state === "live_pending" && (
                    <Button size="sm" variant="ghost" onClick={() => handleDiscardPending(post)}>Discard waiting changes</Button>
                  )}
                  {post.published && (
                    <Button size="sm" variant="ghost" onClick={() => handleUnpublish(post)}>Unpublish</Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// The second founder's view of a post in review: the text as readers will
// see it, the automatic warnings, the checklist and Approve / Request changes.
const ReviewPanel = ({
  post, review, authorName, error, onApprove, onRequestChanges, onClose,
}: {
  post: BlogPostDoc;
  review?: BlogReviewDoc;
  authorName: string;
  error: string | null;
  onApprove: (checklist: Record<ChecklistId, boolean>, note: string) => Promise<void>;
  onRequestChanges: (note: string) => Promise<void>;
  onClose: () => void;
}) => {
  const fields = useMemo(() => review?.pending ?? fieldsOf(post), [review, post]);
  const warnings = useMemo(() => checkPost({ ...fields, machineTranslated: !!review?.machineTranslated }), [fields, review?.machineTranslated]);
  const [checklist, setChecklist] = useState<Record<ChecklistId, boolean>>(
    () => Object.fromEntries(REVIEW_CHECKLIST.map(item => [item.id, false])) as Record<ChecklistId, boolean>,
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const allTicked = REVIEW_CHECKLIST.every(item => checklist[item.id]);
  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try { await action(); } finally { setBusy(false); }
  };

  return (
    <Card className="border-primary/20 mb-12">
      <CardHeader>
        <CardTitle className="font-serif text-2xl flex items-center gap-2"><ClipboardCheck className="w-6 h-6 text-primary" />Review</CardTitle>
        <p className="text-sm text-muted-foreground">
          By {authorName} · {post.lang} · {fields.category}
          {post.published && (review?.pending ? " · changes to a live post" : " · live post (backlog audit)")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Automatic checks</p>
          <WarningList warnings={warnings} empty="No warnings from the automatic checks." />
        </div>

        <article className="rounded-xl border border-stone-200 bg-stone-50/50 px-5 py-4 max-h-[28rem] overflow-y-auto">
          <h3 className="font-serif text-xl font-bold mb-2">{fields.title}</h3>
          {fields.excerpt && <p className="text-stone-600 mb-3">{fields.excerpt}</p>}
          {fields.image && (
            <figure className="mb-3">
              <img src={fields.image} className="h-32 rounded-lg object-cover" referrerPolicy="no-referrer" />
              <figcaption className="text-xs text-muted-foreground mt-1">{fields.imageCredit ? `Image: ${fields.imageCredit}` : "No image source / licence given"}</figcaption>
            </figure>
          )}
          <div className="text-sm text-stone-700 whitespace-pre-line leading-relaxed">{fields.content}</div>
          <p className="text-xs text-muted-foreground mt-4">{fields.disclaimer ? "Shows the standard health disclaimer." : "No health disclaimer."}</p>
        </article>

        <div className="space-y-2">
          <p className="text-sm font-medium text-stone-700">Checklist</p>
          {REVIEW_CHECKLIST.map(item => (
            <label key={item.id} className="flex items-start gap-3 text-sm text-stone-700">
              <input
                type="checkbox"
                className="mt-1"
                checked={checklist[item.id]}
                onChange={e => setChecklist(c => ({ ...c, [item.id]: e.target.checked }))}
              />
              {item.label}
            </label>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-700">Note for {authorName} (needed to request changes)</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 h-24 resize-none"
            maxLength={2000}
            value={note}
            onChange={e => setNote(e.target.value)}
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
          <Button type="button" variant="outline" disabled={busy || !note.trim()} onClick={() => run(() => onRequestChanges(note))}>
            Request changes
          </Button>
          <Button type="button" className="gap-2" disabled={busy || !allTicked} onClick={() => run(() => onApprove(checklist, note))}>
            <ShieldCheck className="w-4 h-4" />Approve
          </Button>
        </div>
        {!allTicked && <p className="text-xs text-muted-foreground text-right">Tick every checklist item to approve.</p>}
      </CardContent>
    </Card>
  );
};

// Outside AppLayout: no marketing nav/footer/WhatsApp button on the admin
// tool. Lazy-loaded from App.tsx since it pulls in Firebase Auth, the
// Vercel Blob upload client and the whole editor UI that visitors never
// need.
export default function WritePage() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, u => {
      setUser(u);
      setAuthLoading(false);
    });
    return unsubscribe;
  }, []);

  useSeo({ title: "Niramay Blog Admin", description: "", canonical: `${SITE_URL}/write`, lang: "EN" });

  // Not content for visitors — keep it out of the index entirely rather
  // than relying on nobody linking to it.
  useNoIndex();

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      {user ? <WriteDashboard user={user} /> : <LoginForm />}
    </div>
  );
}
