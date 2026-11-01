import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { User } from "firebase/auth";
import { AlertTriangle, CheckCircle2, Circle, ExternalLink, Eye, Languages, Plus, Send, ShieldCheck, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminApiError, adminFetch, describeError } from "./adminApi";
import { LIFECYCLE_LABEL, REVIEW_LABEL, founderName, type CourseData, type CourseDetail, type CourseText } from "./courseTypes";

// The course editor (/admin/courses/:id/edit). Changes autosave to the
// draft; nothing visitors see changes until the other founder approves the
// draft and someone presses Publish (api/_lib/adminCourses.ts).

const INPUT = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const TABS = ["Basics", "Schedule", "Price & booking", "Page text", "Banner"] as const;
type Tab = (typeof TABS)[number];

// Text fields translated by "Translate EN → DE", in this order.
const TEXT_KEYS: (keyof CourseText)[] = [
  "title", "summary", "time", "location", "price", "badge", "intro", "schedule", "duration", "format", "priceFact",
  "learnTitle", "benefitsTitle", "bookCta", "seoTitle", "seoDescription",
];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium text-stone-700">{label}</span>
      {children}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function ListEditor({ items, onChange, placeholder, max }: { items: string[]; onChange: (v: string[]) => void; placeholder: string; max: number }) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex gap-2">
          <input className={INPUT} value={item} onChange={e => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove"><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
      {items.length < max && (
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => onChange([...items, ""])}><Plus className="w-3.5 h-3.5" /> {placeholder}</Button>
      )}
    </div>
  );
}

