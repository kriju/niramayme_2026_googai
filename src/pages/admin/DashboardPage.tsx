import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { User } from "firebase/auth";
import { AlertTriangle, CalendarDays, CheckCircle2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminFetch, berlinDateTime, describeError, euro } from "./adminApi";

type AttentionItem = { kind: string; title: string; detail: string; at: string | null; href: string | null };
type Dashboard = {
  items: AttentionItem[];
  sections: { id: string; ok: boolean; error?: string }[];
  upcoming: { courseTitle: string; sessionLabel: string; start: string; paid: number; meetLink: boolean }[];
  monthPaidCents: number | null;
  monthLabel: string;
};

const SECTION_NAMES: Record<string, string> = {
  upi_claims: "UPI payment claims",
  reviews: "pending reviews",
  blog_reviews: "posts awaiting approval",
  course_reviews: "courses awaiting approval",
  comments: "pending comments",
  upcoming: "upcoming sessions",
  month_total: "this month's total",
};

export default function DashboardPage({ user }: { user: User }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminFetch<Dashboard>(user, "dashboard")
      .then(setData)
      .catch(err => setError(describeError(err)))
      .finally(() => setLoading(false));
  }, [user]);
  useEffect(load, [load]);

  const failed = data?.sections.filter(s => !s.ok) ?? [];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-serif text-2xl font-bold">Needs attention</h1>
        <Button variant="ghost" size="sm" className="gap-2" onClick={load} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {failed.length > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          Couldn't load: {failed.map(s => SECTION_NAMES[s.id] ?? s.id).join(", ")}. The rest is up to date.
        </p>
      )}

      {data && (
        data.items.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg p-4">
            <CheckCircle2 className="w-4 h-4" /> Nothing needs your attention right now.
          </p>
        ) : (
          <ul className="space-y-2">
            {data.items.map((item, i) => {
              const body = (
                <>
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-amber-600" />
                  <div className="min-w-0">
                    <p className="font-medium">{item.title}</p>
                    <p className="text-muted-foreground truncate">{item.detail}</p>
                  </div>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">{berlinDateTime(item.at)}</span>
                </>
              );
              const cls = "flex items-start gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm";
              return (
                <li key={i}>
                  {item.href ? <Link to={item.href} className={`${cls} hover:border-primary/40`}>{body}</Link> : <div className={cls}>{body}</div>}
                </li>
              );
            })}
          </ul>
        )
      )}

      {data && (
        <div className="grid gap-4 md:grid-cols-3">
          <section className="md:col-span-2 rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><CalendarDays className="w-4 h-4" /> Next 7 days</h2>
            {data.upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">No course sessions in the next 7 days.</p>
            ) : (
              <ul className="divide-y divide-stone-100 text-sm">
                {data.upcoming.map((s, i) => (
                  <li key={i} className="py-2 flex flex-wrap items-baseline justify-between gap-2">
                    <span className="min-w-0">
                      <span className="font-medium">{berlinDateTime(s.start)}</span> · {s.courseTitle}
                    </span>
                    <span className="text-muted-foreground">
                      {s.paid} booked{s.meetLink ? "" : " · no Meet link"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-xl border border-stone-200 bg-white p-4">
            <h2 className="font-semibold mb-1">Paid in {data.monthLabel}</h2>
            <p className="text-3xl font-serif font-bold">{data.monthPaidCents === null ? "—" : euro(data.monthPaidCents)}</p>
            <p className="text-xs text-muted-foreground mt-1">Total of invoices issued this month (Stripe payments).</p>
          </section>
        </div>
      )}
    </div>
  );
}
