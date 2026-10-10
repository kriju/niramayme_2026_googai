import React, { useState, useEffect } from "react";
import { Upload, Trash2, LogOut, Lock, Pencil, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "../lib/firebase";
import { auth } from "../lib/firebase-auth";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  deleteDoc,
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
  audioUrl?: string;
  author?: string;
  lang: "EN" | "DE";
  published: boolean;
  // Id of the post (in the other language) this one translates — see
  // findTranslation in App.tsx, which the site's language switch uses.
  translationOf?: string;
  createdAt?: Timestamp;
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
const BLOG_FIELD_LIMITS = { title: 300, excerpt: 1500, content: 100000 } as const;

const EMPTY_POST_FORM = { title: "", excerpt: "", content: "", category: BLOG_CATEGORIES[0], image: "", audioUrl: "", lang: "EN" as "EN" | "DE", translationOf: "" };

const WriteDashboard = ({ user }: { user: User }) => {
  const wt = TRANSLATIONS.EN.write;
  const et = TRANSLATIONS.EN.blog.editor;
  const username = user.email?.split("@")[0] ?? "";
  const displayName = USERNAME_DISPLAY_NAME[username] ?? username;

  const [posts, setPosts] = useState<BlogPostDoc[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...EMPTY_POST_FORM });
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

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...EMPTY_POST_FORM });
    setError(null);
    setNotice(null);
  };

  const startEdit = (post: BlogPostDoc) => {
    setEditingId(post.id);
    setForm({
      title: post.title,
      excerpt: post.excerpt || "",
      content: post.content,
      category: post.category || BLOG_CATEGORIES[0],
      image: post.image || "",
      audioUrl: post.audioUrl || "",
      lang: post.lang,
      translationOf: post.translationOf || "",
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Posts this one could be a translation of: the other language's, minus itself.
  const translationCandidates = posts.filter(p => p.lang !== form.lang && p.id !== editingId);
  // Linked in either direction, or matched by the same cover image/audio
  // (see findTranslation in App.tsx) — only published pairs count on the site.
  const hasTranslation = (post: BlogPostDoc) =>
    !!post.translationOf || posts.some(p => p.translationOf === post.id
      || (p.lang !== post.lang && ((!!post.image && p.image === post.image) || (!!post.audioUrl && p.audioUrl === post.audioUrl))));

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
      setForm(f => ({ ...f, [kind === "image" ? "image" : "audioUrl"]: blob.url }));
    } catch (err) {
      console.error(`Error uploading ${kind}:`, err);
      const reason = err instanceof Error ? err.message : String(err);
      setError(`Couldn't upload that file: ${reason}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (published: boolean) => {
    if (!form.title.trim() || !form.content.trim()) return;
    const tooLong = (Object.keys(BLOG_FIELD_LIMITS) as (keyof typeof BLOG_FIELD_LIMITS)[])
      .find(field => form[field].trim().length > BLOG_FIELD_LIMITS[field]);
    if (tooLong) {
      setError(`Couldn't save the post: the ${tooLong} is ${form[tooLong].trim().length} characters, and the limit is ${BLOG_FIELD_LIMITS[tooLong]}.`);
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const payload = {
        title: form.title.trim(),
        excerpt: form.excerpt.trim(),
        content: form.content,
        category: form.category,
        image: form.image,
        audioUrl: form.audioUrl,
        lang: form.lang,
        author: displayName,
        published,
      };
      // Only a post in the other language can be this one's translation
      // (the language dropdown may have changed since it was picked).
      const translationOf = translationCandidates.some(p => p.id === form.translationOf) ? form.translationOf : "";
      // Only a draft -> published transition announces a post to newsletter
      // subscribers; edits to an already-live post never do.
      const wasPublished = !!editingId && !!posts.find(p => p.id === editingId)?.published;
      let savedId = editingId;
      if (editingId) {
        await updateDoc(doc(db, "blogs", editingId), { ...payload, translationOf: translationOf || deleteField(), updatedAt: serverTimestamp() });
      } else {
        const slug = await uniqueSlug(slugify(form.title));
        savedId = (await addDoc(collection(db, "blogs"), { ...payload, ...(translationOf ? { translationOf } : {}), slug, createdAt: serverTimestamp() })).id;
      }
      resetForm();
      if (published && !wasPublished && savedId) void announceToSubscribers(savedId);
    } catch (err) {
      console.error("Error saving post:", err);
      setError("Couldn't save the post. Please try again.");
    } finally {
      setSaving(false);
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
  // needs translating.
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
      setForm(f => ({ ...f, title: data.title, excerpt: data.excerpt, content: data.content, lang: "DE", translationOf: originalId }));
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
  // is gone (see firestore.rules), just untidy.
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
      await deleteDoc(doc(db, "blogs", post.id));
      if (post.image) deleteBlob(post.image);
      if (post.audioUrl) deleteBlob(post.audioUrl);
      purgeEngagement(post.id);
      if (editingId === post.id) resetForm();
    } catch (err) {
      console.error("Error deleting post:", err);
    }
  };

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

      <Card className="border-stone-100 mb-12">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">{editingId ? et.editTitle : et.newTitle}</CardTitle>
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
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
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

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">{et.imageLabel}</label>
              {form.image ? (
                <div className="relative w-fit">
                  <img src={form.image} className="h-28 rounded-lg object-cover" referrerPolicy="no-referrer" />
                  <button
                    type="button"
                    className="absolute -top-2 -right-2 bg-white rounded-full p-1.5 border border-stone-200 shadow-sm hover:text-red-600"
                    onClick={() => setForm(f => ({ ...f, image: "" }))}
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

          {error && <p className="text-sm text-red-600">{error}</p>}
          {notice && <p className="text-sm text-green-700">{notice}</p>}

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
            <Button
              type="button"
              variant="outline"
              disabled={saving || uploadingImage || uploadingAudio || !form.title.trim() || !form.content.trim()}
              onClick={() => handleSave(false)}
            >
              {saving ? et.saving : et.saveDraft}
            </Button>
            <Button
              type="button"
              disabled={saving || uploadingImage || uploadingAudio || !form.title.trim() || !form.content.trim()}
              onClick={() => handleSave(true)}
            >
              {saving ? et.saving : et.publish}
            </Button>
          </div>
        </CardContent>
      </Card>

      <h2 className="text-xl font-serif font-bold mb-4">{et.yourPosts}</h2>
      {posts.length === 0 ? (
        <p className="text-muted-foreground text-sm">{et.noPosts}</p>
      ) : (
        <div className="space-y-3">
          {posts.map(post => (
            <div key={post.id} className="flex items-center justify-between gap-4 p-4 rounded-xl border border-stone-100 bg-white">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={post.published ? "secondary" : "outline"} className="text-xs">
                    {post.published ? et.statusPublished : et.statusDraft}
                  </Badge>
                  <Badge variant="outline" className="text-xs">{post.lang}</Badge>
                  {hasTranslation(post) && <Badge variant="outline" className="text-xs">{et.translationLinked}</Badge>}
                </div>
                <p className="font-medium truncate">{post.title}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => startEdit(post)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="hover:text-red-600" onClick={() => handleDelete(post)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
