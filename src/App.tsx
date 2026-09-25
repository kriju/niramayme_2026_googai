import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Menu, 
  X, 
  Globe, 
  Calendar, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Youtube,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Sparkles,
  Clock,
  Star,
  Plus,
  ChevronLeft,
  ChevronRight,
  Flower2,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "./lib/firebase";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  where
} from "firebase/firestore";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SERVICES, TESTIMONIALS, FAQS, CERTIFICATIONS, TRANSLATIONS, ONGOING_SESSIONS, COURSES, EVENTS, GOOGLE_CALENDAR_URL, GOOGLE_REVIEW_URL, FEATURE_BLOG_ENABLED } from "./constants";

// A single booking dialog, controlled from the App root (see the other
// ...DetailModal components below for the same lift-state-up pattern).
// Every "Book" trigger across the site hands it a BookingContext describing
// exactly what's being booked, so the dialog never shows a bare, unlabeled
// calendar no matter which service/session/CTA the visitor came from.
type BookingMeta = { icon: React.ComponentType<{ className?: string }>; label: string };
type BookingContext = { title?: string; subtitle?: string; meta?: BookingMeta[] };

const BookingDialog = ({ context, lang, open, onOpenChange }: { context: BookingContext | null, lang: "EN" | "DE", open: boolean, onOpenChange: (o: boolean) => void }) => {
  const t = TRANSLATIONS[lang].booking;
  const title = context?.title || t.title;
  const subtitle = context?.subtitle || t.calendlyDesc;
  const meta: BookingMeta[] = context?.meta || [
    { icon: Sparkles, label: `${t.discoveryLabel} · ${t.discoveryValue}` },
    { icon: Clock, label: `${t.availabilityLabel} · ${t.availabilityValue}` },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-stone-100 space-y-2">
          <DialogTitle className="text-2xl md:text-3xl font-serif">{title}</DialogTitle>
          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          {meta.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {meta.map((m, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs font-medium text-primary bg-primary/5 border border-primary/10 rounded-full px-3 py-1">
                  <m.icon className="w-3.5 h-3.5" />
                  {m.label}
                </span>
              ))}
            </div>
          )}
        </DialogHeader>
        <div className="flex-1 w-full h-full min-h-0 relative">
          <iframe
            src={GOOGLE_CALENDAR_URL}
            className="w-full h-full border-0"
            title="Google Calendar Appointment Scheduling"
          />
          <div className="absolute bottom-4 right-4">
            <a
              href={GOOGLE_CALENDAR_URL.replace('?gv=true', '')}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted-foreground hover:text-primary underline bg-background/80 backdrop-blur-sm px-2 py-1 rounded"
            >
              {lang === "EN" ? "Trouble viewing? Open in new tab" : "Probleme bei der Anzeige? In neuem Tab öffnen"}
            </a>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// The Vedic Astrology tile's own intake flow: it replaces self-serve
// calendar booking with (1) collecting the birth details a chart actually
// needs, with an explicit consent checkbox, then (2) advance-payment
// instructions keyed to a reference code, so the visitor and Richa share
// one canonical, receipted record instead of coordinating over email/
// WhatsApp with no paper trail. See firestore.rules for what's enforced
// server-side (the client can create a request and flip its own
// paymentClaimed flag, nothing else).
const ASTROLOGY_WHATSAPP_NUMBER = "4915175315761";

type AstrologyStep = "details" | "payment" | "done";
type AstrologyForm = { name: string; placeOfBirth: string; dateOfBirth: string; timeOfBirth: string; contact: string; consent: boolean };
const EMPTY_ASTROLOGY_FORM: AstrologyForm = { name: "", placeOfBirth: "", dateOfBirth: "", timeOfBirth: "", contact: "", consent: false };

const AstrologyIntakeModal = ({ lang, open, onOpenChange, onOpenPrivacy }: { lang: "EN" | "DE", open: boolean, onOpenChange: (o: boolean) => void, onOpenPrivacy: () => void }) => {
  const t = TRANSLATIONS[lang].astrologyIntake;
  const [step, setStep] = useState<AstrologyStep>("details");
  const [form, setForm] = useState<AstrologyForm>(EMPTY_ASTROLOGY_FORM);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Short human-quotable code derived from the Firestore doc ID, shown to
  // the visitor and re-derived server-side (see api/notify-astrology-request.ts)
  // from the same ID — never stored separately, so the two can't drift.
  const refCode = requestId ? `AST-${requestId.slice(-6).toUpperCase()}` : "";
  const isValid = Boolean(form.name.trim() && form.placeOfBirth.trim() && form.dateOfBirth && form.timeOfBirth && form.contact.trim() && form.consent);
  const whatsappHref = `https://wa.me/${ASTROLOGY_WHATSAPP_NUMBER}?text=${encodeURIComponent(t.whatsappTemplate)}`;

  const resetAndClose = () => {
    onOpenChange(false);
    // Delay the reset past the close animation so the dialog doesn't
    // visibly snap back to step 1 while it's still fading out.
    setTimeout(() => {
      setStep("details");
      setForm(EMPTY_ASTROLOGY_FORM);
      setRequestId(null);
      setError(null);
    }, 300);
  };

  const handleSubmitDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const docRef = await addDoc(collection(db, "astrologyRequests"), {
        name: form.name.trim(),
        placeOfBirth: form.placeOfBirth.trim(),
        dateOfBirth: form.dateOfBirth,
        timeOfBirth: form.timeOfBirth,
        contact: form.contact.trim(),
        consentAccepted: true,
        lang,
        createdAt: serverTimestamp(),
        paymentClaimed: false,
      });
      setRequestId(docRef.id);
      setStep("payment");
      // Best-effort admin notification — the request is already saved above
      // regardless of whether this succeeds.
      fetch("/api/notify-astrology-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId: docRef.id, kind: "submitted" }),
      }).catch(err => console.error("Failed to notify admin of new astrology request:", err));
    } catch (err) {
      console.error("Error submitting astrology request:", err);
      setError(t.submitError);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePaid = async () => {
    if (!requestId || paying) return;
    setPaying(true);
    setError(null);
    try {
      await updateDoc(doc(db, "astrologyRequests", requestId), { paymentClaimed: true });
      setStep("done");
      fetch("/api/notify-astrology-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, kind: "payment_claimed" }),
      }).catch(err => console.error("Failed to notify admin of astrology payment claim:", err));
    } catch (err) {
      console.error("Error confirming astrology payment claim:", err);
      setError(t.paidError);
    } finally {
      setPaying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">{t.step1Title}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmitDetails} className="grid gap-4 py-2">
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t.fields.name}</label>
                <input
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t.fields.placeOfBirth}</label>
                <input
                  required
                  placeholder={t.fields.placeOfBirthPlaceholder}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.placeOfBirth}
                  onChange={e => setForm({ ...form, placeOfBirth: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t.fields.dateOfBirth}</label>
                  <input
                    required
                    type="date"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={form.dateOfBirth}
                    onChange={e => setForm({ ...form, dateOfBirth: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-sm font-medium">{t.fields.timeOfBirth}</label>
                  <input
                    required
                    type="time"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={form.timeOfBirth}
                    onChange={e => setForm({ ...form, timeOfBirth: e.target.value })}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">{t.fields.timeOfBirthHint}</p>
              <div className="grid gap-2">
                <label className="text-sm font-medium">{t.fields.contact}</label>
                <input
                  required
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={form.contact}
                  onChange={e => setForm({ ...form, contact: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">{t.fields.contactHint}</p>
              </div>
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  required
                  className="mt-1 h-4 w-4 shrink-0"
                  checked={form.consent}
                  onChange={e => setForm({ ...form, consent: e.target.checked })}
                />
                <span>
                  {t.consentPrefix}{" "}
                  <button type="button" onClick={onOpenPrivacy} className="underline underline-offset-2 hover:text-primary">
                    {t.consentLinkLabel}
                  </button>.
                </span>
              </label>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" size="lg" className="rounded-full w-full" disabled={!isValid || submitting}>
                {submitting ? t.submitting : t.continueBtn}
              </Button>
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="text-center text-sm text-muted-foreground hover:text-primary underline underline-offset-2">
                {t.whatsappFallbackTitle} — {t.whatsappFallbackBtn}
              </a>
            </form>
          </>
        )}

        {step === "payment" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">{t.step2Title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-5 py-2">
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-100 text-center">
                <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t.refCodeLabel}</p>
                <p className="text-2xl font-bold font-mono tracking-wide">{refCode}</p>
                <p className="text-xs text-muted-foreground mt-1">{t.refCodeNote}</p>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-primary/50 mb-1">{t.priceLabel}</p>
                <p className="text-lg font-semibold">{t.priceValue}</p>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-stone-100 space-y-2">
                  <p className="font-bold text-sm">{t.paymentEURTitle}</p>
                  <p className="text-sm">{t.paypalLabel}: <span className="font-mono">richa@niramay.me</span></p>
                  <p className="text-xs text-muted-foreground">{t.paypalNote}</p>
                  <Separator className="my-2" />
                  <p className="text-sm">{t.bankLabel}</p>
                  <p className="text-xs font-mono">IBAN: DE08 1001 1001 2721 9373 31</p>
                  <p className="text-xs font-mono">BIC: NTSBDEB1XXX</p>
                  <p className="text-xs text-muted-foreground">{t.bankNote}</p>
                </div>
                <div className="p-4 rounded-xl border border-stone-100 space-y-2">
                  <p className="font-bold text-sm">{t.paymentINRTitle}</p>
                  <p className="text-sm">{t.upiLabel}: <span className="font-mono">richa944@icici</span></p>
                  <p className="text-xs text-muted-foreground">{t.upiNote}</p>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-3">
                {/* Going back and resubmitting creates a second Firestore
                    doc rather than editing this one — the security rules
                    only allow flipping paymentClaimed, not editing details,
                    so a harmless duplicate (Richa sees two emails, same
                    name/DOB) is the simplest correct behavior for v1. */}
                <Button variant="outline" className="rounded-full" onClick={() => setStep("details")}>{t.backBtn}</Button>
                <Button size="lg" className="rounded-full flex-1" onClick={handlePaid} disabled={paying}>
                  {paying ? t.paidSubmitting : t.paidBtn}
                </Button>
              </div>
            </div>
          </>
        )}

        {step === "done" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl font-serif">{t.confirmationTitle}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                <p className="text-muted-foreground">{t.confirmationBody}</p>
              </div>
              <p className="text-sm">
                <span className="text-muted-foreground">{t.confirmationSentTo}</span>{" "}
                <span className="font-medium">{form.contact}</span>
              </p>
              <Button className="rounded-full w-full" onClick={resetAndClose}>{t.closeBtn}</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

const LeaveReviewModal = ({ lang }: { lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].testimonials;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rating: 5,
    content: "",
    category: "Mental Clarity",
    role: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const docRef = await addDoc(collection(db, "reviews"), {
        ...formData,
        createdAt: serverTimestamp(),
        lang,
        approved: false, // Reviews are moderated — an admin approves via the emailed link (or the Firebase console) before this shows publicly
      });
      // Best-effort admin notification email with Approve/Reject links.
      // The review itself is already saved above regardless of whether this succeeds.
      fetch("/api/notify-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: docRef.id }),
      }).catch((err) => console.error("Failed to notify admin of new review:", err));
      setOpen(false);
      setFormData({ name: "", rating: 5, content: "", category: "Mental Clarity", role: "" });
    } catch (error) {
      console.error("Error adding review:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={
        <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white hover:text-primary gap-2">
          <Plus className="w-4 h-4" /> {t.leaveReview}
        </Button>
      } />
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">{t.modalTitle}</DialogTitle>
          <p className="text-sm text-muted-foreground">{t.modalDesc}</p>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t.form.name}</label>
            <input 
              required
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t.form.rating}</label>
            <div className="flex gap-1">
              {[1,2,3,4,5].map(i => (
                <Star 
                  key={i} 
                  className={`w-6 h-6 cursor-pointer ${i <= formData.rating ? 'text-yellow-500 fill-yellow-500' : 'text-stone-300'}`}
                  onClick={() => setFormData({ ...formData, rating: i })}
                />
              ))}
            </div>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t.form.category}</label>
            <select 
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
            >
              <option value="Physical Wellness">Physical Wellness</option>
              <option value="Mental Clarity">Mental Clarity</option>
              <option value="Spiritual Healing">Spiritual Healing</option>
            </select>
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t.form.role}</label>
            <input 
              placeholder="e.g. Burnout Recovery"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.role}
              onChange={e => setFormData({ ...formData, role: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">{t.form.content}</label>
            <textarea 
              required
              rows={4}
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.content}
              onChange={e => setFormData({ ...formData, content: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{t.form.cancel}</Button>
            <Button type="submit" disabled={loading}>{loading ? "..." : t.form.submit}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const BlogCard = ({ blog, lang, onReadMore }: { blog: any, lang: "EN" | "DE", onReadMore: (b: any) => void, key?: any }) => {
  const t = TRANSLATIONS[lang].blog;
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full"
    >
      <Card className="overflow-hidden border-stone-100 flex flex-col h-full hover:shadow-xl transition-all duration-500 group">
        <div className="relative h-56 overflow-hidden">
          <img 
            src={blog.image} 
            alt={blog.title} 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute top-4 left-4">
            <Badge className="bg-white/90 backdrop-blur-md text-primary border-none">
              {blog.category}
            </Badge>
          </div>
        </div>
        <CardHeader className="flex-grow">
          <CardTitle className="text-xl font-serif mb-2 line-clamp-2 leading-tight">
            {blog.title}
          </CardTitle>
          <CardDescription className="line-clamp-3">
            {blog.excerpt}
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-0">
          <Button 
            variant="link" 
            className="px-0 text-primary font-bold group-hover:translate-x-1 transition-transform"
            onClick={() => onReadMore(blog)}
          >
            {t.readMore} <Plus className="ml-2 w-4 h-4" />
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
};

const BlogDetailModal = ({ blog, open, onOpenChange, lang }: { blog: any, open: boolean, onOpenChange: (o: boolean) => void, lang: "EN" | "DE" }) => {
  if (!blog) return null;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-6">
          <div className="flex gap-2 mb-4">
            <Badge variant="outline">{blog.category}</Badge>
            <span className="text-sm text-stone-400">
              {blog.createdAt?.toDate ? blog.createdAt.toDate().toLocaleDateString(lang === "DE" ? "de-DE" : "en-US") : ""}
            </span>
          </div>
          <DialogTitle className="text-3xl md:text-4xl font-serif leading-tight">
            {blog.title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {blog.externalLink ? (
            <div className="w-full aspect-[4/3] md:aspect-video rounded-2xl overflow-hidden border border-stone-100 shadow-inner">
              <iframe 
                src={blog.externalLink} 
                className="w-full h-full border-0"
                title={blog.title}
              />
            </div>
          ) : (
            <>
              <img 
                src={blog.image} 
                alt={blog.title} 
                className="w-full aspect-video object-cover rounded-2xl"
                referrerPolicy="no-referrer"
              />
              
              <div className="prose prose-stone max-w-none prose-lg">
                {blog.content.split('\n').map((paragraph: string, i: number) => (
                  <p key={i} className="text-stone-600 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </>
          )}
          
          <div className="pt-12 border-t border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-600">
                {blog.author?.[0] || "R"}
              </div>
              <div>
                <p className="font-bold">{blog.author || "Richa"}</p>
                <p className="text-sm text-stone-400">Therapist & Founder</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BlogEditorModal = ({ open, setOpen, lang }: { open: boolean, setOpen: (o: boolean) => void, lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].blog.editor;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    excerpt: "",
    content: "",
    category: "Physical Wellness",
    image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
    author: "Richa"
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, "blogs"), {
        ...formData,
        lang,
        createdAt: serverTimestamp()
      });
      setOpen(false);
      setFormData({
        title: "",
        excerpt: "",
        content: "",
        category: "Physical Wellness",
        image: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&q=80&w=800",
        author: "Richa"
      });
    } catch (error) {
      console.error("Error adding blog:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-serif">{t.title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-600">{t.titleLabel}</label>
            <input 
              required 
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-serif italic text-lg" 
              placeholder="e.g. The Power of Alignment"
              value={formData.title} 
              onChange={e => setFormData({...formData, title: e.target.value})} 
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">{t.categoryLabel}</label>
              <select 
                className="w-full px-4 py-3 rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                {["Physical Wellness", "Mental Clarity", "Spiritual Healing", "Kids Yoga", "Dance Therapy", "Tarot Reading", "Chair Yoga"].map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-600">{t.imageLabel}</label>
              <input 
                className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm" 
                value={formData.image} 
                onChange={e => setFormData({...formData, image: e.target.value})} 
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-600">{t.excerptLabel}</label>
            <textarea 
              required 
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all h-24 resize-none" 
              value={formData.excerpt} 
              onChange={e => setFormData({...formData, excerpt: e.target.value})} 
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-600">{t.contentLabel}</label>
            <textarea 
              required 
              className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all h-64" 
              value={formData.content} 
              onChange={e => setFormData({...formData, content: e.target.value})} 
            />
          </div>
          <div className="flex justify-end gap-3 pt-6">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{t.cancel}</Button>
            <Button type="submit" disabled={loading} className="px-8">{loading ? t.saving : t.submit}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const BlogSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [selectedBlog, setSelectedBlog] = useState<any>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(3);
  const t = TRANSLATIONS[lang].blog;

  useEffect(() => {
    // Listen for blogs based on current language
    const q = query(
      collection(db, "blogs"), 
      where("lang", "==", lang),
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const b = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setBlogs(b);
    });
    
    return () => unsubscribe();
  }, [lang]);

  const filtered = filter === "all" ? blogs : blogs.filter(b => b.category === filter);
  const currentBlogs = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  return (
    <section id="blog" className="py-24 bg-stone-50 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary">{t.title}</h2>
              <Button 
                variant="outline" 
                size="icon" 
                className="rounded-full border-stone-200 hover:bg-white hover:text-primary transition-all"
                onClick={() => setIsEditorOpen(true)}
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
            <p className="text-stone-500 text-lg">
              {t.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "all", 
              "Physical Wellness", 
              "Mental Clarity", 
              "Spiritual Healing", 
              "Kids Yoga", 
              "Dance Therapy", 
              "Tarot Reading", 
              "Chair Yoga"
            ].map(cat => {
              const key = cat === "all" ? "all" : 
                cat === "Physical Wellness" ? "physical" :
                cat === "Mental Clarity" ? "mental" :
                cat === "Spiritual Healing" ? "spiritual" :
                cat === "Kids Yoga" ? "kids" :
                cat === "Dance Therapy" ? "dance" :
                cat === "Tarot Reading" ? "tarot" :
                cat === "Chair Yoga" ? "chair" : "all";
                
              return (
                <Button 
                  key={cat} 
                  variant={filter === cat ? "secondary" : "outline"} 
                  size="sm" 
                  onClick={() => {
                    setFilter(cat);
                    setVisibleCount(3);
                  }}
                  className="rounded-full transition-all duration-300"
                >
                  {t.categories[key as keyof typeof t.categories]}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          <AnimatePresence mode="popLayout">
            {currentBlogs.map(blog => (
              <BlogCard 
                key={blog.id} 
                blog={blog} 
                lang={lang} 
                onReadMore={(b) => setSelectedBlog(b)} 
              />
            ))}
          </AnimatePresence>
        </div>

        {filtered.length > 0 && (
          <div className="flex justify-center">
            {hasMore ? (
              <Button 
                variant="ghost" 
                className="font-bold text-primary group"
                onClick={() => setVisibleCount(prev => prev + 3)}
              >
                {t.loadMore} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            ) : filtered.length > 3 && (
              <Button 
                variant="ghost" 
                className="text-stone-400"
                onClick={() => setVisibleCount(3)}
              >
                {t.showLess}
              </Button>
            )}
          </div>
        )}
      </div>
      
      <BlogDetailModal 
        blog={selectedBlog} 
        open={!!selectedBlog} 
        onOpenChange={(open) => !open && setSelectedBlog(null)} 
        lang={lang}
      />

      <BlogEditorModal 
        open={isEditorOpen} 
        setOpen={setIsEditorOpen} 
        lang={lang} 
      />
    </section>
  );
};

const Navbar = ({ lang, setLang, onBook }: { lang: "EN" | "DE", setLang: (l: "EN" | "DE") => void, onBook: (ctx?: BookingContext) => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[lang].nav;

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-background/80 backdrop-blur-md border-b py-3" : "bg-transparent py-6"}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Niramay Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
          <span className="font-serif text-2xl font-bold tracking-tight">Niramay</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          <a href="#services" className="text-sm font-medium hover:text-primary transition-colors">{t.services}</a>
          <a href="#sessions" className="text-sm font-medium hover:text-primary transition-colors">{t.sessions}</a>
          <a href="#courses" className="text-sm font-medium hover:text-primary transition-colors">{t.courses}</a>
          <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">{t.about}</a>
          <a href="#events" className="text-sm font-medium hover:text-primary transition-colors">{t.events}</a>
          <a href="#book" className="text-sm font-medium hover:text-primary transition-colors">{t.book}</a>
          {FEATURE_BLOG_ENABLED && <a href="#blog" className="text-sm font-medium hover:text-primary transition-colors">{t.blog}</a>}
          <a href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">{t.reviews}</a>
          <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">{t.faq}</a>
          
          <div className="flex items-center gap-4 ml-4">
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "EN" ? "DE" : "EN")} className="gap-2">
              <Globe className="w-4 h-4" />
              {lang}
            </Button>
            <Button size="sm" className="rounded-full px-6" onClick={() => onBook()}>{t.bookNow}</Button>
          </div>
        </div>

        <button className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-background border-b md:hidden p-6 flex flex-col gap-4"
          >
            <a href="#services" onClick={() => setIsMobileMenuOpen(false)}>{t.services}</a>
            <a href="#sessions" onClick={() => setIsMobileMenuOpen(false)}>{t.sessions}</a>
            <a href="#courses" onClick={() => setIsMobileMenuOpen(false)}>{t.courses}</a>
            <a href="#about" onClick={() => setIsMobileMenuOpen(false)}>{t.about}</a>
            <a href="#events" onClick={() => setIsMobileMenuOpen(false)}>{t.events}</a>
            <a href="#book" onClick={() => setIsMobileMenuOpen(false)}>{t.book}</a>
            {FEATURE_BLOG_ENABLED && <a href="#blog" onClick={() => setIsMobileMenuOpen(false)}>{t.blog}</a>}
            <a href="#testimonials" onClick={() => setIsMobileMenuOpen(false)}>{t.reviews}</a>
            <a href="#faq" onClick={() => setIsMobileMenuOpen(false)}>{t.faq}</a>
            <Separator />
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setLang(lang === "EN" ? "DE" : "EN")} className="gap-2">
                <Globe className="w-4 h-4" />
                {t.switchLang}
              </Button>
              <Button className="rounded-full" onClick={() => { setIsMobileMenuOpen(false); onBook(); }}>{t.bookNow}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ lang, onBook }: { lang: "EN" | "DE", onBook: (ctx?: BookingContext) => void }) => {
  const t = TRANSLATIONS[lang].hero;
  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
      </div>
      
      <div className="container mx-auto px-6 relative z-10 grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <Badge variant="secondary" className="mb-6 px-4 py-1 rounded-full text-primary font-medium">
            {t.badge}
          </Badge>
          <h1 className="text-5xl md:text-7xl font-serif font-bold leading-[1.1] mb-6">
            {t.title.split(t.titleItalic)[0]}<span className="italic text-primary/80">{t.titleItalic}</span>{t.title.split(t.titleItalic)[1]}
          </h1>
          <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
            {t.description}
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" className="rounded-full px-8 gap-2 h-14 text-lg" onClick={() => onBook({ title: t.ctaPrimary })}>
              {t.ctaPrimary} <ArrowRight className="w-5 h-5" />
            </Button>
            <a href="#services">
              <Button size="lg" variant="outline" className="rounded-full px-8 h-14 text-lg">
                {t.ctaSecondary}
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="relative"
        >
          <div className="aspect-[4/5] rounded-[2rem] overflow-hidden shadow-2xl relative">
            <img 
              src="https://picsum.photos/seed/wellness/800/1000" 
              alt="Wellness Experience" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
          <div className="absolute -bottom-6 -left-6 bg-white p-6 rounded-2xl shadow-xl max-w-[200px] hidden md:block">
            <div className="flex gap-1 mb-2">
              {[1,2,3,4,5].map(i => <Sparkles key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />)}
            </div>
            <p className="text-sm font-medium italic">"{t.testimonial}"</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

const ServiceCard = ({ service, index, lang, onLearnMore }: { service: any, index: number, lang: "EN" | "DE", onLearnMore?: (s: any) => void, key?: any }) => {
  const t = TRANSLATIONS[lang].services;
  const content = service[lang];
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
    >
      <Card className="h-full border-none shadow-sm hover:shadow-md transition-shadow bg-white group overflow-hidden">
        <CardHeader className="pb-4">
          <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
            <service.icon className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-serif">{content.title}</CardTitle>
          <CardDescription className="font-medium text-primary/70">{service.category}</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground mb-6 leading-relaxed">{content.description}</p>
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
            <p className="text-xs font-bold uppercase tracking-wider text-primary/50 mb-2">{t.outcomeLabel}</p>
            <p className="text-sm font-medium">{content.outcome}</p>
          </div>
          {service.link && !service.openInModal ? (
            <a href={service.link} target="_blank" rel="noopener noreferrer" className="inline-block mt-6">
              <Button variant="link" className="p-0 h-auto font-bold text-primary group-hover:translate-x-1 transition-transform">
                {content.linkLabel || t.learnMore} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          ) : (
            <Button 
              variant="link" 
              className="mt-6 p-0 h-auto font-bold text-primary group-hover:translate-x-1 transition-transform"
              onClick={() => onLearnMore?.(service)}
            >
              {content.linkLabel || t.learnMore} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ServiceDetailModal = ({ service, lang, open, onOpenChange, onBook, onBookAstrology }: { service: any, lang: "EN" | "DE", open: boolean, onOpenChange: (o: boolean) => void, onBook: (ctx?: BookingContext) => void, onBookAstrology: () => void }) => {
  if (!service) return null;
  const t = TRANSLATIONS[lang].services;
  const nav = TRANSLATIONS[lang].nav;
  const ta = TRANSLATIONS[lang].astrology;
  const content = service[lang];
  const isAstrology = service.id === "astrology";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent initialFocus={false} className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className={`w-12 h-12 ${service.color} rounded-xl flex items-center justify-center mb-4`}>
            <service.icon className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-2xl md:text-3xl font-serif">{content.title}</DialogTitle>
          <p className="font-medium text-primary/70">{service.category}</p>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          <p className="text-muted-foreground leading-relaxed">{content.description}</p>
          <div className="bg-stone-50 p-4 rounded-xl border border-stone-100">
            <p className="text-xs font-bold uppercase tracking-wider text-primary/50 mb-2">{t.outcomeLabel}</p>
            <p className="text-sm font-medium">{content.outcome}</p>
          </div>

          {isAstrology && (
            <div className="space-y-10 pt-4 border-t border-stone-100">
              <p className="text-sm font-medium uppercase tracking-wider text-primary/60">{ta.traditionNote}</p>
              <p className="text-muted-foreground leading-relaxed">{ta.intro1}</p>
              <p className="text-muted-foreground leading-relaxed">{ta.intro2}</p>

              <div>
                <h4 className="text-xl font-serif font-bold mb-6">{ta.exploreTitle}</h4>
                <div className="grid sm:grid-cols-2 gap-4">
                  {ta.exploreItems.map((item, idx) => (
                    <div key={idx} className="bg-stone-50 p-4 rounded-xl border border-stone-100">
                      <p className="font-bold text-sm mb-1">{item.title}</p>
                      <p className="text-muted-foreground text-sm leading-relaxed">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xl font-serif font-bold mb-4">{ta.whoTitle}</h4>
                <ul className="space-y-3">
                  {ta.whoItems.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                      <span className="text-muted-foreground text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xl font-serif font-bold mb-4">{ta.howTitle}</h4>
                <div className="space-y-4">
                  {ta.howSteps.map((step, idx) => (
                    <div key={idx} className="flex gap-4">
                      <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-bold text-sm mb-1">{step.title}</p>
                        <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="pt-2">
            <Button
              size="lg"
              className="rounded-full px-8 gap-2 w-full sm:w-auto"
              onClick={() => {
                // Close the detail dialog first so the booking/intake dialog
                // never stacks on top of it (two Dialogs open at once =
                // fragile focus/backdrop behavior).
                onOpenChange(false);
                if (isAstrology) {
                  // Astrology doesn't use the self-serve calendar: an
                  // appointment can't be offered until birth details and
                  // advance payment are in, so it gets its own intake flow.
                  onBookAstrology();
                } else {
                  onBook({
                    title: content.title,
                    subtitle: content.outcome,
                    meta: [{ icon: service.icon, label: service.category }],
                  });
                }
              }}
            >
              <Sparkles className="w-4 h-4" />
              {isAstrology ? ta.cta : nav.bookNow}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const ServicesSection = ({ lang, onLearnMore }: { lang: "EN" | "DE", onLearnMore?: (s: any) => void }) => {
  const t = TRANSLATIONS[lang].services;
  return (
    <section id="services" className="py-24 bg-stone-50/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t.title}</h2>
          <p className="text-muted-foreground text-lg">
            {t.description}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {SERVICES.map((service, idx) => (
            <ServiceCard key={service.id} service={service} index={idx} lang={lang} onLearnMore={onLearnMore} />
          ))}
        </div>
      </div>
    </section>
  );
};

const OngoingSessionsSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].sessions;
  return (
    <section id="sessions" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t.title}</h2>
          <p className="text-muted-foreground text-lg">
            {t.description}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {ONGOING_SESSIONS.map((session, idx) => {
            const content = session[lang];
            return (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
              >
                <Card className="h-full border border-stone-100 shadow-sm hover:shadow-md transition-all bg-stone-50/30 flex flex-col">
                  <CardHeader>
                    <CardTitle className="text-xl font-serif">{content.title}</CardTitle>
                    <div className="flex items-center gap-2 text-primary font-medium text-sm mt-2">
                      <Clock className="w-4 h-4" />
                      {content.time}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                      <MapPin className="w-4 h-4" />
                      {content.location}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
                      {content.description}
                    </p>
                    <p className="text-stone-500 text-xs mb-6">
                      {t.by} {content.instructor}
                    </p>
                    <div className="mt-auto">
                      <a
                        href={`https://wa.me/4915175315761?text=${encodeURIComponent(`Hi, I'm interested in joining "${content.title}" (${content.time}).`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button size="sm" variant="outline" className="rounded-full w-full">
                          {t.bookBtn}
                        </Button>
                      </a>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        <p className="text-center text-muted-foreground text-sm mt-10">
          {t.contactNote}
        </p>
      </div>
    </section>
  );
};

// Generic "Courses" section: multi-week courses and workshops. Each entry may
// carry a `provider` (e.g. VHS Ostfildern) who owns registration/the course
// number, in which case the card links out to them instead of a direct
// WhatsApp booking. A course without a `provider` (a future Niramay-run
// course) falls back to the same WhatsApp flow as OngoingSessionsSection.
const CoursesSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].courses;
  const sessionsT = TRANSLATIONS[lang].sessions;
  return (
    <section id="courses" className="py-24 bg-stone-50/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t.title}</h2>
          <p className="text-muted-foreground text-lg">
            {t.description}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {COURSES.map((course, idx) => {
            const content = course[lang];
            return (
              <motion.div
                key={course.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.06 }}
              >
                <Card className="h-full border border-stone-100 shadow-sm hover:shadow-md transition-all bg-white flex flex-col">
                  <CardHeader>
                    {course.provider && (
                      <Badge variant="secondary" className="w-fit text-primary mb-1">
                        {course.provider}
                      </Badge>
                    )}
                    <CardTitle className="text-xl font-serif">{content.title}</CardTitle>
                    <div className="flex items-center gap-2 text-primary font-medium text-sm mt-2">
                      <Clock className="w-4 h-4" />
                      {content.time}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground text-sm mt-1">
                      <MapPin className="w-4 h-4" />
                      {content.location}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-col flex-1">
                    <p className="text-muted-foreground text-sm mb-2 leading-relaxed">
                      {content.description}
                    </p>
                    <p className="text-stone-500 text-xs mb-6">
                      {t.by} {content.instructor}
                    </p>
                    <div className="mt-auto space-y-2">
                      {course.provider && course.registrationUrl ? (
                        <>
                          <a href={course.registrationUrl} target="_blank" rel="noopener noreferrer">
                            <Button size="sm" variant="outline" className="rounded-full w-full gap-1.5">
                              {t.registerVia} {course.provider}
                              <ExternalLink className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                          {course.kursnr && (
                            <p className="text-center text-stone-400 text-xs">
                              {t.courseNo} {course.kursnr}
                            </p>
                          )}
                        </>
                      ) : (
                        <a
                          href={`https://wa.me/4915175315761?text=${encodeURIComponent(`Hi, I'm interested in the "${content.title}" course (${content.time}).`)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button size="sm" variant="outline" className="rounded-full w-full">
                            {sessionsT.bookBtn}
                          </Button>
                        </a>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
        <p className="text-center text-muted-foreground text-sm mt-10">
          {t.contactNote}
        </p>
      </div>
    </section>
  );
};

const EventLightboxModal = ({ index, setIndex, lang }: { index: number | null, setIndex: (i: number | null) => void, lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].events;
  if (index === null) return null;
  const event = EVENTS[index];
  const content = event[lang];

  const go = (delta: number) => setIndex((index + delta + EVENTS.length) % EVENTS.length);

  return (
    <Dialog open={index !== null} onOpenChange={(o) => !o && setIndex(null)}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <div className="relative bg-stone-950 flex items-center justify-center max-h-[60vh] overflow-hidden">
          <img
            src={event.image}
            alt={content.title}
            className="w-full max-h-[60vh] object-contain"
            referrerPolicy="no-referrer"
          />
          <button
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white rounded-full p-2 backdrop-blur-sm transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <Badge variant="secondary" className="text-primary">{event.year}</Badge>
              {event.featured && <Badge className="bg-primary text-primary-foreground">{t.featured}</Badge>}
            </div>
            <DialogTitle className="text-2xl font-serif">{content.title}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-2 mb-4">
            <MapPin className="w-4 h-4 shrink-0" /> {content.location}
          </div>
          <p className="text-muted-foreground leading-relaxed">{content.description}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const EventsSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].events;
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  return (
    <section id="events" className="py-24 bg-stone-50/50">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t.title}</h2>
          <p className="text-muted-foreground text-lg">{t.description}</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {EVENTS.map((event, idx) => {
            const content = event[lang];
            return (
              <motion.button
                key={event.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: (idx % 3) * 0.08 }}
                className={`group text-left rounded-2xl overflow-hidden bg-white border shadow-sm hover:shadow-xl transition-all duration-300 relative ${event.featured ? "border-primary/40 ring-2 ring-primary/20" : "border-stone-100"}`}
              >
                <div className="aspect-[4/3] overflow-hidden">
                  <img
                    src={event.image}
                    alt={content.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                </div>
                {event.featured && (
                  <Badge className="absolute top-3 left-3 bg-primary text-primary-foreground border-none shadow-md">
                    {t.featured}
                  </Badge>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-primary/60 mb-2">
                    <Calendar className="w-3.5 h-3.5" /> {event.year}
                  </div>
                  <h3 className="font-serif text-lg font-bold mb-1 leading-snug line-clamp-2">{content.title}</h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="line-clamp-1">{content.location}</span>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      <EventLightboxModal index={selectedIndex} setIndex={setSelectedIndex} lang={lang} />
    </section>
  );
};

const AboutSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].about;
  return (
    <section id="about" className="py-24 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div className="relative">
            <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl bg-gradient-to-br from-primary/15 via-primary/5 to-stone-100 flex flex-col items-center justify-center gap-4">
              <Flower2 className="w-20 h-20 text-primary/40" strokeWidth={1.25} />
              <p className="text-sm font-medium text-primary/50 tracking-wide uppercase">
                {lang === "EN" ? "Photo coming soon" : "Foto folgt in Kürze"}
              </p>
            </div>
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-primary/5 rounded-full" />
          </div>

          <div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-8">{t.title}</h2>
            <p className="text-lg text-muted-foreground mb-6 leading-relaxed">
              {t.p1}
            </p>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed">
              {t.p2}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-10">
              {CERTIFICATIONS.map((cert, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                  <cert.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{cert[lang].name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const TestimonialsSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const [filter, setFilter] = useState("all");
  const [dynamicReviews, setDynamicReviews] = useState<any[]>([]);
  const t = TRANSLATIONS[lang].testimonials;
  
  useEffect(() => {
    const q = query(collection(db, "reviews"), where("approved", "==", true), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviews = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          // Make review content available in both language variants
          EN: {
            content: data.content,
            role: data.role
          },
          DE: {
            content: data.content,
            role: data.role
          }
        };
      });
      setDynamicReviews(reviews);
    });
    return () => unsubscribe();
  }, []); // Remove lang from dependency to avoid unnecessary re-triggers, though it works either way

  const allReviews = [...TESTIMONIALS, ...dynamicReviews];
  const filtered = filter === "all" ? allReviews : allReviews.filter(t => t.category === filter);

  return (
    <section id="testimonials" className="py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t.title}</h2>
            <p className="text-primary-foreground/70 text-lg mb-8">
              {t.description}
            </p>
            <div className="flex flex-wrap gap-4">
              <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer">
                <Button className="rounded-full bg-white text-primary hover:bg-stone-100 gap-2">
                  <Globe className="w-4 h-4" /> {t.googleReview}
                </Button>
              </a>
              <LeaveReviewModal lang={lang} />
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "Physical Wellness", "Mental Clarity", "Spiritual Healing", "Kids Yoga", "Dance Therapy", "Tarot Reading", "Chair Yoga"].map(cat => {
              const key = cat === "all" ? "all" : 
                cat === "Physical Wellness" ? "physical" :
                cat === "Mental Clarity" ? "mental" :
                cat === "Spiritual Healing" ? "spiritual" :
                cat === "Kids Yoga" ? "kids" :
                cat === "Dance Therapy" ? "dance" :
                cat === "Tarot Reading" ? "tarot" :
                cat === "Chair Yoga" ? "chair" : "all";
              
              return (
                <Button 
                  key={cat} 
                  variant={filter === cat ? "secondary" : "outline"} 
                  size="sm" 
                  onClick={() => setFilter(cat)}
                  className="rounded-full border-primary-foreground/20 hover:bg-primary-foreground hover:text-primary transition-all duration-300"
                >
                  {t.filters[key as keyof typeof t.filters]}
                </Button>
              );
            })}
          </div>
        </div>

        <div className="relative group">
          <div 
            id="reviews-container"
            className="flex overflow-x-auto gap-8 pb-12 snap-x no-scrollbar scroll-smooth"
          >
            <AnimatePresence mode="popLayout">
              {filtered.map((test, idx) => {
                const content = test[lang] || test["EN"] || test["DE"];
                return (
                  <motion.div
                    key={test.id || idx}
                    layout
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.4 }}
                    className="min-w-[280px] md:min-w-[380px] flex-shrink-0 snap-start"
                  >
                    <Card className="bg-white/10 border-white/10 backdrop-blur-sm text-white h-[400px] hover:bg-white/15 transition-colors flex flex-col">
                      <CardHeader className="flex-grow flex flex-col">
                        <div className="flex gap-1 mb-4">
                          {[1,2,3,4,5].map(i => (
                            <Star
                              key={i} 
                              className={`w-4 h-4 ${i <= (test.rating || 5) ? 'text-yellow-400 fill-yellow-400' : 'text-white/20'}`} 
                            />
                          ))}
                        </div>
                        <div className="flex-grow overflow-y-auto no-scrollbar mb-6">
                           <p className="text-lg italic font-serif leading-relaxed line-clamp-6">"{content.content}"</p>
                        </div>
                        <Separator className="bg-white/10 mb-6" />
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm flex-shrink-0">
                            {test.name ? test.name[0] : "N"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-lg leading-none mb-1 truncate">{test.name}</p>
                            <p className="text-sm text-white/60 truncate">{content.role}</p>
                          </div>
                        </div>
                      </CardHeader>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          
          {/* Scroll indicators/fade */}
          <div className="absolute top-0 right-0 h-full w-24 bg-gradient-to-l from-primary to-transparent pointer-events-none hidden md:block" />
          
          {/* Navigation Buttons for better UX */}
          <div className="absolute -left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full bg-white/10 border-white/20 text-white backdrop-blur-md"
              onClick={() => document.getElementById('reviews-container')?.scrollBy({ left: -400, behavior: 'smooth' })}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
          <div className="absolute -right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:block">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full bg-white/10 border-white/20 text-white backdrop-blur-md"
              onClick={() => document.getElementById('reviews-container')?.scrollBy({ left: 400, behavior: 'smooth' })}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="mt-16 text-center">
          <Button variant="outline" className="rounded-full border-white/20 text-white hover:bg-white hover:text-primary gap-2">
            {t.googleReview} <Globe className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

const FAQSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].faq;
  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold mb-6">{t.title}</h2>
          <p className="text-muted-foreground text-lg">{t.description}</p>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          {FAQS.map((faq, idx) => {
            const content = faq[lang];
            return (
              <AccordionItem key={idx} value={`item-${idx}`} className="border-b-stone-200 px-4">
                <AccordionTrigger className="text-left text-lg font-medium py-6 hover:no-underline hover:text-primary transition-colors">
                  {content.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-lg leading-relaxed pb-6">
                  {content.answer}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </section>
  );
};

const Footer = ({ lang, onOpenLegal }: { lang: "EN" | "DE", onOpenLegal: (type: "impressum" | "privacy") => void }) => {
  const t = TRANSLATIONS[lang].footer;
  const nav = TRANSLATIONS[lang].nav;
  return (
    <footer className="bg-stone-50 pt-24 pb-12 border-t">
      <div className="container mx-auto px-6">
        <div className="grid md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <img src="/logo.svg" alt="Niramay Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
              <span className="font-serif text-2xl font-bold tracking-tight">Niramay</span>
            </div>
            <p className="text-muted-foreground text-lg max-w-md mb-8">
              {t.description}
            </p>
            <div className="flex gap-4">
              <a href="https://www.instagram.com/niramay.me/" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary hover:text-primary-foreground transition-all">
                  <Instagram className="w-5 h-5" />
                </Button>
              </a>
              <a href="https://www.facebook.com/niramayme/" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary hover:text-primary-foreground transition-all">
                  <Facebook className="w-5 h-5" />
                </Button>
              </a>
              <a href="https://www.youtube.com/@richaniramayme" target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary hover:text-primary-foreground transition-all">
                  <Youtube className="w-5 h-5" />
                </Button>
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6">{t.quickLinks}</h4>
            <ul className="space-y-4">
              <li><a href="#services" className="text-muted-foreground hover:text-primary transition-colors">{nav.services}</a></li>
              <li><a href="#about" className="text-muted-foreground hover:text-primary transition-colors">{nav.about}</a></li>
              <li><a href="#events" className="text-muted-foreground hover:text-primary transition-colors">{nav.events}</a></li>
              <li><a href="#book" className="text-muted-foreground hover:text-primary transition-colors">{nav.book}</a></li>
              <li><a href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors">{nav.reviews}</a></li>
              {FEATURE_BLOG_ENABLED && <li><a href="#blog" className="text-muted-foreground hover:text-primary transition-colors">{nav.blog}</a></li>}
              <li><a href="#faq" className="text-muted-foreground hover:text-primary transition-colors">{nav.faq}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">{t.contact}</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>Ostfildern, Germany</span>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <MessageCircle className="w-5 h-5 text-primary shrink-0" />
                <a href="https://wa.me/4915175315761" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  WhatsApp: +49 151 75315761
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <Separator className="mb-8" />
        
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Niramay Wellness. {t.rights}</p>
          <div className="flex gap-8">
            <button onClick={() => onOpenLegal("impressum")} className="hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0">{t.impressum}</button>
            <button onClick={() => onOpenLegal("privacy")} className="hover:text-primary transition-colors cursor-pointer bg-transparent border-none p-0">{t.privacy}</button>
          </div>
        </div>
      </div>
      
      <a 
        href="https://wa.me/4915175315761?text=Hi%20Richa,%20I'm%20interested%20in%20learning%20more%20about%20your%20wellness%20sessions!" 
        target="_blank" 
        rel="noopener noreferrer"
        className="fixed bottom-8 right-8 bg-[#25D366] text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center gap-2 group"
      >
        <MessageCircle className="w-6 h-6" />
        <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 whitespace-nowrap font-medium">{t.whatsapp}</span>
      </a>
    </footer>
  );
};

const LegalModal = ({ type, open, setOpen, lang }: { type: "impressum" | "privacy" | null, open: boolean, setOpen: (o: boolean) => void, lang: "EN" | "DE" }) => {
  if (!type) return null;
  const t = TRANSLATIONS[lang].footer.legal[type];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-serif font-bold text-primary">{t.title}</DialogTitle>
        </DialogHeader>
        
        <div className="mt-8 space-y-12">
          {type === "impressum" ? (
            <div className="space-y-8">
              {["section1", "section2", "section3", "section4"].map((s) => {
                const section = (t as any)[s];
                return (
                  <div key={s}>
                    <h3 className="text-xl font-bold mb-4 text-stone-800">{section.title}</h3>
                    <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-8">
              <p className="text-lg text-stone-600 italic">{(t as any).intro}</p>
              {(t as any).sections.map((section: any, idx: number) => (
                <div key={idx}>
                  <h3 className="text-xl font-bold mb-4 text-stone-800">{section.title}</h3>
                  <p className="text-stone-600 leading-relaxed whitespace-pre-wrap">{section.content}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BookSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].book;
  return (
    <section id="book" className="py-24 bg-[#FAF9F6] overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="flex flex-col lg:flex-row items-center gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/2 relative"
          >
            <div className="relative z-10 rounded-2xl overflow-hidden shadow-[20px_30px_60px_-12px_rgba(0,0,0,0.5)] group bg-stone-900 aspect-[2/3] max-w-sm mx-auto border-r-4 border-stone-800">
              <img
                src="/bookcover.webp"
                alt="Journey from Body to Bliss Book"
                width={900}
                height={1350}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-contain transition-transform duration-1000 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center p-12 text-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <p className="text-white text-lg font-serif italic mb-4">{t.subtitle}</p>
                <div className="w-12 h-0.5 bg-primary/60" />
              </div>
            </div>
            {/* Decorative background elements */}
            <div className="absolute -top-20 -left-20 w-80 h-80 bg-primary/10 rounded-full blur-[100px] -z-10 animate-pulse" />
            <div className="absolute -bottom-20 -right-20 w-96 h-96 bg-stone-200 rounded-full blur-[120px] -z-10" />
            
            {/* Float badge */}
            <motion.div 
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-4 top-20 z-20 bg-white p-6 rounded-2xl shadow-xl border border-stone-100 hidden md:block"
            >
              <div className="flex flex-col items-center gap-2">
                <div className="flex text-yellow-500">
                  {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
                </div>
                <p className="text-xs font-bold text-stone-400 tracking-widest uppercase">{t.badges[0]}</p>
              </div>
            </motion.div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="lg:w-1/2"
          >
            <div className="flex flex-wrap gap-3 mb-6">
              {t.badges.map((badge, idx) => (
                <Badge key={idx} variant="outline" className="text-primary border-primary/20 bg-primary/5 px-4 py-1">
                  {badge}
                </Badge>
              ))}
            </div>
            
            <h2 className="text-4xl md:text-6xl font-serif font-bold mb-4 text-primary leading-tight">
              {t.title}
            </h2>
            <h3 className="text-xl md:text-2xl font-serif italic text-stone-500 mb-8">
              {t.subtitle}
            </h3>
            
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              {t.description}
            </p>

            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/25 to-primary/10 border-2 border-white shadow-sm flex items-center justify-center text-primary font-serif font-bold">
                RK
              </div>
              <div>
                <p className="font-bold text-stone-800">{t.author}</p>
                <p className="text-sm text-stone-500">{lang === "EN" ? "Lead Trainer & Author" : "Cheftrainerin & Autorin"}</p>
              </div>
            </div>

            <a 
              href={t.link} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-block"
            >
              <Button size="lg" className="rounded-full px-10 h-16 text-lg gap-3 shadow-xl hover:shadow-primary/20 transition-all">
                <Sparkles className="w-5 h-5" />
                {t.cta}
              </Button>
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default function App() {
  const [lang, setLang] = useState<"EN" | "DE">("EN");
  const [selectedBlog, setSelectedBlog] = useState<any>(null);
  const [selectedService, setSelectedService] = useState<any>(null);
  const [legalModal, setLegalModal] = useState<"impressum" | "privacy" | null>(null);
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);
  const openBooking = (ctx: BookingContext = {}) => setBookingContext(ctx);
  const [astrologyIntakeOpen, setAstrologyIntakeOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang.toLowerCase();
    document.title = lang === "EN"
      ? "Niramay Wellbeing — Yoga, Reiki & Holistic Therapy in Ostfildern"
      : "Niramay Wellbeing — Yoga, Reiki & Ganzheitliche Therapie in Ostfildern";
  }, [lang]);

  const handleServiceLearnMore = (service: any) => {
    if (service.link && service.openInModal) {
      setSelectedBlog({
        id: service.id,
        title: service[lang].title,
        category: service.category,
        image: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&q=80&w=800",
        content: service[lang].description,
        externalLink: service.link,
        author: "Niramay Tool"
      });
      return;
    }

    // Every other service always has its own description/outcome copy (and,
    // for astrology, a full detail write-up), so its "Learn More" pop-up
    // never needs to depend on a blog post existing.
    setSelectedService(service);
  };

  return (
    <div className="min-h-screen selection:bg-primary/20">
      <Navbar lang={lang} setLang={setLang} onBook={openBooking} />
      <main>
        <Hero lang={lang} onBook={openBooking} />
        <ServicesSection lang={lang} onLearnMore={handleServiceLearnMore} />
        <OngoingSessionsSection lang={lang} />
        <CoursesSection lang={lang} />
        <AboutSection lang={lang} />
        <EventsSection lang={lang} />
        <BookSection lang={lang} />
        {FEATURE_BLOG_ENABLED && <BlogSection lang={lang} />}
        <TestimonialsSection lang={lang} />
        <FAQSection lang={lang} />
      </main>
      <Footer lang={lang} onOpenLegal={setLegalModal} />
      
      <BlogDetailModal
        blog={selectedBlog}
        open={!!selectedBlog}
        onOpenChange={(open) => !open && setSelectedBlog(null)}
        lang={lang}
      />

      <ServiceDetailModal
        service={selectedService}
        open={!!selectedService}
        onOpenChange={(open) => !open && setSelectedService(null)}
        lang={lang}
        onBook={openBooking}
        onBookAstrology={() => setAstrologyIntakeOpen(true)}
      />

      <LegalModal
        type={legalModal}
        open={!!legalModal}
        setOpen={(o) => !o && setLegalModal(null)}
        lang={lang}
      />

      <BookingDialog
        context={bookingContext}
        open={!!bookingContext}
        onOpenChange={(open) => !open && setBookingContext(null)}
        lang={lang}
      />

      <AstrologyIntakeModal
        lang={lang}
        open={astrologyIntakeOpen}
        onOpenChange={setAstrologyIntakeOpen}
        onOpenPrivacy={() => setLegalModal("privacy")}
      />
    </div>
  );
}