function PageText({ lang, value, onChange }: { lang: "EN" | "DE"; value: CourseText; onChange: (v: CourseText) => void }) {
  const set = <K extends keyof CourseText>(key: K, v: CourseText[K]) => onChange({ ...value, [key]: v });
  const input = (key: keyof CourseText, label: string, hint?: string, long = false) => (
    <Field label={label} hint={hint}>
      {long
        ? <textarea rows={4} className={INPUT} value={value[key] as string} onChange={e => set(key, e.target.value as never)} />
        : <input className={INPUT} value={value[key] as string} onChange={e => set(key, e.target.value as never)} />}
    </Field>
  );
  return (
    <div className="space-y-4">
      <h3 className="font-semibold">{lang === "EN" ? "English" : "Deutsch"}</h3>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">Course card (home page)</p>
      {input("title", "Title")}
      {input("summary", "Short description", "1–2 sentences on the card.", true)}
      {input("time", "Schedule line", lang === "EN" ? "e.g. Starts 12 Jan · Tue 19:00 · 6 weeks" : "z. B. Ab 12. Jan. · Di 19:00 Uhr · 6 Wochen")}
      {input("location", "Where", lang === "EN" ? "e.g. Online (live)" : "z. B. Online (live)")}
      {input("price", "Price line", lang === "EN" ? "e.g. €69 · 6 sessions" : "z. B. 69 € · 6 Einheiten")}
      <p className="text-xs uppercase tracking-wide text-muted-foreground pt-2">Course page</p>
      {input("badge", "Badge above the title", lang === "EN" ? "e.g. Online · 6-Session Series" : "z. B. Online · Serie mit 6 Einheiten")}
      {input("intro", "Introduction", undefined, true)}
      {input("schedule", "Schedule (in full)")}
      {input("duration", "Duration")}
      {input("format", "Format", lang === "EN" ? "e.g. Live online via Google Meet — the link comes with your reminder" : undefined)}
      {input("priceFact", "Price (in full)", lang === "EN" ? "e.g. €69 for all 6 sessions" : undefined)}
      {input("learnTitle", "Heading: what you'll learn", "Optional; default “What You Will Learn”.")}
      <div className="grid gap-2 text-sm">
        <span className="font-medium text-stone-700">What you'll learn</span>
        {value.learnItems.map((item, i) => (
          <div key={i} className="grid gap-1 rounded-lg border border-stone-200 p-2">
            <input className={INPUT} placeholder="Heading" value={item.title} onChange={e => set("learnItems", value.learnItems.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
            <textarea rows={2} className={INPUT} placeholder="One or two sentences" value={item.description} onChange={e => set("learnItems", value.learnItems.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
            <Button type="button" variant="ghost" size="sm" className="justify-self-end" onClick={() => set("learnItems", value.learnItems.filter((_, j) => j !== i))}>Remove</Button>
          </div>
        ))}
        {value.learnItems.length < 8 && (
          <Button type="button" variant="outline" size="sm" className="gap-1 justify-self-start" onClick={() => set("learnItems", [...value.learnItems, { title: "", description: "" }])}><Plus className="w-3.5 h-3.5" /> Add item</Button>
        )}
      </div>
      {input("benefitsTitle", "Heading: why it helps", "Optional; default “Why It Helps”.")}
      <Field label="Why it helps"><ListEditor items={value.benefits} onChange={v => set("benefits", v)} placeholder="Add a point" max={10} /></Field>
      <Field label="How booking works" hint="Steps, in order."><ListEditor items={value.howSteps} onChange={v => set("howSteps", v)} placeholder="Add a step" max={8} /></Field>
      {input("bookCta", "Booking button", lang === "EN" ? "e.g. Book Your Place — €69" : "z. B. Platz buchen – 69 €")}
      <p className="text-xs uppercase tracking-wide text-muted-foreground pt-2">Search (Google)</p>
      {input("seoTitle", "Page title in search results", "Around 50–60 characters.")}
      {input("seoDescription", "Description in search results", "Around 150 characters.", true)}
    </div>
  );
}

export default function CourseEditorPage({ user }: { user: User }) {
  const { id = "" } = useParams<{ id: string }>();
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [data, setData] = useState<CourseData | null>(null);
  const [tab, setTab] = useState<Tab>("Basics");
  const [saveState, setSaveState] = useState<"saved" | "pending" | "saving" | "error" | "stale">("saved");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const versionRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef<CourseData | null>(null);

  const applyDetail = useCallback((d: CourseDetail, replaceData: boolean) => {
    setDetail(d);
    versionRef.current = d.version;
    if (replaceData) {
      setData(d.data);
      dataRef.current = d.data;
    }
  }, []);

  useEffect(() => {
    adminFetch<CourseDetail>(user, "course", { query: { id } })
      .then(d => applyDetail(d, true))
      .catch(err => setError(describeError(err)));
  }, [user, id, applyDetail]);

  const save = useCallback(async (): Promise<boolean> => {
    if (!dataRef.current) return true;
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
    setSaveState("saving");
    try {
      const d = await adminFetch<CourseDetail>(user, "course-save", { method: "POST", body: { id, version: versionRef.current, data: dataRef.current } });
      applyDetail(d, false);
      setSaveState("saved");
      return true;
    } catch (err) {
      setSaveState(err instanceof AdminApiError && err.code === "stale" ? "stale" : "error");
      setError(err instanceof AdminApiError && err.code === "stale"
        ? "Someone else changed this course meanwhile. Reload the page to see their version (your last change wasn't saved)."
        : describeError(err));
      return false;
    }
  }, [user, id, applyDetail]);

  const update = (next: CourseData) => {
    setData(next);
    dataRef.current = next;
    setSaveState("pending");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void save(); }, 1200);
  };

  // Don't lose an unsaved edit when leaving.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (timer.current) { e.preventDefault(); } };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const action = async (op: string, body: Record<string, unknown> = {}, done?: (d: CourseDetail) => string | null) => {
    setError(null);
    setNotice(null);
    if (!(await save())) return;
    setBusy(true);
    try {
      const d = await adminFetch<CourseDetail>(user, op, { method: "POST", body: { id, ...body } });
      applyDetail(d, false);
      setNote("");
      setNotice(done?.(d) ?? null);
    } catch (err) {
      const detailText = err instanceof AdminApiError ? err.code : "";
      setError(detailText === "own_submission" ? "The other founder approves: you sent this one." : describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const translate = async () => {
    if (!data) return;
    const hasGerman = TEXT_KEYS.some(k => String(data.DE[k]).trim());
    if (hasGerman && !window.confirm("Replace the German text with a fresh machine translation of the English?")) return;
    setBusy(true);
    setError(null);
    try {
      const en = data.EN;
      const texts = [
        ...TEXT_KEYS.map(k => String(en[k])),
        ...en.learnItems.flatMap(i => [i.title, i.description]),
        ...en.benefits,
        ...en.howSteps,
      ];
      const response = await fetch("/api/translate-post", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
        body: JSON.stringify({ texts }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(result.texts)) throw new Error(result.error || `HTTP ${response.status}`);
      const out: string[] = result.texts;
      let i = 0;
      const next: CourseText = { ...data.DE };
      for (const k of TEXT_KEYS) (next as Record<string, unknown>)[k] = out[i++] ?? "";
      next.learnItems = en.learnItems.map(() => ({ title: out[i++] ?? "", description: out[i++] ?? "" }));
      next.benefits = en.benefits.map(() => out[i++] ?? "");
      next.howSteps = en.howSteps.map(() => out[i++] ?? "");
      update({ ...data, DE: next });
      setNotice("German text translated. Please read it through and correct it before sending for approval.");
    } catch (err) {
      setError(`Translation failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  };

  if (error && !detail) return <p className="text-sm text-red-600">{error}</p>;
  if (!detail || !data) return null;

  const me = user.email ?? "";
  const r = detail.review;
  const blocking = detail.checklist.filter(c => c.blocking && !c.ok);
  const canApprove = r.status === "in_review" && r.submittedBy !== me;
  const canPublish = r.status === "approved" && r.approvedRevision === detail.revision && detail.publishedRevision !== detail.revision;
  const previewUrl = `/courses/${id}?preview=${encodeURIComponent(detail.previewToken)}`;
  const setD = (patch: Partial<CourseData>) => update({ ...data, ...patch });

  const sessionsEditor = (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">All times are German time (Europe/Berlin); summer/winter time is handled automatically.</p>
      {data.sessions.map((s, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 rounded-lg border border-stone-200 bg-white p-2">
          <Field label="Date"><input type="date" className={INPUT} value={s.date} onChange={e => setD({ sessions: data.sessions.map((x, j) => (j === i ? { ...x, date: e.target.value } : x)) })} /></Field>
          <Field label="From"><input type="time" className={INPUT} value={s.startTime} onChange={e => setD({ sessions: data.sessions.map((x, j) => (j === i ? { ...x, startTime: e.target.value } : x)) })} /></Field>
          <Field label="To"><input type="time" className={INPUT} value={s.endTime} onChange={e => setD({ sessions: data.sessions.map((x, j) => (j === i ? { ...x, endTime: e.target.value } : x)) })} /></Field>
          <Button type="button" variant="ghost" size="sm" onClick={() => setD({ sessions: data.sessions.filter((_, j) => j !== i) })} aria-label="Remove session"><Trash2 className="w-4 h-4" /></Button>
        </div>
      ))}
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => {
          const last = data.sessions[data.sessions.length - 1];
          setD({ sessions: [...data.sessions, last ? { ...last, meetUrl: "" } : { date: "", startTime: "19:00", endTime: "20:00", meetUrl: "" }] });
        }}><Plus className="w-3.5 h-3.5" /> Add session</Button>
        {data.sessions.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => {
            const weeks = Number(window.prompt("Repeat the last session weekly — how many more weeks?", "5"));
            if (!weeks || weeks < 1 || weeks > 30) return;
            const last = data.sessions[data.sessions.length - 1];
            if (!last.date) return;
            const added = Array.from({ length: weeks }, (_, k) => {
              const d = new Date(`${last.date}T12:00:00Z`);
              d.setUTCDate(d.getUTCDate() + 7 * (k + 1));
              return { ...last, date: d.toISOString().slice(0, 10), meetUrl: "" };
            });
            setD({ sessions: [...data.sessions, ...added] });
          }}>Repeat last weekly…</Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">Meet links are added on the course's overview page — they don't need approval.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link to={`/admin/courses/${id}`} className="text-sm text-muted-foreground hover:underline">← {data.EN.title || id}</Link>
        <span className="ml-auto text-xs text-muted-foreground">
          {saveState === "saving" ? "Saving…" : saveState === "pending" ? "Unsaved changes…" : saveState === "saved" ? "All changes saved" : saveState === "stale" ? "Not saved: reload" : "Not saved"}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="space-y-4 min-w-0">
          <div className="flex gap-1 overflow-x-auto border-b border-stone-200">
            {TABS.map(t => (
              <button key={t} className={`whitespace-nowrap px-3 py-2 text-sm -mb-px border-b-2 ${tab === t ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>

          {tab === "Basics" && (
            <div className="grid gap-4 max-w-xl">
              <Field label="Web address"><input className={INPUT} value={`/courses/${id}`} disabled /></Field>
              <Field label="Course type">
                <select className={INPUT} value={data.type} onChange={e => setD({ type: e.target.value as CourseData["type"] })}>
                  <option value="series">Series — one booking covers every session</option>
                  <option value="pickOne">Workshop on several dates — the booker picks one</option>
                </select>
              </Field>
              <Field label="Format">
                <select className={INPUT} value={data.format} onChange={e => setD({ format: e.target.value as CourseData["format"] })}>
                  <option value="online">Online (Google Meet)</option>
                  <option value="inPerson">In person</option>
                  <option value="hybrid">Hybrid</option>
                </select>
              </Field>
              {data.format !== "online" && (
                <Field label="Venue (address)"><input className={INPUT} value={data.venue} onChange={e => setD({ venue: e.target.value })} placeholder="e.g. Bürgertreff Scharnhauser Park, Ostfildern" /></Field>
              )}
              <Field label="Teacher">
                <select className={INPUT} value={data.instructor} onChange={e => setD({ instructor: e.target.value })}>
                  <option>Riju</option><option>Richa</option><option>Richa &amp; Riju</option>
                </select>
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={data.forChildren} onChange={e => setD({ forChildren: e.target.checked })} />
                For children — the booking form asks for a parent or guardian (same wording as the kids workshop)
              </label>
              <Field label="Contact email" hint="Shown for questions; default riju.kansal@niramay.me."><input type="email" className={INPUT} value={data.contactEmail} onChange={e => setD({ contactEmail: e.target.value })} /></Field>
              <Field label="Linked blog article (slug, optional)" hint="The part after /blog/ of an English post."><input className={INPUT} value={data.blogSlug} onChange={e => setD({ blogSlug: e.target.value.trim() })} /></Field>
            </div>
          )}

          {tab === "Schedule" && sessionsEditor}

          {tab === "Price & booking" && (
            <div className="grid gap-4 max-w-xl">
              <Field label="Price in €" hint={detail.booked > 0 ? "Locked: people have booked at this price." : undefined}>
                <input inputMode="decimal" className={INPUT} defaultValue={data.priceCents ? String(data.priceCents / 100).replace(".", ",") : ""} onChange={e => setD({ priceCents: Math.round(Number(e.target.value.replace(",", ".")) * 100) || 0 })} />
              </Field>
              <Field label="INR price for UPI (optional)" hint="e.g. ₹1500. Leave empty for EUR-only (Stripe)."><input className={INPUT} value={data.inrPrice} onChange={e => setD({ inrPrice: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Early-bird discount %"><input type="number" min={0} max={50} className={INPUT} value={data.earlyBirdPercent} onChange={e => setD({ earlyBirdPercent: Number(e.target.value) })} /></Field>
                <Field label="Early bird until (incl.)"><input type="date" className={INPUT} value={data.earlyBirdUntil} onChange={e => setD({ earlyBirdUntil: e.target.value })} /></Field>
              </div>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.alumniCodes} onChange={e => setD({ alumniCodes: e.target.checked })} /> Alumni codes allowed</label>
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.welcomeCodes} onChange={e => setD({ welcomeCodes: e.target.checked })} /> Newsletter welcome codes allowed</label>
              <Field label="Booking closes (optional)" hint="German time. Empty = when the first session starts (series) or each date starts (workshop).">
                <input type="datetime-local" className={INPUT} value={data.closesAt} onChange={e => setD({ closesAt: e.target.value })} />
              </Field>
              <Field label={data.type === "pickOne" ? "Seats per date (optional)" : "Seats (optional)"} hint="Empty = unlimited. Can be raised or removed any time.">
                <input type="number" min={1} className={INPUT} value={data.seatLimit ?? ""} onChange={e => setD({ seatLimit: e.target.value ? Number(e.target.value) : null })} />
              </Field>
            </div>
          )}

          {tab === "Page text" && (
            <div className="space-y-4">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={translate} disabled={busy}><Languages className="w-4 h-4" /> Translate EN → DE</Button>
              <div className="grid gap-8 xl:grid-cols-2">
                <PageText lang="EN" value={data.EN} onChange={v => setD({ EN: v })} />
                <PageText lang="DE" value={data.DE} onChange={v => setD({ DE: v })} />
              </div>
            </div>
          )}

          {tab === "Banner" && (
            <div className="grid gap-4 max-w-2xl">
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={data.banner.on} onChange={e => setD({ banner: { ...data.banner, on: e.target.checked } })} /> Show in the announcement bar and the home page hero</label>
              <Field label="Show until (incl.)"><input type="date" className={`${INPUT} max-w-xs`} value={data.banner.until} onChange={e => setD({ banner: { ...data.banner, until: e.target.value } })} /></Field>
              {(["EN", "DE"] as const).map(lang => (
                <div key={lang} className="grid gap-2 rounded-lg border border-stone-200 p-3">
                  <p className="font-medium text-sm">{lang === "EN" ? "English" : "Deutsch"}</p>
                  {([
                    ["label", "Bar text (laptop)"], ["short", "Bar text (phone, max 38 characters)"], ["cta", "Button"],
                    ["title", "Hero card title"], ["when", "Hero card: when"], ["detail", "Hero card: detail"],
                  ] as const).map(([key, label]) => (
                    <div key={key}>
                      <Field label={label}>
                        <input className={INPUT} maxLength={key === "short" ? 40 : 120} value={data.banner[lang][key]} onChange={e => setD({ banner: { ...data.banner, [lang]: { ...data.banner[lang], [key]: e.target.value } } })} />
                      </Field>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <section className="rounded-xl border border-stone-200 bg-white p-4 space-y-3 text-sm">
            <p>
              <span className="font-semibold">{REVIEW_LABEL[r.status]}</span> · {LIFECYCLE_LABEL[detail.lifecycle]}
              {detail.publishedRevision && detail.publishedRevision !== detail.revision && <span className="block text-xs text-amber-700">Changes since the published version.</span>}
            </p>
            {r.status === "in_review" && <p className="text-xs text-muted-foreground">Sent by {founderName(r.submittedBy)}; {founderName(r.submittedBy) === "Riju" ? "Richa" : "Riju"} approves.</p>}
            {r.status === "approved" && <p className="text-xs text-muted-foreground">Approved by {founderName(r.approvedBy)}.</p>}
            {r.note && <p className="text-xs bg-amber-50 border border-amber-200 rounded p-2">Note from {founderName(r.noteBy)}: {r.note}</p>}
            <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline"><Eye className="w-4 h-4" /> Preview the page <ExternalLink className="w-3 h-3" /></a>
            {detail.publishedRevision && <a href={`/courses/${id}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 underline">Live page <ExternalLink className="w-3 h-3" /></a>}

            {(r.status === "draft" || r.status === "changes_requested") && (
              <Button className="w-full gap-2" disabled={busy || blocking.length > 0} onClick={() => action("course-submit", {}, () => "Sent for approval. The other founder will see it on their dashboard.")}>
                <Send className="w-4 h-4" /> Send for approval
              </Button>
            )}
            {canApprove && (
              <div className="space-y-2">
                <textarea rows={2} className={INPUT} placeholder="Note (needed to request changes)" value={note} onChange={e => setNote(e.target.value)} />
                <Button className="w-full gap-2" disabled={busy || blocking.length > 0} onClick={() => action("course-approve", { revision: detail.revision, note }, () => "Approved. It can now be published.")}><ShieldCheck className="w-4 h-4" /> Approve this version</Button>
                <Button variant="outline" className="w-full" disabled={busy || !note.trim()} onClick={() => action("course-request-changes", { note })}>Request changes</Button>
              </div>
            )}
            {canPublish && (
              <Button className="w-full gap-2" disabled={busy || detail.locked.length > 0} onClick={() => action("course-publish", {}, d => d.rebuild === "started" ? "Published. The page is live; search engines get the updated page after the rebuild (a few minutes)." : d.rebuild === "not_configured" ? "Published. The page is live. (Automatic rebuild isn't set up yet, so the pre-rendered version updates with the next deploy.)" : d.rebuild === "failed" ? "Published, but the site rebuild didn't start. The page is live; the search-engine version updates with the next deploy." : "Published.")}>
                <Upload className="w-4 h-4" /> Publish
              </Button>
            )}
            {detail.locked.length > 0 && <p className="text-xs text-red-700">People have booked, so these can't change: {detail.locked.join(", ")}. Undo them to publish.</p>}
            {notice && <p className="text-xs text-green-800 bg-green-50 border border-green-200 rounded p-2">{notice}</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </section>

          <section className="rounded-xl border border-stone-200 bg-white p-4 text-sm space-y-2">
            <p className="font-semibold">Publish checklist</p>
            <ul className="space-y-1.5">
              {detail.checklist.map(c => (
                <li key={c.id} className="flex items-start gap-2 text-xs">
                  {c.ok ? <CheckCircle2 className="w-4 h-4 text-green-700 shrink-0" /> : c.blocking ? <Circle className="w-4 h-4 text-red-600 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />}
                  <span>{c.label}</span>
                </li>
              ))}
            </ul>
            <p className="text-[11px] text-muted-foreground">Updates after each save.</p>
          </section>

          {detail.warnings.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 text-xs space-y-2">
              <p className="font-semibold text-sm">Health-claims check</p>
              {detail.warnings.map((w, i) => (
                <p key={i}>{w.message}{w.excerpt && <span className="block text-muted-foreground">“{w.excerpt}”</span>}</p>
              ))}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
