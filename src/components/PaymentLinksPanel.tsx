import React, { useCallback, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { Copy, Link2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Founders' tool on /write: create a personal payment link for a package
// agreed with a client (e.g. Subconscious Healing, 3 sessions) and see which
// links have been paid. The server (api/_lib/paymentRequests.ts) checks the
// founder's Firebase ID token, stores the amount and optionally emails the
// link; the client pays on /pay/<id>.

type LinkRow = {
  id: string;
  name: string;
  email: string;
  description: string;
  amountCents: number;
  lang: "EN" | "DE";
  paid: boolean;
  invoiceNumber: string | null;
  createdAt: number | null;
  expiresAt: number | null;
};

const EMPTY = { name: "", email: "", whatsapp: "", description: "", amountEur: "", lang: "DE" as "EN" | "DE", sendEmail: true };
const INPUT = "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const euro = (cents: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);
const urlFor = (row: Pick<LinkRow, "id" | "lang">) => `${window.location.origin}${row.lang === "DE" ? "/de" : ""}/pay/${row.id}`;

export default function PaymentLinksPanel({ user }: { user: User }) {
  const [form, setForm] = useState(EMPTY);
  const [links, setLinks] = useState<LinkRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = useCallback(async (sub: string, init?: RequestInit) => {
    const idToken = await user.getIdToken();
    const response = await fetch(`/api/payment-request?sub=${sub}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || `HTTP ${response.status}`);
    return data;
  }, [user]);

  const refresh = useCallback(() => {
    call("list").then(d => setLinks(d.links ?? [])).catch(err => setError(`Couldn't load payment links: ${err.message}`));
  }, [call]);
  useEffect(refresh, [refresh]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setCreated(null);
    try {
      const data = await call("create", { method: "POST", body: JSON.stringify({ ...form, amountEur: Number(form.amountEur.replace(",", ".")) }) });
      setCreated(data.url);
      setForm(EMPTY);
      refresh();
    } catch (err) {
      const code = err instanceof Error ? err.message : String(err);
      setError(code === "invalid_amount" ? "Amount must be between €1 and €2,000." : code === "missing_fields" ? "Name, a valid email and the package are required." : `Couldn't create the link: ${code}`);
    } finally {
      setBusy(false);
    }
  };

  const whatsappShare = (url: string, description: string) =>
    `https://wa.me/?text=${encodeURIComponent(`${description}: ${url}`)}`;

  return (
    <section className="container mx-auto px-6 max-w-4xl pb-16">
      <h2 className="text-xl font-serif font-bold mb-2 flex items-center gap-2"><Link2 className="w-5 h-5" /> Payment links</h2>
      <p className="text-sm text-muted-foreground mb-4">
        For packages agreed with a client (e.g. Subconscious Healing). The client opens the link, accepts the terms and pays via Stripe;
        they then get the usual confirmation and invoice. Links are valid for 30 days and can be paid once.
      </p>
      <form onSubmit={create} className="grid sm:grid-cols-2 gap-3 rounded-xl border border-stone-200 bg-white p-4 mb-6">
        <input required className={INPUT} placeholder="Client's full name" maxLength={100} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input required type="email" className={INPUT} placeholder="Client's email" maxLength={200} value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input className={INPUT} placeholder="WhatsApp (optional)" maxLength={40} value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} />
        <input required inputMode="decimal" className={INPUT} placeholder="Amount in € (e.g. 100)" value={form.amountEur} onChange={e => setForm({ ...form, amountEur: e.target.value })} />
        <input required className={`${INPUT} sm:col-span-2`} placeholder="Package, as on the invoice (e.g. Subconscious Healing – 3 in-person sessions)" maxLength={200} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          Language
          <select className="h-9 rounded-md border border-input bg-background px-2" value={form.lang} onChange={e => setForm({ ...form, lang: e.target.value as "EN" | "DE" })}>
            <option value="DE">Deutsch</option>
            <option value="EN">English</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.sendEmail} onChange={e => setForm({ ...form, sendEmail: e.target.checked })} />
          Also email the link to the client
        </label>
        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}
        {created && (
          <div className="sm:col-span-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm flex flex-wrap items-center gap-2">
            <span className="font-medium">Link created:</span>
            <code className="break-all">{created}</code>
            <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => navigator.clipboard?.writeText(created)}><Copy className="w-3.5 h-3.5" /> Copy</Button>
          </div>
        )}
        <div className="sm:col-span-2 flex justify-end">
          <Button type="submit" disabled={busy}>{busy ? "Creating…" : "Create payment link"}</Button>
        </div>
      </form>

      {links.length > 0 && (
        <div className="space-y-2">
          {links.map(row => {
            const expired = !row.paid && row.expiresAt !== null && row.expiresAt < Date.now();
            const url = urlFor(row);
            return (
              <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white p-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{row.name} · {euro(row.amountCents)}</p>
                  <p className="text-muted-foreground truncate">{row.description} · {row.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${row.paid ? "bg-green-100 text-green-800" : expired ? "bg-stone-200 text-stone-600" : "bg-amber-100 text-amber-800"}`}>
                    {row.paid ? `Paid · ${row.invoiceNumber ?? ""}` : expired ? "Expired" : "Open"}
                  </span>
                  {!row.paid && !expired && (
                    <>
                      <Button type="button" size="sm" variant="outline" className="gap-1" onClick={() => navigator.clipboard?.writeText(url)}><Copy className="w-3.5 h-3.5" /> Copy</Button>
                      <a href={whatsappShare(url, row.description)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs underline"><MessageCircle className="w-3.5 h-3.5" /> WhatsApp</a>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
