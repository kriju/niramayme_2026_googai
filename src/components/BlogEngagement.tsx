import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  Link2,
  Mail,
  Check,
  LoaderCircle,
  Reply,
  Eye,
  EyeOff,
  Trash2,
  MessageSquare,
  BadgeCheck,
  Facebook,
  Linkedin,
  Twitter,
  MessageCircle,
} from "lucide-react";
import { collection, doc, getDoc, getDocs, limit, orderBy, query, where } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { db } from "../lib/firebase";
import { useAuth } from "../lib/auth";
import { TRANSLATIONS, BLOG_ADMIN_USERNAMES, usernameToLoginEmail } from "../constants";

// Likes/dislikes, sharing and comments under a blog post. Split into its own
// lazily-loaded chunk (see BlogPostPage) since it's below the fold — the
// article itself renders without waiting on any of this.
//
// Everything that writes goes through /api/blog-vote and /api/blog-comments;
// the browser only ever reads Firestore directly (see firestore.rules).

type Lang = "EN" | "DE";
type T = (typeof TRANSLATIONS)["EN"]["engagement"];
type ErrorKey = keyof T["errors"];
type Vote = "like" | "dislike" | "none";
type CommentStatus = "visible" | "pending" | "hidden";

type BlogComment = {
  id: string;
  content: string;
  name: string | null;
  parentId: string | null;
  isAuthor: boolean;
  status: CommentStatus;
  createdAt: number;
};

// UI gating only — the API re-verifies the Firebase ID token server-side
// (api/_lib/blogAuth.ts), so faking this in devtools shows buttons that fail.
const ADMIN_EMAILS = BLOG_ADMIN_USERNAMES.map(usernameToLoginEmail);

const MAX_CONTENT = 2000;
const MAX_NAME = 60;
const COMMENTS_PAGE = 20;

// ---------------------------------------------------------------------------
// Small helpers

// localStorage can throw (Safari private mode, blocked site data); every
// access degrades to in-memory state for the session instead of breaking.
const memoryStore = new Map<string, string>();
const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return memoryStore.get(key) ?? null;
    }
  },
  set(key: string, value: string) {
    try {
      localStorage.setItem(key, value);
    } catch {
      memoryStore.set(key, value);
    }
  },
};

