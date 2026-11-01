import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { User } from "firebase/auth";
import { Download, ExternalLink, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch, berlinDateTime, describeError, euro } from "./adminApi";
import { LIFECYCLE_LABEL, REVIEW_LABEL, type CourseDetail, type Roster } from "./courseTypes";

// /admin/courses/:id — sessions with their Meet links, the participant list
// and the actions that need no approval (close/reopen booking, archive).

const STATUS_LABEL: Record<Roster["participants"][number]["status"], string> = {
  paid: "Paid",
  upi_claimed: "UPI reported",
  in_checkout: "In checkout",
  unpaid: "Not paid",
};
const INPUT = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";

function csvCell(value: string): string {
  return /[",\n;]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export default function CourseOverviewPage({ user }: { user: User }) {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<CourseDetail | null>(null);
  const [roster, setRoster] = useState<Roster | null>(null);
  const [links, setLinks] = useState<{ meetUrl: string; sessions: Record<string, string> }>({ meetUrl: "", sessions: {} });
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await adminFetch<CourseDetail>(user, "course", { query: { id } });
      setDetail(d);
      setLinks({
        meetUrl: d.data.meetUrl,
        sessions: Object.fromEntries(d.sessionIds.map((sid, i) => [sid, d.data.sessions[i]?.meetUrl ?? ""])),
      });
      if (d.publishedRevision) setRoster(await adminFetch<Roster>(user, "course-roster", { query: { id } }));
    } catch (err) {
      setError(describeError(err));
    }
  }, [user, id]);
  useEffect(() => { void load(); }, [load]);

  const run = async (op: string, body: Record<string, unknown>, message: string, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await adminFetch(user, op, { method: "POST", body: { id, ...body } });
      if (op === "course-delete-draft") {
        navigate("/admin/courses");
        return;
      }
      setNotice(message);
      await load();
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const counts = useMemo(() => {
    const taken = (roster?.participants ?? []).filter(p => p.status === "paid" || p.status === "upi_claimed");
    return {
      total: taken.length,
      bySession: Object.fromEntries((roster?.sessions ?? []).map(s => [s.id, taken.filter(p => p.session === s.id).length])),
      paidCents: taken.reduce((sum, p) => sum + p.amountCents, 0),
    };
  }, [roster]);

  const exportCsv = () => {
    if (!roster) return;
    const rows = [
      ["Reference", "Name", "Email", "WhatsApp", "Date", "Status", "Paid (EUR)", "Language"],
      ...roster.participants
        .filter(p => p.status === "paid" || p.status === "upi_claimed")
        .map(p => [p.ref, p.name, p.email, p.whatsapp, p.session ?? "", STATUS_LABEL[p.status], (p.amountCents / 100).toFixed(2), p.lang]),
    ];
    const blob = new Blob(["﻿" + rows.map(r => r.map(csvCell).join(";")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `participants-${id}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (error && !detail) return <p className="text-sm text-red-600">{error}</p>;
  if (!detail) return null;
  const published = Boolean(detail.publishedRevision);

  return (
    <div className="space-y-6">
      <Link to="/admin/courses" className="text-sm text-muted-foreground hover:underline">← Courses</Link>
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-2xl font-bold">{detail.data.EN.title || id}</h1>
          <p className="text-sm text-muted-foreground">
            {LIFECYCLE_LABEL[detail.lifecycle]} · {REVIEW_LABEL[detail.review.status]}
            {published && detail.publishedRevision !== detail.revision && " · unpublished changes"}
          </p>
        </div>
        <Link to={`/admin/courses/${id}/edit`}><Button className="gap-2"><Pencil className="w-4 h-4" /> Edit</Button></Link>
        {published && <a href={`/courses/${id}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" className="gap-1">Live page <ExternalLink className="w-3.5 h-3.5" /></Button></a>}
      </div>

      {notice && <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-3">{notice}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <section className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
        <h2 className="font-semibold">Sessions and Meet links</h2>
        <p className="text-xs text-muted-foreground">Saved straight away (no approval needed). Participants get the link in their reminder email. A session's own link overrides the default.</p>
        {detail.data.format !== "inPerson" && (
          <label className="grid gap-1 text-sm">Default Meet link
            <input className={INPUT} placeholder="https://meet.google.com/…" value={links.meetUrl} onChange={e => setLinks({ ...links, meetUrl: e.target.value })} />
          </label>
        )}
        <ul className="divide-y divide-stone-100 text-sm">
          {detail.data.sessions.map((s, i) => {
            const sid = detail.sessionIds[i];
            return (
              <li key={sid} className="py-2 grid gap-2 sm:grid-cols-[14rem_1fr] sm:items-center">
                <span>
                  {s.date} · {s.startTime}–{s.endTime}
                  {roster?.pickOne && ` · ${counts.bySession[sid] ?? 0}${roster.seatLimit ? `/${roster.seatLimit}` : ""} booked`}
                </span>
                {detail.data.format !== "inPerson" && (
                  <input className={INPUT} placeholder="Own Meet link (optional)" value={links.sessions[sid] ?? ""} onChange={e => setLinks({ ...links, sessions: { ...links.sessions, [sid]: e.target.value } })} />
                )}
              </li>
            );
          })}
        </ul>
        {detail.data.format !== "inPerson" && (
          <Button size="sm" disabled={busy} onClick={() => run("course-meet-links", links, "Meet links saved.")}>Save Meet links</Button>
        )}
      </section>

      {published && roster && (
        <section className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-semibold flex-1">Participants · {counts.total}{!roster.pickOne && roster.seatLimit ? `/${roster.seatLimit}` : ""} · {euro(counts.paidCents)}</h2>
            <Button size="sm" variant="outline" className="gap-1" onClick={exportCsv} disabled={counts.total === 0}><Download className="w-3.5 h-3.5" /> CSV</Button>
          </div>
          <p className="text-xs text-muted-foreground">Notes from the booking form aren't shown here, as they can contain health information; they're in the booking emails. The CSV has contact details and dates only.</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-muted-foreground">
                <tr><th className="py-2 pr-3">Name</th><th className="py-2 pr-3">Contact</th>{roster.pickOne && <th className="py-2 pr-3">Date</th>}<th className="py-2 pr-3">Status</th><th className="py-2 pr-3">Paid</th><th className="py-2">Booked</th></tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {roster.participants.map(p => (
                  <tr key={p.id} className={p.status === "unpaid" ? "text-muted-foreground" : ""}>
                    <td className="py-2 pr-3">{p.name}<span className="block text-xs text-muted-foreground">{p.ref}{p.hasNotes ? " · has notes" : ""}</span></td>
                    <td className="py-2 pr-3"><a className="underline" href={`mailto:${p.email}`}>{p.email}</a><span className="block text-xs">{p.whatsapp}</span></td>
                    {roster.pickOne && <td className="py-2 pr-3">{p.session ?? "—"}</td>}
                    <td className="py-2 pr-3">{STATUS_LABEL[p.status]}</td>
                    <td className="py-2 pr-3">{p.amountCents ? euro(p.amountCents) : "—"}{p.discount ? ` (${p.discount.replace("_", " ")})` : ""}</td>
                    <td className="py-2 whitespace-nowrap">{berlinDateTime(p.createdAt)}</td>
                  </tr>
                ))}
                {roster.participants.length === 0 && <tr><td className="py-2 text-muted-foreground" colSpan={6}>No bookings yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-stone-200 bg-white p-4 space-y-3 text-sm">
        <h2 className="font-semibold">Booking</h2>
        {!published ? (
          <div className="space-y-2">
            <p className="text-muted-foreground">Not published yet. Edit it, send it for approval, then publish.</p>
            <Button size="sm" variant="ghost" className="text-red-700" disabled={busy} onClick={() => run("course-delete-draft", {}, "", "Delete this draft? This can't be undone.")}>Delete draft</Button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {detail.closedManually
              ? <Button size="sm" disabled={busy} onClick={() => run("course-reopen", {}, "Booking reopened.")}>Reopen booking</Button>
              : <Button size="sm" variant="outline" disabled={busy} onClick={() => run("course-close", {}, "Booking closed. The page stays up and says “Registration closed”.", "Close booking now? The page stays up; you can reopen later.")}>Close booking now</Button>}
            {detail.archived
              ? <Button size="sm" variant="outline" disabled={busy} onClick={() => run("course-unarchive", {}, "Course restored.")}>Restore from archive</Button>
              : <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("course-archive", {}, "Archived: hidden from the site and the course list.", "Archive this course? It disappears from the site; bookings and invoices are kept.")}>Archive</Button>}
          </div>
        )}
        <p className="text-xs text-muted-foreground">Rescheduling a session and cancelling a course with refunds come with the payments step.</p>
      </section>
    </div>
  );
}
