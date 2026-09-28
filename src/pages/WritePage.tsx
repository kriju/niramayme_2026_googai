import React, { useState, useEffect } from "react";
import { Upload, Trash2, LogOut, Lock, Pencil } from "lucide-react";
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
import { SITE_URL, useSeo } from "../lib/seo";

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
  ["Enter", "Starts a new paragraph"],
];
const EMPTY_POST_FORM = { title: "", excerpt: "", content: "", category: BLOG_CATEGORIES[0], image: "", audioUrl: "", lang: "EN" as "EN" | "DE" };

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
  const [error, setError] = useState<string | null>(null);

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
    });
    setError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpload = async (file: File, kind: "image" | "audio") => {
    const setUploading = kind === "image" ? setUploadingImage : setUploadingAudio;
    setUploading(true);
    setError(null);
    try {
      // api/blog-upload.ts is the actual security boundary — it checks this
      // ID token against the two-account allowlist before issuing a token
      // the browser can upload with, since the client never holds Vercel
      // Blob's write token directly.
      const idToken = await user.getIdToken();
      const path = `blog-media/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      const blob = await uploadBlob(path, file, {
        access: "public",
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
    setSaving(true);
    setError(null);
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
      if (editingId) {
        await updateDoc(doc(db, "blogs", editingId), { ...payload, updatedAt: serverTimestamp() });
      } else {
        const slug = await uniqueSlug(slugify(form.title));
        await addDoc(collection(db, "blogs"), { ...payload, slug, createdAt: serverTimestamp() });
      }
      resetForm();
    } catch (err) {
      console.error("Error saving post:", err);
      setError("Couldn't save the post. Please try again.");
    } finally {
      setSaving(false);
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

  const handleDelete = async (post: BlogPostDoc) => {
    if (!window.confirm(et.deleteConfirm)) return;
    try {
      await deleteDoc(doc(db, "blogs", post.id));
      if (post.image) deleteBlob(post.image);
      if (post.audioUrl) deleteBlob(post.audioUrl);
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
                    accept="audio/*"
                    className="hidden"
                    disabled={uploadingAudio}
                    onChange={e => { const file = e.target.files?.[0]; if (file) handleUpload(file, "audio"); e.target.value = ""; }}
                  />
                </label>
              )}
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

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
  useEffect(() => {
    let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
    const created = !meta;
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "robots");
      document.head.appendChild(meta);
    }
    meta.setAttribute("content", "noindex, nofollow");
    return () => {
      if (created) meta?.remove();
      else meta?.setAttribute("content", "index, follow");
    };
  }, []);

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-stone-50">
      {user ? <WriteDashboard user={user} /> : <LoginForm />}
    </div>
  );
}