function randomId(): string {
  // randomUUID needs a secure context (https/localhost); getRandomValues
  // doesn't, and exists in every browser this site supports.
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getVoterId(): string {
  let id = storage.get("niramay-voter-id");
  if (!id || !/^[A-Za-z0-9-]{16,64}$/.test(id)) {
    id = randomId();
    storage.set("niramay-voter-id", id);
  }
  return id;
}

function getStoredVotes(): Record<string, Vote> {
  try {
    const parsed = JSON.parse(storage.get("niramay-votes") || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function storeVote(blogId: string, vote: Vote) {
  const votes = getStoredVotes();
  if (vote === "none") delete votes[blogId];
  else votes[blogId] = vote;
  storage.set("niramay-votes", JSON.stringify(votes));
}

class ApiError extends Error {
  constructor(public code: string) {
    super(code);
  }
}

// fetch() rejects only on network failure; everything else is a response we
// still have to inspect — including a non-JSON error page from the platform.
async function callApi<R>(url: string, init: RequestInit): Promise<R> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new ApiError("network");
  }
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // fall through with data = null
  }
  if (!res.ok) throw new ApiError(typeof data?.error === "string" ? data.error : "generic");
  return data as R;
}

function errorMessage(t: T, err: unknown): string {
  const code = err instanceof ApiError ? err.code : "generic";
  return t.errors[(code in t.errors ? code : "generic") as ErrorKey];
}

function toComment(id: string, data: Record<string, any>): BlogComment {
  return {
    id,
    content: String(data.content ?? ""),
    name: typeof data.name === "string" && data.name ? data.name : null,
    parentId: typeof data.parentId === "string" ? data.parentId : null,
    isAuthor: data.isAuthor === true,
    status: (data.status as CommentStatus) ?? "visible",
    createdAt: typeof data.createdAt === "number" ? data.createdAt : data.createdAt?.toMillis?.() ?? Date.now(),
  };
}

// ---------------------------------------------------------------------------

export default function BlogEngagement({ blogId, title, url, lang }: { blogId: string; title: string; url: string; lang: Lang }) {
  return (
    <div className="mb-16">
      <ReactionBar blogId={blogId} title={title} url={url} lang={lang} />
      <CommentsSection blogId={blogId} lang={lang} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Likes / dislikes + share

function ReactionBar({ blogId, title, url, lang }: { blogId: string; title: string; url: string; lang: Lang }) {
  const t = TRANSLATIONS[lang].engagement;
  const [counts, setCounts] = useState<{ likes: number; dislikes: number } | null>(null);
  const [myVote, setMyVote] = useState<Vote>(() => getStoredVotes()[blogId] ?? "none");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setMyVote(getStoredVotes()[blogId] ?? "none");
    getDoc(doc(db, "blogStats", blogId))
      .then((snap) => {
        if (cancelled) return;
        const d = snap.data();
        setCounts({ likes: Number(d?.likes) || 0, dislikes: Number(d?.dislikes) || 0 });
      })
      // Counts are a nicety — on failure the buttons still work, just
      // without numbers until the first successful vote returns fresh ones.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [blogId]);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const castVote = async (clicked: "like" | "dislike") => {
    if (pending) return;
    const previous = myVote;
    const previousCounts = counts;
    const next: Vote = previous === clicked ? "none" : clicked;

    // Optimistic: reflect the click immediately, roll back if the server
    // refuses. Buttons stay disabled while in flight so rapid clicks can't
    // race each other into an inconsistent local state.
    setMyVote(next);
    if (counts) {
      setCounts({
        likes: Math.max(0, counts.likes + (next === "like" ? 1 : 0) - (previous === "like" ? 1 : 0)),
        dislikes: Math.max(0, counts.dislikes + (next === "dislike" ? 1 : 0) - (previous === "dislike" ? 1 : 0)),
      });
    }
    setPending(true);
    setError(null);
    try {
      const result = await callApi<{ likes: number; dislikes: number; vote: Vote }>("/api/blog-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blogId, voterId: getVoterId(), vote: next }),
      });
      setCounts({ likes: result.likes, dislikes: result.dislikes });
      setMyVote(result.vote);
      storeVote(blogId, result.vote);
    } catch (err) {
      setMyVote(previous);
      setCounts(previousCounts);
      setError(err instanceof ApiError && err.code === "rate_limited" ? t.errors.rate_limited : t.voteError);
    } finally {
      setPending(false);
    }
  };

  const voteButton = (kind: "like" | "dislike") => {
    const active = myVote === kind;
    const Icon = kind === "like" ? ThumbsUp : ThumbsDown;
    const count = counts ? (kind === "like" ? counts.likes : counts.dislikes) : null;
    return (
      <button
        type="button"
        onClick={() => castVote(kind)}
        disabled={pending}
        aria-pressed={active}
        aria-label={active ? (kind === "like" ? t.likedAria : t.dislikedAria) : kind === "like" ? t.like : t.dislike}
        title={kind === "like" ? t.like : t.dislike}
        className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60 ${
          active ? "border-primary bg-primary/10 text-primary" : "border-stone-200 text-stone-600 hover:border-primary/40 hover:text-primary"
        }`}
      >
        <Icon className={`w-4 h-4 ${active ? "fill-current" : ""}`} />
        {count !== null && <span className="tabular-nums">{count}</span>}
      </button>
    );
  };

  return (
    <div className="pb-8 mb-10 border-b border-stone-100">
      <div className="flex flex-wrap items-center gap-3">
        {voteButton("like")}
        {voteButton("dislike")}
        <div className="ml-auto">
          <ShareMenu title={title} url={url} lang={lang} />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

// Uses the device's native share sheet where there is one (mobile), and
// otherwise plain share-intent links. No social SDKs are loaded: they'd
// cost page weight and set third-party cookies before any consent.
function ShareMenu({ title, url, lang }: { title: string; url: string; lang: Lang }) {
  const t = TRANSLATIONS[lang].engagement;
  const [open, setOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timer = setTimeout(() => setCopyState("idle"), 3000);
    return () => clearTimeout(timer);
  }, [copyState]);

  const handleShare = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (err) {
        // The visitor closing the share sheet isn't an error.
        if ((err as DOMException)?.name === "AbortError") return;
        // Otherwise (e.g. share blocked in an embedded webview) fall
        // through to the link menu below.
      }
    }
    setOpen((o) => !o);
  };

  const copyLink = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(url);
      setCopyState("copied");
    } catch {
      // Clipboard API is unavailable on insecure origins and in some
      // webviews; select the visible URL field so a manual copy is one step.
      inputRef.current?.select();
      setCopyState("failed");
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);
  const links = [
    { label: "WhatsApp", icon: MessageCircle, href: `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}` },
    { label: "Facebook", icon: Facebook, href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}` },
    { label: "X", icon: Twitter, href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}` },
    { label: "LinkedIn", icon: Linkedin, href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}` },
    { label: t.email, icon: Mail, href: `mailto:?subject=${encodedTitle}&body=${encodeURIComponent(`${title}\n\n${url}`)}` },
  ];

  return (
    <div className="relative" ref={containerRef}>
      <Button type="button" variant="outline" className="rounded-full gap-2" onClick={handleShare} aria-expanded={open} aria-haspopup="true">
        <Share2 className="w-4 h-4" />
        {t.share}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-label={t.shareTitle}
          className="absolute right-0 z-20 mt-2 w-72 max-w-[calc(100vw-3rem)] rounded-2xl border border-stone-100 bg-white p-4 shadow-lg"
        >
          <p className="text-sm font-semibold mb-3">{t.shareTitle}</p>
          <div className="flex gap-2 mb-3">
            <input
              ref={inputRef}
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              aria-label={t.copyLink}
              className="min-w-0 flex-1 rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5 text-xs text-stone-600"
            />
            <Button type="button" size="sm" variant="outline" onClick={copyLink} className="shrink-0 gap-1" aria-label={t.copyLink}>
              {copyState === "copied" ? <Check className="w-4 h-4 text-green-600" /> : <Link2 className="w-4 h-4" />}
            </Button>
          </div>
          <p aria-live="polite" className="text-xs mb-2 min-h-4">
            {copyState === "copied" && <span className="text-green-700">{t.linkCopied}</span>}
            {copyState === "failed" && <span className="text-red-600">{t.copyFailed}</span>}
          </p>
          <ul className="grid gap-1">
            {links.map((l) => (
              <li key={l.label}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-stone-50 transition-colors"
                >
                  <l.icon className="w-4 h-4 text-primary" />
                  {l.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Comments

function CommentsSection({ blogId, lang }: { blogId: string; lang: Lang }) {
  const t = TRANSLATIONS[lang].engagement;
  const { user, loading: authLoading } = useAuth();
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email);
  const sectionRef = useRef<HTMLElement>(null);
  const deepLinked = typeof window !== "undefined" && window.location.hash === "#comments";
  // Comments are only fetched once the section is about to scroll into
  // view, so visitors who read the post and leave cost zero comment reads.
  const [inView, setInView] = useState(deepLinked);
  const [state, setState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [visibleCount, setVisibleCount] = useState(COMMENTS_PAGE);

  useEffect(() => {
    if (inView) return;
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [inView]);

  const load = useCallback(async () => {
    setState("loading");
    try {
      const col = collection(db, "blogs", blogId, "comments");
      // Newest first so the cap never hides recent comments. Visitors must
      // filter on status for firestore.rules to accept the query; authors
      // see everything so they can publish held comments.
      const q = isAdmin
        ? query(col, orderBy("createdAt", "desc"), limit(500))
        : query(col, where("status", "==", "visible"), orderBy("createdAt", "desc"), limit(300));
      const snap = await getDocs(q);
      setComments(snap.docs.map((d) => toComment(d.id, d.data())));
      setState("ready");
    } catch (err) {
      console.error("Error loading comments:", err);
      setState("error");
    }
  }, [blogId, isAdmin]);

  // Waits for auth to settle so an author's first load already includes
  // pending/hidden comments, instead of loading twice.
  useEffect(() => {
    if (!inView || authLoading) return;
    load();
  }, [inView, authLoading, load]);

  // The router's ScrollManager runs before this lazy section exists, so an
  // emailed "#comments" link would otherwise land at the top of the post.
  useEffect(() => {
    if (deepLinked && state === "ready") {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const { topLevel, repliesByParent } = useMemo(() => {
    const top = comments.filter((c) => !c.parentId);
    const ids = new Set(top.map((c) => c.id));
    const replies = new Map<string, BlogComment[]>();
    comments
      // A reply whose parent was hidden/deleted/not loaded has nothing to
      // hang under — drop it rather than show an orphan out of context.
      .filter((c) => c.parentId && ids.has(c.parentId))
      .sort((a, b) => a.createdAt - b.createdAt)
      .forEach((c) => replies.set(c.parentId!, [...(replies.get(c.parentId!) ?? []), c]));
    return { topLevel: top, repliesByParent: replies };
  }, [comments]);

  // What a visitor would count: visible comments plus visible replies whose
  // parent is itself visible.
  const visibleTotal = useMemo(() => {
    const visibleTop = new Set(topLevel.filter((c) => c.status === "visible").map((c) => c.id));
    return comments.filter((c) => c.status === "visible" && (c.parentId ? visibleTop.has(c.parentId) : true)).length;
  }, [comments, topLevel]);

  const upsert = (comment: BlogComment) =>
    setComments((prev) => (prev.some((c) => c.id === comment.id) ? prev.map((c) => (c.id === comment.id ? comment : c)) : [comment, ...prev]));

  const authHeader = async (): Promise<Record<string, string>> => {
    if (!user) throw new ApiError("unauthorized");
    return { Authorization: `Bearer ${await user.getIdToken()}` };
  };

  const moderate = async (comment: BlogComment, action: "show" | "hide" | "delete") => {
    if (action === "delete" && !window.confirm(t.deleteConfirm)) return;
    const result = await callApi<{ status?: CommentStatus; deleted?: boolean }>("/api/blog-comments", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...(await authHeader()) },
      body: JSON.stringify({ blogId, commentId: comment.id, action }),
    });
    if (result.deleted) {
      setComments((prev) => prev.filter((c) => c.id !== comment.id && c.parentId !== comment.id));
    } else if (result.status) {
      upsert({ ...comment, status: result.status });
    }
  };

  return (
    <section id="comments" ref={sectionRef} className="scroll-mt-28" aria-labelledby="comments-title">
      <h2 id="comments-title" className="text-2xl font-serif font-bold mb-6 flex items-center gap-2">
        <MessageSquare className="w-6 h-6 text-primary" />
        {t.commentsTitle}
        {state === "ready" && <span className="text-stone-400 font-sans text-lg font-normal">({visibleTotal})</span>}
      </h2>

      {isAdmin && <p className="text-sm text-primary bg-primary/5 rounded-xl px-4 py-2 mb-6">{t.moderationHint}</p>}

      <CommentForm blogId={blogId} lang={lang} isAdmin={isAdmin} authHeader={authHeader} onPosted={upsert} />

      <div className="mt-10" aria-live="polite" aria-busy={state === "loading"}>
        {(state === "idle" || state === "loading") && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="w-4 h-4 animate-spin" />
            {t.commentsLoading}
          </p>
        )}
        {state === "error" && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-red-600">{t.commentsLoadError}</span>
            <Button type="button" size="sm" variant="outline" onClick={load}>
              {t.retry}
            </Button>
          </div>
        )}
        {state === "ready" && topLevel.length === 0 && <p className="text-muted-foreground">{t.noComments}</p>}
        {state === "ready" && topLevel.length > 0 && (
          <ul className="space-y-6">
            {topLevel.slice(0, visibleCount).map((c) => (
              <li key={c.id}>
                <CommentItem
                  comment={c}
                  lang={lang}
                  isAdmin={isAdmin}
                  onModerate={moderate}
                  renderReply={
                    isAdmin && c.status === "visible"
                      ? (close) => <ReplyForm blogId={blogId} parentId={c.id} lang={lang} authHeader={authHeader} onPosted={upsert} onClose={close} />
                      : undefined
                  }
                />
                {(repliesByParent.get(c.id)?.length ?? 0) > 0 && (
                  <ul className="mt-4 ml-6 sm:ml-12 space-y-4 border-l-2 border-primary/10 pl-4 sm:pl-6">
                    {repliesByParent.get(c.id)!.map((r) => (
                      <li key={r.id}>
                        <CommentItem comment={r} lang={lang} isAdmin={isAdmin} onModerate={moderate} />
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        {state === "ready" && topLevel.length > visibleCount && (
          <Button type="button" variant="outline" className="rounded-full mt-8" onClick={() => setVisibleCount((n) => n + COMMENTS_PAGE)}>
            {t.showMore} ({topLevel.length - visibleCount})
          </Button>
        )}
      </div>
    </section>
  );
}

function CommentItem({
  comment,
  lang,
  isAdmin,
  onModerate,
  renderReply,
}: {
  comment: BlogComment;
  lang: Lang;
  isAdmin: boolean;
  onModerate: (c: BlogComment, action: "show" | "hide" | "delete") => Promise<void>;
  // Only top-level, visible comments get one (see api/blog-comments.ts).
  renderReply?: (close: () => void) => React.ReactNode;
}) {
  const t = TRANSLATIONS[lang].engagement;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [replying, setReplying] = useState(false);

  const run = async (action: "show" | "hide" | "delete") => {
    setBusy(true);
    setError(null);
    try {
      await onModerate(comment, action);
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setBusy(false);
    }
  };

  const displayName = comment.name || t.anonymous;
  const date = new Date(comment.createdAt).toLocaleDateString(lang === "DE" ? "de-DE" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <article
      className={`rounded-2xl border p-5 ${
        comment.isAuthor ? "border-primary/20 bg-primary/5" : "border-stone-100 bg-white"
      } ${comment.status !== "visible" ? "opacity-70 border-dashed" : ""}`}
    >
      <header className="flex flex-wrap items-center gap-2 mb-2">
        <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${comment.isAuthor ? "bg-primary text-white" : "bg-stone-100 text-stone-600"}`}>
          {comment.name ? comment.name[0].toUpperCase() : "?"}
        </span>
        <span className={`font-semibold ${comment.name ? "" : "italic text-stone-500"}`}>{displayName}</span>
        {comment.isAuthor && (
          <span className="inline-flex items-center gap-1 text-xs font-medium text-primary bg-white border border-primary/20 rounded-full px-2 py-0.5">
            <BadgeCheck className="w-3.5 h-3.5" />
            {t.authorBadge}
          </span>
        )}
        <time className="text-sm text-stone-400" dateTime={new Date(comment.createdAt).toISOString()}>
          {date}
        </time>
        {isAdmin && comment.status !== "visible" && (
          <span className="text-xs font-medium rounded-full px-2 py-0.5 bg-amber-100 text-amber-800">
            {comment.status === "pending" ? t.statusPending : t.statusHidden}
          </span>
        )}
      </header>

      {/* Plain text only: React escapes it, and whitespace-pre-line keeps the
          visitor's line breaks without ever interpreting markup. */}
      <p className="text-stone-700 leading-relaxed whitespace-pre-line break-words">{comment.content}</p>

      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {renderReply && !replying && (
            <Button type="button" size="sm" variant="ghost" className="gap-1" onClick={() => setReplying(true)}>
              <Reply className="w-4 h-4" />
              {t.reply}
            </Button>
          )}
          {comment.status !== "visible" ? (
            <Button type="button" size="sm" variant="ghost" className="gap-1" disabled={busy} onClick={() => run("show")}>
              <Eye className="w-4 h-4" />
              {comment.status === "pending" ? t.approve : t.unhide}
            </Button>
          ) : (
            <Button type="button" size="sm" variant="ghost" className="gap-1" disabled={busy} onClick={() => run("hide")}>
              <EyeOff className="w-4 h-4" />
              {t.hide}
            </Button>
          )}
          <Button type="button" size="sm" variant="ghost" className="gap-1 hover:text-red-600" disabled={busy} onClick={() => run("delete")}>
            <Trash2 className="w-4 h-4" />
            {t.delete}
          </Button>
          {error && (
            <span role="alert" className="text-sm text-red-600">
              {error}
            </span>
          )}
        </div>
      )}

      {replying && renderReply && <div className="mt-4">{renderReply(() => setReplying(false))}</div>}
    </article>
  );
}

const inputClass =
  "w-full rounded-xl border border-stone-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-stone-50 disabled:text-stone-400 transition-all";

function CommentForm({
  blogId,
  lang,
  isAdmin,
  authHeader,
  onPosted,
}: {
  blogId: string;
  lang: Lang;
  isAdmin: boolean;
  authHeader: () => Promise<Record<string, string>>;
  onPosted: (c: BlogComment) => void;
}) {
  const t = TRANSLATIONS[lang].engagement;
  const { profile } = useAuth();
  const [name, setName] = useState(() => storage.get("niramay-comment-name") ?? "");
  const [anonymous, setAnonymous] = useState(false);
  const [content, setContent] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // Stable across retries of the same text, so a resend after a dropped
  // response can't create a duplicate; renewed after each success.
  const commentIdRef = useRef(randomId());

  // Signed-in visitors get their account name prefilled (still editable,
  // and they can still choose to post anonymously).
  useEffect(() => {
    if (!name && profile?.displayName) setName(profile.displayName);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.displayName]);

  const trimmedLength = content.trim().length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setNotice(null);

    if (trimmedLength < 2 || trimmedLength > MAX_CONTENT) return setError(t.errors.invalid_content);
    if (!isAdmin && !anonymous && !name.trim()) return setError(t.errors.name_required);

    setSubmitting(true);
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (isAdmin) Object.assign(headers, await authHeader());
      const result = await callApi<{ comment?: Record<string, any>; status?: string }>("/api/blog-comments", {
        method: "POST",
        headers,
        body: JSON.stringify({
          blogId,
          commentId: commentIdRef.current,
          content,
          name: anonymous ? null : name.trim(),
          anonymous,
          website,
        }),
      });
      if (!anonymous && !isAdmin) storage.set("niramay-comment-name", name.trim());
      const comment = result.comment ? toComment(result.comment.id, result.comment) : null;
      if (comment && (comment.status === "visible" || isAdmin)) onPosted(comment);
      setNotice(comment?.status === "visible" ? t.posted : t.pendingNotice);
      setContent("");
      commentIdRef.current = randomId();
    } catch (err) {
      // Text stays in the textarea on every failure path.
      setError(errorMessage(t, err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-stone-100 bg-stone-50 p-5 sm:p-6 space-y-4" noValidate>
      <h3 className="font-semibold">{t.formTitle}</h3>

      {!isAdmin && (
        <div className="grid gap-3 sm:grid-cols-2 sm:items-end">
          <div className="space-y-1.5">
            <label htmlFor="comment-name" className="text-sm font-medium text-stone-600">
              {t.nameLabel}
            </label>
            <input
              id="comment-name"
              autoComplete="name"
              maxLength={MAX_NAME}
              disabled={anonymous}
              placeholder={t.namePlaceholder}
              className={inputClass}
              value={anonymous ? "" : name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex items-start gap-2 text-sm pb-2">
            <input
              id="comment-anonymous"
              type="checkbox"
              className="mt-0.5 accent-primary"
              checked={anonymous}
              onChange={(e) => setAnonymous(e.target.checked)}
              aria-describedby="comment-anonymous-hint"
            />
            <div>
              <label htmlFor="comment-anonymous" className="cursor-pointer select-none">
                {t.anonymousLabel}
              </label>
              <p id="comment-anonymous-hint" className="text-xs text-muted-foreground">
                {t.anonymousHint}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Honeypot — invisible to people and screen readers, tempting to bots. */}
      <div aria-hidden="true" style={{ position: "absolute", left: "-10000px", width: 1, height: 1, overflow: "hidden" }}>
        <label>
          Website
          <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
        </label>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="comment-content" className="text-sm font-medium text-stone-600">
          {t.commentLabel}
        </label>
        <textarea
          id="comment-content"
          rows={4}
          maxLength={MAX_CONTENT}
          placeholder={t.commentPlaceholder}
          className={`${inputClass} resize-y`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-between gap-4 text-xs text-muted-foreground">
          <span>{t.publicNotice}</span>
          <span className="tabular-nums shrink-0">
            {MAX_CONTENT - content.length} {t.charsLeft}
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="text-sm text-green-700">
          {notice}
        </p>
      )}

      <Button type="submit" className="rounded-full gap-2" disabled={submitting || trimmedLength === 0}>
        {submitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
        {submitting ? t.submitting : t.submit}
      </Button>
    </form>
  );
}

function ReplyForm({
  blogId,
  parentId,
  lang,
  authHeader,
  onPosted,
  onClose,
}: {
  blogId: string;
  parentId: string;
  lang: Lang;
  authHeader: () => Promise<Record<string, string>>;
  onPosted: (c: BlogComment) => void;
  onClose: () => void;
}) {
  const t = TRANSLATIONS[lang].engagement;
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const commentIdRef = useRef(randomId());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const trimmed = content.trim().length;
    if (trimmed < 2 || trimmed > MAX_CONTENT) return setError(t.errors.invalid_content);
    setSubmitting(true);
    setError(null);
    try {
      const result = await callApi<{ comment: Record<string, any> }>("/api/blog-comments", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ blogId, commentId: commentIdRef.current, parentId, content }),
      });
      onPosted(toComment(result.comment.id, result.comment));
      setContent("");
      commentIdRef.current = randomId();
      onClose();
    } catch (err) {
      setError(errorMessage(t, err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2" noValidate>
      <textarea
        autoFocus
        rows={3}
        maxLength={MAX_CONTENT}
        placeholder={t.replyPlaceholder}
        aria-label={t.replyPlaceholder}
        className={`${inputClass} resize-y`}
        value={content}
        onChange={(e) => setContent(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="rounded-full gap-2" disabled={submitting || !content.trim()}>
          {submitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
          {t.sendReply}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onClose} disabled={submitting}>
          {t.cancel}
        </Button>
      </div>
    </form>
  );
}
