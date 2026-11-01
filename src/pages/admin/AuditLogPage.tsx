import React, { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { adminFetch, berlinDateTime, describeError } from "./adminApi";

type Entry = {
  id: string;
  at: string | null;
  byName: string;
  via: "admin" | "connector";
  op: string;
  target: string;
  note: string | null;
};

const OP_LABELS: Record<string, string> = { sign_in: "Signed in" };

export default function AuditLogPage({ user }: { user: User }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async (before?: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminFetch<{ entries: Entry[] }>(user, "audit", before ? { query: { before } } : {});
      setEntries(prev => (before ? [...prev, ...data.entries] : data.entries));
      setDone(data.entries.length < 100);
    } catch (err) {
      setError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [user]);
  useEffect(() => { void load(); }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-2xl font-bold">Audit log</h1>
      <p className="text-sm text-muted-foreground">Every change made in the admin section, newest first. Entries can't be edited or deleted.</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="overflow-x-auto rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-muted-foreground">
            <tr><th className="p-3">When</th><th className="p-3">Who</th><th className="p-3">What</th><th className="p-3">Note</th></tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {entries.map(e => (
              <tr key={e.id}>
                <td className="p-3 whitespace-nowrap">{berlinDateTime(e.at)}</td>
                <td className="p-3 whitespace-nowrap">{e.via === "connector" ? `Claude, at ${e.byName}'s request` : e.byName}</td>
                <td className="p-3">{OP_LABELS[e.op] ?? e.op} <span className="text-muted-foreground">· {e.target}</span></td>
                <td className="p-3 text-muted-foreground">{e.note ?? ""}</td>
              </tr>
            ))}
            {entries.length === 0 && !loading && (
              <tr><td className="p-3 text-muted-foreground" colSpan={4}>No entries yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {!done && entries.length > 0 && (
        <Button variant="outline" size="sm" disabled={loading} onClick={() => load(entries[entries.length - 1].at ?? undefined)}>
          {loading ? "Loading…" : "Older entries"}
        </Button>
      )}
    </div>
  );
}
