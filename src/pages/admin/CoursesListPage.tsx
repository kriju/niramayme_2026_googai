import React, { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { User } from "firebase/auth";
import { Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch, berlinDateTime, describeError, euro } from "./adminApi";
import { LIFECYCLE_LABEL, REVIEW_LABEL, slugify, type CourseDetail, type CourseRow } from "./courseTypes";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "drafts", label: "Drafts" },
  { id: "past", label: "Past" },
] as const;
type Tab = (typeof TABS)[number]["id"];

function tabOf(row: CourseRow): Tab {
  if (row.lifecycle === "not_published") return "drafts";
  if (row.lifecycle === "completed" || row.lifecycle === "archived") return "past";
  return "upcoming";
}

const INPUT = "h-10 rounded-md border border-input bg-background px-3 text-sm";

export default function CoursesListPage({ user }: { user: User }) {
  const navigate = useNavigate();
  const [rows, setRows] = useState<CourseRow[] | null>(null);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState<null | { copyFrom?: string; title: string; id: string }>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminFetch<{ courses: CourseRow[] }>(user, "courses")
      .then(d => setRows(d.courses))
      .catch(err => setError(describeError(err)));
  }, [user]);
  useEffect(load, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creating) return;
    setBusy(true);
    setError(null);
    try {
      const course = await adminFetch<CourseDetail>(user, "course-create", {
        method: "POST",
        body: { id: creating.id, ...(creating.copyFrom ? { copyFrom: creating.copyFrom } : {}) },
      });
      navigate(`/admin/courses/${course.id}/edit`);
    } catch (err) {
      setError(err instanceof Error && err.message === "id_taken" ? "A course with this web address already exists. Choose another." : describeError(err));
    } finally {
      setBusy(false);
    }
  };

  const shown = (rows ?? []).filter(r => tabOf(r) === tab);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-serif text-2xl font-bold">Courses</h1>
        <Button className="gap-2" onClick={() => setCreating({ title: "", id: "" })}><Plus className="w-4 h-4" /> New course</Button>
      </div>

      {creating && (
        <form onSubmit={create} className="rounded-xl border border-stone-200 bg-white p-4 space-y-3">
          <p className="font-semibold">{creating.copyFrom ? `Run "${creating.copyFrom}" again` : "New course"}</p>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="grid gap-1 text-sm">
              English title
              <input
                className={INPUT}
                autoFocus
                value={creating.title}
                onChange={e => setCreating({ ...creating, title: e.target.value, id: slugify(e.target.value) })}
                placeholder="e.g. Yoga for a Healthy Back"
              />
            </label>
            <label className="grid gap-1 text-sm">
              Web address (can't change after publishing)
              <span className="flex items-center gap-1">
                <span className="text-muted-foreground text-xs">/courses/</span>
                <input
                  required
                  className={`${INPUT} flex-1`}
                  pattern="[a-z0-9][a-z0-9-]{1,78}[a-z0-9]"
                  value={creating.id}
                  onChange={e => setCreating({ ...creating, id: e.target.value.toLowerCase() })}
                />
              </span>
            </label>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy || !creating.id}>{busy ? "Creating…" : "Create draft"}</Button>
            <Button type="button" variant="ghost" onClick={() => setCreating(null)}>Cancel</Button>
          </div>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-1 border-b border-stone-200">
        {TABS.map(t => (
          <button
            key={t.id}
            className={`px-3 py-2 text-sm -mb-px border-b-2 ${tab === t.id ? "border-primary font-medium" : "border-transparent text-muted-foreground"}`}
            onClick={() => setTab(t.id)}
          >
            {t.label} {rows ? `(${rows.filter(r => tabOf(r) === t.id).length})` : ""}
          </button>
        ))}
      </div>

      {rows && shown.length === 0 && <p className="text-sm text-muted-foreground">No courses here.</p>}
      <ul className="space-y-2">
        {shown.map(row => (
          <li key={row.id} className="rounded-xl border border-stone-200 bg-white p-4 flex flex-wrap items-center gap-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{row.title}</p>
              <p className="text-muted-foreground">
                {LIFECYCLE_LABEL[row.lifecycle]}
                {!row.legacy && row.review !== "approved" && ` · ${REVIEW_LABEL[row.review]}`}
                {row.changedSincePublish && " · unpublished changes"}
                {row.nextSession && ` · next ${berlinDateTime(row.nextSession)}`}
                {` · ${row.booked}${row.seatLimit ? `/${row.seatLimit}` : ""} booked`}
                {row.paidCents > 0 && ` · ${euro(row.paidCents)}`}
                {row.banner && " · banner on"}
                {row.legacy && " · defined in code (read-only)"}
              </p>
            </div>
            {!row.legacy && (
              <div className="flex gap-2">
                <Link to={`/admin/courses/${row.id}`}><Button size="sm" variant="outline">Open</Button></Link>
                <Button size="sm" variant="ghost" className="gap-1" title="Run again: copy everything except dates" onClick={() => setCreating({ copyFrom: row.id, title: "", id: `${row.id}-2` })}>
                  <Copy className="w-3.5 h-3.5" /> Run again
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
