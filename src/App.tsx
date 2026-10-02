import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate, Outlet, useParams, useOutletContext, useLocation, useNavigate, matchRoutes } from "react-router-dom";
import { SpeedInsights } from "@vercel/speed-insights/react";
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
  ChevronDown,
  ExternalLink,
  Heart,
  Volume2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "./lib/firebase";
import { AuthProvider, useAuth } from "./lib/auth";
import { AuthDialog } from "./components/AuthDialog";
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  addDoc,
  updateDoc,
  getDocs,
  limit,
  doc,
  serverTimestamp,
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
import { NavigationMenu } from "@base-ui/react/navigation-menu";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SERVICES, TESTIMONIALS, FAQS, HEALER_CERTIFICATIONS, HEALER_IMAGES, TRANSLATIONS, ONGOING_SESSIONS, COURSES, EVENTS, GOOGLE_CALENDAR_URL, GOOGLE_REVIEW_URL, BUSINESS_STREET_ADDRESS, BUSINESS_POSTAL_CODE, BUSINESS_CITY, GOOGLE_MAPS_URL, GOOGLE_MAPS_EMBED_URL } from "./constants";
import { getStoredConsent, grantAnalyticsConsent, denyAnalyticsConsent, initAnalyticsFromStoredConsent, trackPageview } from "./lib/analytics";
import { SITE_URL, BUSINESS_JSONLD_ID, useJsonLd, useSeo } from "./lib/seo";
import { responsiveImage } from "./lib/images";

// A single booking dialog, controlled from the App root (see the other
// ...DetailModal components below for the same lift-state-up pattern).
// Every "Book" trigger across the site hands it a BookingContext describing
// exactly what's being booked, so the dialog never shows a bare, unlabeled
// calendar no matter which service/session/CTA the visitor came from.
type BookingMeta = { icon: React.ComponentType<{ className?: string }>; label: string };
type BookingContext = { title?: string; subtitle?: string; meta?: BookingMeta[] };

// Now that sections live across real routes instead of one page, plain
// browser history no longer handles navigation on its own: react-router
// doesn't scroll to top on a route change (unlike a full page load), and a
// "#services"-style link only works if the target section is on the
// current page. This runs once at the layout level and re-derives the
// right scroll behavior from the URL on every navigation: jump to the
// hash's element if there is one (giving nav/footer section links a real
// target regardless of which route they're clicked from), else reset to
// the top (so navigating between two service pages doesn't leave you
// stranded at whatever scroll offset the previous page was at).
function ScrollManager() {
  const location = useLocation();
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (location.hash) {
        document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
      } else {
        window.scrollTo(0, 0);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [location.pathname, location.hash]);
  return null;
}

type LayoutContext = {
  lang: "EN" | "DE";
  onBook: (ctx?: BookingContext) => void;
  onBookAstrology: () => void;
  onOpenLegal: (type: "impressum" | "privacy") => void;
};

// EN pages live unprefixed ("/", "/services/yoga") since that's what was
// already indexed; DE pages live under "/de" ("/de", "/de/services/yoga").
// Centralized here since both the router (App) and every internal link
// that must stay in the current language (Navbar, Footer, ServiceCard,
// ServicePage's cross-links) need the same mapping.
const langPrefix = (lang: "EN" | "DE") => (lang === "DE" ? "/de" : "");

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
  const { profile } = useAuth();
  const [step, setStep] = useState<AstrologyStep>("details");
  const [form, setForm] = useState<AstrologyForm>(EMPTY_ASTROLOGY_FORM);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill from the signed-in user's saved profile, without overwriting
  // anything they've already typed into the form themselves.
  useEffect(() => {
    if (!open || !profile) return;
    setForm(f => ({
      ...f,
      name: f.name || profile.displayName,
      contact: f.contact || profile.email,
    }));
  }, [open, profile]);

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
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    rating: 5,
    content: "",
    category: "Mental Clarity",
    role: "",
  });

  // Prefill from the signed-in user's saved profile, without overwriting
  // anything they've already typed into the form themselves.
  useEffect(() => {
    if (!open || !profile) return;
    setFormData(f => ({ ...f, name: f.name || profile.displayName }));
  }, [open, profile]);

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
        <Button variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white hover:text-primary gap-2">
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
              <option value="Kids Yoga">Kids Yoga</option>
              <option value="Dance Therapy">Dance Therapy</option>
              <option value="Tarot Reading">Tarot Reading</option>
              <option value="Chair Yoga">Chair Yoga</option>
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

const BlogCard = ({ blog, lang }: { blog: any, lang: "EN" | "DE", key?: any }) => {
  const t = TRANSLATIONS[lang].blog;
  const prefix = langPrefix(lang);
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="h-full"
    >
      <Link to={`${prefix}/blog/${blog.slug}`} className="block h-full">
        <Card className="overflow-hidden border-stone-100 flex flex-col h-full hover:shadow-xl transition-all duration-500 group">
          {/* A post may or may not have an image — no placeholder is shown
              when it doesn't, rather than faking a stock photo. */}
          {blog.image && (
            <div className="relative h-56 overflow-hidden">
              <img
                {...responsiveImage(blog.image, 1080)}
                sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
                loading="lazy"
                decoding="async"
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
          )}
          <CardHeader className="flex-grow">
            {!blog.image && (
              <Badge variant="outline" className="w-fit mb-2">{blog.category}</Badge>
            )}
            <CardTitle className="text-xl font-serif mb-2 line-clamp-2 leading-tight">
              {blog.title}
            </CardTitle>
            <CardDescription className="line-clamp-3">
              {blog.excerpt}
            </CardDescription>
          </CardHeader>
          <CardFooter className="pt-0 flex items-center gap-4">
            <span className="text-primary font-bold group-hover:translate-x-1 transition-transform inline-flex items-center">
              {t.readMore} <Plus className="ml-2 w-4 h-4" />
            </span>
            {blog.audioUrl && <Volume2 className="w-4 h-4 text-muted-foreground shrink-0" />}
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
};

// The "openInModal" service cards (external interactive tools hosted on
// lovable.app) preview in a plain iframe modal — not Niramay's own content,
// so unlike blog posts they don't get a page of their own.
const ToolPreviewModal = ({ tool, open, onOpenChange }: { tool: { title: string; link: string } | null, open: boolean, onOpenChange: (o: boolean) => void }) => {
  if (!tool) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl md:text-3xl font-serif">{tool.title}</DialogTitle>
        </DialogHeader>
        <div className="w-full aspect-[4/3] md:aspect-video rounded-2xl overflow-hidden border border-stone-100 shadow-inner">
          <iframe src={tool.link} className="w-full h-full border-0" title={tool.title} />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const BlogSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const [blogs, setBlogs] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(3);
  const t = TRANSLATIONS[lang].blog;

  useEffect(() => {
    // Public visitors only ever see published posts — see the isBlogAdmin()
    // OR clause in firestore.rules that additionally lets Richa/Riju read
    // their own drafts from the /write dashboard.
    const q = query(
      collection(db, "blogs"),
      where("lang", "==", lang),
      where("published", "==", true),
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
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-primary mb-4">{t.title}</h2>
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

        {filtered.length === 0 ? (
          <p className="text-center text-stone-400 py-12">
            {blogs.length === 0 ? t.emptyState : t.emptyStateFiltered}
          </p>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
            <AnimatePresence mode="popLayout">
              {currentBlogs.map(blog => (
                <BlogCard
                  key={blog.id}
                  blog={blog}
                  lang={lang}
                />
              ))}
            </AnimatePresence>
          </div>
        )}

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
    </section>
  );
};

// A single link inside a nav dropdown's popup, wired to react-router via
// Base UI's `render` prop (see the "Use the render prop for client-side
// routing" note in the Navigation Menu docs) so it keeps history-based
// navigation while getting the menu's own close-on-click/keyboard behavior.
const NavDropdownLink = ({ to, children }: { to: string, children: React.ReactNode }) => (
  <NavigationMenu.Link
    render={<Link to={to} />}
    closeOnClick
    className="block rounded-lg px-3 py-2 text-sm font-medium text-foreground hover:bg-stone-50 hover:text-primary transition-colors"
  >
    {children}
  </NavigationMenu.Link>
);

// A top-level nav item that's just a link (Reviews, FAQ) rather than a
// dropdown — same visual weight as a dropdown trigger so the row reads as
// one consistent set of items.
const NavFlatLink = ({ to, children }: { to: string, children: React.ReactNode }) => (
  <NavigationMenu.Item>
    <NavigationMenu.Link
      render={<Link to={to} />}
      closeOnClick
      className="flex h-full items-center text-sm font-medium hover:text-primary transition-colors outline-none"
    >
      {children}
    </NavigationMenu.Link>
  </NavigationMenu.Item>
);

const Navbar = ({ lang, onToggleLang, onBook }: { lang: "EN" | "DE", onToggleLang: () => void, onBook: (ctx?: BookingContext) => void }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const t = TRANSLATIONS[lang].nav;
  const ta = TRANSLATIONS[lang].auth;
  const prefix = langPrefix(lang);
  const { user, profile, loading, logOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const openAuth = (mode: "login" | "signup") => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-background/80 backdrop-blur-md border-b py-3" : "bg-transparent py-6"}`}>
      <div className="container mx-auto px-6 flex justify-between items-center">
        <Link to={prefix || "/"} className="flex items-center gap-2 shrink-0">
          <img src="/logo.svg" alt="Niramay Logo" className="w-10 h-10 object-contain shrink-0" referrerPolicy="no-referrer" />
          <span className="font-serif text-2xl font-bold tracking-tight whitespace-nowrap">Niramay</span>
        </Link>

        {/* Nine individual links used to need ~1250px to lay out without
            crowding the logo. Grouped into three dropdowns (About,
            Offerings, Read) plus the two links that matter most right
            before booking (Reviews, FAQ), the same content now fits from
            md up — see the conversation in the PR/commit for the reasoning. */}
        <div className="hidden md:flex items-center gap-6">
          <NavigationMenu.Root render={<div />} className="min-w-0">
            <NavigationMenu.List className="flex items-center gap-6">
              <NavigationMenu.Item>
                <NavigationMenu.Trigger className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors outline-none data-popup-open:text-primary">
                  {t.aboutGroup}
                  <NavigationMenu.Icon className="transition-transform duration-200 data-popup-open:rotate-180">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </NavigationMenu.Icon>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="w-48 p-2">
                  <NavDropdownLink to={`${prefix}/#about`}>{t.trainers}</NavDropdownLink>
                  <NavDropdownLink to={`${prefix}/#events`}>{t.events}</NavDropdownLink>
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              <NavigationMenu.Item>
                <NavigationMenu.Trigger className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors outline-none data-popup-open:text-primary">
                  {t.offerings}
                  <NavigationMenu.Icon className="transition-transform duration-200 data-popup-open:rotate-180">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </NavigationMenu.Icon>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="w-48 p-2">
                  <NavDropdownLink to={`${prefix}/#services`}>{t.services}</NavDropdownLink>
                  <NavDropdownLink to={`${prefix}/#sessions`}>{t.sessions}</NavDropdownLink>
                  <NavDropdownLink to={`${prefix}/#courses`}>{t.courses}</NavDropdownLink>
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              <NavigationMenu.Item>
                <NavigationMenu.Trigger className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors outline-none data-popup-open:text-primary">
                  {t.read}
                  <NavigationMenu.Icon className="transition-transform duration-200 data-popup-open:rotate-180">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </NavigationMenu.Icon>
                </NavigationMenu.Trigger>
                <NavigationMenu.Content className="w-48 p-2">
                  <NavDropdownLink to={`${prefix}/#blog`}>{t.blog}</NavDropdownLink>
                  <NavDropdownLink to={`${prefix}/#book`}>{t.book}</NavDropdownLink>
                </NavigationMenu.Content>
              </NavigationMenu.Item>

              <NavFlatLink to={`${prefix}/#testimonials`}>{t.reviews}</NavFlatLink>
              <NavFlatLink to={`${prefix}/faq`}>{t.faq}</NavFlatLink>
            </NavigationMenu.List>

            <NavigationMenu.Portal>
              <NavigationMenu.Positioner
                sideOffset={12}
                collisionPadding={16}
                className="z-50 box-border w-[var(--positioner-width)] max-w-[var(--available-width)] transition-[top,left,right,bottom] duration-200 ease-out data-instant:transition-none"
              >
                <NavigationMenu.Popup className="relative w-[var(--popup-width)] h-[var(--popup-height)] origin-[var(--transform-origin)] overflow-hidden rounded-2xl border border-stone-100 bg-white shadow-xl transition-[opacity,transform,width,height] duration-200 ease-out data-starting-style:scale-95 data-starting-style:opacity-0 data-ending-style:scale-95 data-ending-style:opacity-0">
                  <NavigationMenu.Viewport className="relative w-full h-full" />
                </NavigationMenu.Popup>
              </NavigationMenu.Positioner>
            </NavigationMenu.Portal>
          </NavigationMenu.Root>

          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onToggleLang} className="gap-2">
              <Globe className="w-4 h-4" />
              {lang}
            </Button>
            {!loading && (
              user ? (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-muted-foreground max-w-[140px] truncate">
                    {ta.helloPrefix}{profile?.displayName || user.email}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => logOut()}>{ta.navLogOut}</Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => openAuth("login")}>{ta.navLogIn}</Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => openAuth("signup")}>{ta.navSignUp}</Button>
                </div>
              )
            )}
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
            className="absolute top-full left-0 w-full max-h-[calc(100vh-5rem)] overflow-y-auto bg-background border-b md:hidden p-6 flex flex-col gap-1"
          >
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="about">
                <AccordionTrigger className="text-base font-medium">{t.aboutGroup}</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3 pl-2">
                    <Link to={`${prefix}/#about`} onClick={closeMobileMenu} className="text-muted-foreground hover:text-primary transition-colors">{t.trainers}</Link>
                    <Link to={`${prefix}/#events`} onClick={closeMobileMenu} className="text-muted-foreground hover:text-primary transition-colors">{t.events}</Link>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="offerings">
                <AccordionTrigger className="text-base font-medium">{t.offerings}</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3 pl-2">
                    <Link to={`${prefix}/#services`} onClick={closeMobileMenu} className="text-muted-foreground hover:text-primary transition-colors">{t.services}</Link>
                    <Link to={`${prefix}/#sessions`} onClick={closeMobileMenu} className="text-muted-foreground hover:text-primary transition-colors">{t.sessions}</Link>
                    <Link to={`${prefix}/#courses`} onClick={closeMobileMenu} className="text-muted-foreground hover:text-primary transition-colors">{t.courses}</Link>
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="read">
                <AccordionTrigger className="text-base font-medium">{t.read}</AccordionTrigger>
                <AccordionContent>
                  <div className="flex flex-col gap-3 pl-2">
                    <Link to={`${prefix}/#blog`} onClick={closeMobileMenu} className="text-muted-foreground hover:text-primary transition-colors">{t.blog}</Link>
                    <Link to={`${prefix}/#book`} onClick={closeMobileMenu} className="text-muted-foreground hover:text-primary transition-colors">{t.book}</Link>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Link to={`${prefix}/#testimonials`} onClick={closeMobileMenu} className="py-2.5 font-medium">{t.reviews}</Link>
            <Link to={`${prefix}/faq`} onClick={closeMobileMenu} className="py-2.5 font-medium">{t.faq}</Link>
            <Separator className="my-2" />
            {!loading && (
              user ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-muted-foreground truncate">
                    {ta.helloPrefix}{profile?.displayName || user.email}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => { closeMobileMenu(); logOut(); }}>{ta.navLogOut}</Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="flex-1" onClick={() => { closeMobileMenu(); openAuth("login"); }}>{ta.navLogIn}</Button>
                  <Button variant="outline" size="sm" className="flex-1 rounded-full" onClick={() => { closeMobileMenu(); openAuth("signup"); }}>{ta.navSignUp}</Button>
                </div>
              )
            )}
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={onToggleLang} className="gap-2">
                <Globe className="w-4 h-4" />
                {t.switchLang}
              </Button>
              <Button className="rounded-full" onClick={() => { setIsMobileMenuOpen(false); onBook(); }}>{t.bookNow}</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AuthDialog lang={lang} open={authOpen} onOpenChange={setAuthOpen} initialMode={authMode} />
    </nav>
  );
};

// The homepage hero is the only thing most visitors see before deciding to
// stay, so instead of a big photo taking half the fold it leads with what
// they came for: the latest articles, what clients say, and the book. The
// tree photo becomes a faint, slowly drifting backdrop behind all of it.
const Hero = ({ lang, onBook }: { lang: "EN" | "DE", onBook: (ctx?: BookingContext) => void }) => {
  const t = TRANSLATIONS[lang].hero;
  const tBook = TRANSLATIONS[lang].book;
  const prefix = langPrefix(lang);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);
  const [approvedReviews, setApprovedReviews] = useState<any[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  // One-shot reads (not live listeners) — BlogSection/TestimonialsSection
  // further down keep their own subscriptions; the hero only needs a peek.
  useEffect(() => {
    let cancelled = false;
    getDocs(query(
      collection(db, "blogs"),
      where("lang", "==", lang),
      where("published", "==", true),
      orderBy("createdAt", "desc"),
      limit(3)
    ))
      .then(snap => { if (!cancelled) setLatestPosts(snap.docs.map(d => ({ id: d.id, ...d.data() }))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [lang]);

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(db, "reviews"), where("approved", "==", true), orderBy("createdAt", "desc"), limit(6)))
      .then(snap => { if (!cancelled) setApprovedReviews(snap.docs.map(d => ({ id: d.id, ...d.data() }))); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Real, moderated reviews first; the seed TESTIMONIALS fill in until there
  // are enough of them.
  const reviews = useMemo(() => [
    ...approvedReviews.map(r => ({ id: r.id, name: r.name, rating: r.rating || 5, content: r.content, role: r.role })),
    ...TESTIMONIALS.map(r => ({ id: r.id, name: r.name, rating: 5, content: r[lang].content, role: r[lang].role })),
  ].slice(0, 6), [approvedReviews, lang]);

  useEffect(() => {
    if (reviews.length < 2) return;
    const id = setInterval(() => setReviewIndex(i => (i + 1) % reviews.length), 6000);
    return () => clearInterval(id);
  }, [reviews.length]);

  const review = reviews[reviewIndex % reviews.length];

  const reveal = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] as const },
  });

  const glass = "rounded-3xl bg-white/55 backdrop-blur-xl ring-1 ring-white/70 shadow-[0_8px_40px_-12px_rgba(28,25,23,0.18)]";

  return (
    <section className="relative isolate overflow-hidden pt-28 pb-12 md:pt-32 md:pb-20 lg:min-h-[92vh] flex items-center">
      {/* Faint photographic backdrop: the image drifts slowly (Ken Burns)
          under a wash of the page's own off-white, heavier where text sits. */}
      <div className="absolute inset-0 -z-10" aria-hidden="true">
        <img
          src="/hero-tree-ostfildern.webp"
          alt=""
          className="hero-drift w-full h-full object-cover object-[60%_55%] opacity-70 saturate-[0.85]"
          width={1200}
          height={1500}
          loading="eager"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/95 via-background/80 to-background lg:bg-gradient-to-r lg:from-background lg:via-background/85 lg:to-background/30" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-background to-transparent" />
        <div className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-amber-100/40 blur-3xl" />
      </div>

      <div className="container mx-auto px-6 grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 items-center">
        {/* Left: promise + actions */}
        <div>
          <motion.div {...reveal(0)}>
            <Badge variant="secondary" className="mb-5 px-4 py-1 rounded-full bg-white/70 backdrop-blur text-primary font-medium ring-1 ring-stone-200/70">
              <MapPin className="w-3.5 h-3.5 mr-1.5" />{t.badge}
            </Badge>
          </motion.div>
          <motion.h1 {...reveal(0.08)} className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-serif font-bold leading-[1.05] tracking-tight mb-5 text-balance">
            {t.title.split(t.titleItalic)[0]}
            <span className="italic bg-gradient-to-r from-stone-700 via-amber-700/80 to-stone-500 bg-clip-text text-transparent">{t.titleItalic}</span>
            {t.title.split(t.titleItalic)[1]}
          </motion.h1>
          <motion.p {...reveal(0.16)} className="text-base md:text-lg text-muted-foreground mb-7 max-w-lg leading-relaxed">
            {t.description}
          </motion.p>
          <motion.div {...reveal(0.24)} className="flex flex-wrap gap-3">
            <Button size="lg" className="rounded-full px-6 md:px-8 gap-2 h-12 md:h-14 text-base md:text-lg shadow-lg shadow-stone-900/10" onClick={() => onBook({ title: t.ctaPrimary })}>
              {t.ctaPrimary} <ArrowRight className="w-5 h-5" />
            </Button>
            <a href="#services">
              <Button size="lg" variant="outline" className="rounded-full px-6 md:px-8 h-12 md:h-14 text-base md:text-lg bg-white/60 backdrop-blur">
                {t.ctaSecondary}
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Right: bento of the site's most valuable content. On phones it
            becomes a swipeable row so it still shows within the first screen. */}
        <div className="-mx-6 px-6 lg:mx-0 lg:px-0 flex lg:grid lg:grid-cols-2 gap-4 overflow-x-auto lg:overflow-visible snap-x snap-mandatory no-scrollbar pb-2 lg:pb-0">
          {latestPosts.length > 0 && (
            <motion.div {...reveal(0.3)} className={`${glass} p-5 md:p-6 lg:col-span-2 min-w-[85%] sm:min-w-[60%] lg:min-w-0 snap-start`}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />{t.latestReads}
                </p>
                <a href="#blog" className="text-xs font-semibold text-primary hover:underline underline-offset-4">{t.seeAll}</a>
              </div>
              <ul className="divide-y divide-stone-200/70">
                {latestPosts.map(post => (
                  <li key={post.id}>
                    <Link to={`${prefix}/blog/${post.slug}`} className="group flex items-center gap-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="font-serif text-base md:text-lg leading-snug line-clamp-1 group-hover:text-stone-600 transition-colors">{post.title}</p>
                        {post.category && <p className="text-xs text-stone-500 mt-0.5">{post.category}</p>}
                      </div>
                      {post.audioUrl && <Volume2 className="w-4 h-4 text-stone-400 shrink-0" />}
                      <ArrowRight className="w-4 h-4 shrink-0 text-stone-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </Link>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {review && (
            <motion.a {...reveal(0.38)} href="#testimonials" className={`${glass} p-5 md:p-6 flex flex-col min-w-[85%] sm:min-w-[60%] lg:min-w-0 snap-start hover:bg-white/70 transition-colors`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex gap-0.5">
                  {[1,2,3,4,5].map(i => <Star key={i} className={`w-4 h-4 ${i <= review.rating ? "text-amber-500 fill-amber-500" : "text-stone-300"}`} />)}
                </div>
                <span className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500">{t.reviewsLabel}</span>
              </div>
              <div className="relative flex-1 min-h-[6.5rem]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.4 }}
                  >
                    <p className="font-serif italic text-[15px] md:text-base leading-relaxed text-stone-800 line-clamp-4">"{review.content}"</p>
                    <p className="mt-3 text-sm font-semibold text-stone-700">{review.name}{review.role && <span className="font-normal text-stone-500"> · {review.role}</span>}</p>
                  </motion.div>
                </AnimatePresence>
              </div>
              {reviews.length > 1 && (
                <div className="flex gap-1.5 mt-4">
                  {reviews.map((r, i) => (
                    <span key={r.id} className={`h-1 rounded-full transition-all duration-500 ${i === reviewIndex % reviews.length ? "w-6 bg-stone-700" : "w-1.5 bg-stone-300"}`} />
                  ))}
                </div>
              )}
            </motion.a>
          )}

          <motion.a {...reveal(0.46)} href="#book" className={`${glass} p-5 md:p-6 flex gap-4 items-center lg:flex-col lg:items-start min-w-[85%] sm:min-w-[60%] lg:min-w-0 snap-start group hover:bg-white/70 transition-colors`}>
            <img
              src={tBook.cover}
              alt=""
              width={900}
              height={1350}
              loading="lazy"
              decoding="async"
              className="w-16 lg:w-20 aspect-[2/3] object-cover rounded-md shadow-lg shadow-stone-900/20 -rotate-3 group-hover:rotate-0 transition-transform duration-500"
            />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-stone-500 mb-1">{t.bookLabel}</p>
              <p className="font-serif text-lg leading-snug">{tBook.title}</p>
              <p className="text-sm text-primary font-semibold mt-2 inline-flex items-center gap-1">
                {t.bookCta} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </p>
            </div>
          </motion.a>
        </div>
      </div>
    </section>
  );
};

const ServiceCard = ({ service, index, lang, onLearnMore }: { service: any, index: number, lang: "EN" | "DE", onLearnMore?: (s: any) => void, key?: any }) => {
  const t = TRANSLATIONS[lang].services;
  const content = service[lang];
  const prefix = langPrefix(lang);
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
          {service.link && service.openInModal ? (
            <Button
              variant="link"
              className="mt-6 p-0 h-auto font-bold text-primary group-hover:translate-x-1 transition-transform"
              onClick={() => onLearnMore?.(service)}
            >
              {content.linkLabel || t.learnMore} <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : service.link ? (
            <a href={service.link} target="_blank" rel="noopener noreferrer" className="inline-block mt-6">
              <Button variant="link" className="p-0 h-auto font-bold text-primary group-hover:translate-x-1 transition-transform">
                {content.linkLabel || t.learnMore} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </a>
          ) : (
            <Link to={`${prefix}/services/${service.id}`} className="inline-block mt-6">
              <Button variant="link" className="p-0 h-auto font-bold text-primary group-hover:translate-x-1 transition-transform">
                {content.linkLabel || t.learnMore} <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// Each in-house service's own indexable page at /services/:id — replaces
// the old ServiceDetailModal (a same-content popup with no URL of its own,
// so Google had nothing to rank "Reiki Ostfildern" or "Vedic Astrology
// Germany" against). Services with an external `link` (the
// "openInModal" interactive-tool cards) don't get one: they're not content
// Niramay owns, so a dedicated page for them would just be thin/duplicate.
// NLP Coaching, Hypnotherapy and Past Life Regression were merged into one
// "Subconscious Healing" service; their old URLs are 301'd in vercel.json,
// and this covers in-app links that never reach the server.
const MERGED_SERVICE_IDS: Record<string, string> = {
  nlp: "subconscious-healing",
  hypnotherapy: "subconscious-healing",
  "past-life": "subconscious-healing",
};

const ServicePage = () => {
  const { id } = useParams<{ id: string }>();
  const { lang, onBook, onBookAstrology } = useOutletContext<LayoutContext>();
  const service = SERVICES.find(s => s.id === id && !s.openInModal);

  const t = TRANSLATIONS[lang].services;
  const sp = TRANSLATIONS[lang].servicePage;
  const nav = TRANSLATIONS[lang].nav;
  const ta = TRANSLATIONS[lang].astrology;
  const content = service?.[lang];
  const isAstrology = service?.id === "astrology";
  const prefix = langPrefix(lang);
  const canonical = `${SITE_URL}${prefix}/services/${id}`;
  const enUrl = `${SITE_URL}/services/${id}`;
  const deUrl = `${SITE_URL}/de/services/${id}`;

  useSeo({
    title: content ? `${content.title} — Niramay Wellbeing, Ostfildern` : "Niramay Wellbeing",
    description: content?.description ?? "",
    canonical,
    lang,
    alternates: { en: enUrl, de: deUrl },
  });

  const serviceJsonLd = useMemo(() => {
    if (!service || !content) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Service",
      name: content.title,
      description: content.description,
      areaServed: "Ostfildern, Germany",
      provider: { "@id": BUSINESS_JSONLD_ID },
      url: canonical,
      inLanguage: lang === "EN" ? "en" : "de",
    };
  }, [service, content, canonical, lang]);
  useJsonLd("ld-json-service", serviceJsonLd);

  const breadcrumbJsonLd = useMemo(() => {
    if (!service || !content) return null;
    return {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: sp.home, item: `${SITE_URL}${prefix}/` },
        { "@type": "ListItem", position: 2, name: content.title, item: canonical },
      ],
    };
  }, [service, content, canonical, sp.home, prefix]);
  useJsonLd("ld-json-breadcrumb", breadcrumbJsonLd);

  if (id && MERGED_SERVICE_IDS[id]) return <Navigate to={`${prefix}/services/${MERGED_SERVICE_IDS[id]}`} replace />;
  if (!service || !content) return <Navigate to={prefix || "/"} replace />;

  const otherServices = SERVICES.filter(s => !s.openInModal && s.id !== service.id);
  const handleBook = () => {
    if (isAstrology) {
      // Astrology doesn't use the self-serve calendar: an appointment can't
      // be offered until birth details and advance payment are in, so it
      // gets its own intake flow.
      onBookAstrology();
    } else {
      onBook({
        title: content.title,
        subtitle: content.outcome,
        meta: [{ icon: service.icon, label: service.category }],
      });
    }
  };

  return (
    <main className="pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-10" aria-label="Breadcrumb">
          <Link to={prefix || "/"} className="hover:text-primary transition-colors">{sp.home}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`${prefix}/#services`} className="hover:text-primary transition-colors">{sp.breadcrumbServices}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{content.title}</span>
        </nav>

        <div className={`w-14 h-14 ${service.color} rounded-xl flex items-center justify-center mb-6`}>
          <service.icon className="w-7 h-7 text-primary" />
        </div>
        <p className="font-medium text-primary/70 mb-2">{service.category}</p>
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 leading-tight">{content.title}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-8">{content.description}</p>

        {"details" in content && content.details && (
          <div className="space-y-4 mb-10">
            {content.details.map((para, idx) => (
              <p key={idx} className="text-muted-foreground leading-relaxed">{para}</p>
            ))}
          </div>
        )}

        {"receive" in content && content.receive && (
          <div className="mb-10">
            <h2 className="text-2xl font-serif font-bold mb-6">{content.receiveTitle}</h2>
            <ul className="space-y-4">
              {content.receive.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-muted-foreground leading-relaxed">
                    <span className="font-bold text-foreground">{item.title}:</span> {item.description}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {"offerings" in content && content.offerings && (
          <div className="mb-10">
            <h2 className="text-2xl font-serif font-bold mb-6">{content.offeringsTitle}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {content.offerings.map((offer, idx) => (
                <div key={idx} className="bg-stone-50 p-6 rounded-2xl border border-stone-100 flex flex-col">
                  <p className="font-serif text-xl font-bold mb-4">{idx + 1}. {offer.title}</p>
                  <dl className="space-y-2 text-sm mb-4">
                    <div>
                      <dt className="inline font-bold">{sp.formatLabel}: </dt>
                      <dd className="inline text-muted-foreground">{offer.format}</dd>
                    </div>
                    <div>
                      <dt className="inline font-bold">{sp.priceLabel}: </dt>
                      <dd className="inline text-primary font-semibold">{offer.price}</dd>
                    </div>
                  </dl>
                  <p className="text-xs font-bold uppercase tracking-wider text-primary/50 mb-2">{sp.inclusionsLabel}</p>
                  <ul className="space-y-2">
                    {offer.inclusions.map((inc, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-stone-50 p-6 rounded-2xl border border-stone-100 mb-10">
          <p className="text-xs font-bold uppercase tracking-wider text-primary/50 mb-2">{t.outcomeLabel}</p>
          <p className="text-lg font-medium">{content.outcome}</p>
        </div>

        {isAstrology && (
          <div className="space-y-10 mb-10 pt-4 border-t border-stone-100">
            <p className="text-sm font-medium uppercase tracking-wider text-primary/60">{ta.traditionNote}</p>
            <p className="text-muted-foreground leading-relaxed">{ta.intro1}</p>
            <p className="text-muted-foreground leading-relaxed">{ta.intro2}</p>

            <div>
              <h2 className="text-2xl font-serif font-bold mb-6">{ta.exploreTitle}</h2>
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
              <h2 className="text-2xl font-serif font-bold mb-4">{ta.whoTitle}</h2>
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
              <h2 className="text-2xl font-serif font-bold mb-4">{ta.howTitle}</h2>
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

        <div className="flex flex-wrap items-center gap-4 mb-20">
          <Button size="lg" className="rounded-full px-8 gap-2" onClick={handleBook}>
            <Sparkles className="w-4 h-4" />
            {isAstrology ? ta.cta : nav.bookNow}
          </Button>
          <a
            href={`https://wa.me/4915175315761?text=${encodeURIComponent(`Hi, I'm interested in "${content.title}".`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
          >
            <MessageCircle className="w-4 h-4" /> {sp.whatsappCta}
          </a>
        </div>

        <div className="pt-10 border-t border-stone-100">
          <h2 className="text-2xl font-serif font-bold mb-6">{sp.otherServicesTitle}</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {otherServices.map(other => (
              <Link
                key={other.id}
                to={`${prefix}/services/${other.id}`}
                className="flex items-center justify-between gap-3 p-4 rounded-xl border border-stone-100 hover:border-primary/30 hover:bg-stone-50 transition-colors group"
              >
                <span className="font-medium">{other[lang].title}</span>
                <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};

// A single published post at /blog/:slug (+ /de/blog/:slug). Unlike
// SERVICES, posts are live Firestore data rather than a fixed, known-ahead
// list, so this fetches by slug+lang rather than looking up a static
// constant the way ServicePage does.
// Inline formatting for blog post text: **bold** and *italic*. Anything
// else is left as plain text, so a stray asterisk just shows as-is.
const renderInline = (text: string): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return <strong key={i} className="font-semibold text-stone-800">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    return part;
  });

// Turns the plain-text editor's content into blocks: "## " subheadings,
// consecutive "- " lines grouped into one bullet list, everything else a
// paragraph. The matching cheat sheet lives on the /write page.
const renderPostContent = (content: string) => {
  const blocks: React.ReactNode[] = [];
  let listItems: string[] = [];
  const flushList = () => {
    if (!listItems.length) return;
    blocks.push(
      <ul key={`ul-${blocks.length}`} className="list-disc pl-6 mb-5 space-y-2 text-lg text-stone-600 leading-relaxed">
        {listItems.map((item, j) => <li key={j}>{renderInline(item)}</li>)}
      </ul>
    );
    listItems = [];
  };
  content.split('\n').forEach((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ')) {
      listItems.push(trimmed.slice(2));
      return;
    }
    flushList();
    if (!trimmed) return;
    if (trimmed.startsWith('## ')) {
      blocks.push(<h2 key={i} className="text-2xl font-serif font-bold mt-10 mb-4 first:mt-0">{renderInline(trimmed.slice(3))}</h2>);
      return;
    }
    blocks.push(<p key={i} className="text-lg text-stone-600 leading-relaxed mb-5">{renderInline(trimmed)}</p>);
  });
  flushList();
  return blocks;
};

// Likes, sharing and comments sit below the article, so their code (and
// the reads they make) never delays the post itself from rendering.
const BlogEngagement = lazy(() => import("./components/BlogEngagement"));

// api/blog-share.ts serves /blog/:slug with the post already embedded in
// the HTML, so the first render needn't wait on a Firestore round trip.
// Only trusted for the slug+lang it was served for: after client-side
// navigation to another post the tag is stale and the post is fetched.
const POST_DATA_ID = "blog-post-data";
const readEmbeddedPost = (slug: string | undefined, lang: "EN" | "DE"): any => {
  try {
    const raw = document.getElementById(POST_DATA_ID)?.textContent;
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.slug !== slug || data.lang !== lang) return null;
    // Rebuild the Timestamp-like shape the rest of the page expects.
    for (const key of ["createdAt", "updatedAt"]) {
      const millis = data[key]?.millis;
      data[key] = typeof millis === "number" ? { toDate: () => new Date(millis) } : undefined;
    }
    return data;
  } catch {
    return null;
  }
};

// Article column width (max-w-3xl minus px-6); keep in sync with
// COVER_SIZES in api/blog-share.ts so the preload matches the <img>.
const COVER_SIZES = "(min-width: 768px) 720px, calc(100vw - 48px)";

const BlogPostPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useOutletContext<LayoutContext>();
  const [post, setPost] = useState<any>(() => readEmbeddedPost(slug, lang));
  const [otherPosts, setOtherPosts] = useState<any[]>([]);
  const [notFound, setNotFound] = useState(false);
  const bp = TRANSLATIONS[lang].blogPost;
  const prefix = langPrefix(lang);
  const canonical = `${SITE_URL}${prefix}/blog/${slug}`;

  useEffect(() => {
    // Embedded post shows immediately; the query below still runs to pick
    // up edits made since the edge cached the HTML.
    const embedded = readEmbeddedPost(slug, lang);
    setPost(embedded);
    setNotFound(false);
    if (!slug) return;
    let cancelled = false;
    const q = query(
      collection(db, "blogs"),
      where("slug", "==", slug),
      where("lang", "==", lang),
      where("published", "==", true),
      limit(1)
    );
    getDocs(q).then(snapshot => {
      if (cancelled) return;
      if (snapshot.empty) {
        // Offline, getDocs answers from the (empty) local cache instead of
        // failing — that's no reason to drop an embedded post the server
        // just confirmed is published.
        if (!embedded || !snapshot.metadata.fromCache) setNotFound(true);
      } else {
        const docSnap = snapshot.docs[0];
        setPost({ id: docSnap.id, ...docSnap.data() });
      }
    // Likewise a failed refresh keeps the embedded post.
    }).catch(() => !cancelled && !embedded && setNotFound(true));
    return () => { cancelled = true; };
  }, [slug, lang]);

  useEffect(() => {
    const q = query(
      collection(db, "blogs"),
      where("lang", "==", lang),
      where("published", "==", true),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    // A one-off read, not a live listener: holding a realtime channel open
    // for a "more posts" list isn't worth it on a mobile connection.
    let cancelled = false;
    getDocs(q).then(snapshot => {
      if (cancelled) return;
      setOtherPosts(snapshot.docs.map((d): any => ({ id: d.id, ...d.data() })).filter(p => p.slug !== slug).slice(0, 4));
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [lang, slug]);

  useSeo({
    title: post ? `${post.title} — Niramay Wellbeing Blog` : "Niramay Wellbeing Blog",
    description: post?.excerpt || "",
    canonical,
    lang,
  });

  const postJsonLd = useMemo(() => {
    if (!post) return null;
    const data: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: post.title,
      description: post.excerpt,
      inLanguage: lang === "EN" ? "en" : "de",
      mainEntityOfPage: canonical,
      url: canonical,
      author: { "@type": "Person", name: post.author || "Niramay" },
      publisher: { "@id": BUSINESS_JSONLD_ID },
    };
    if (post.image) data.image = post.image;
    if (post.createdAt?.toDate) data.datePublished = post.createdAt.toDate().toISOString();
    if (post.updatedAt?.toDate) data.dateModified = post.updatedAt.toDate().toISOString();
    if (post.audioUrl) data.associatedMedia = { "@type": "AudioObject", contentUrl: post.audioUrl, name: post.title };
    return data;
  }, [post, lang, canonical]);
  useJsonLd("ld-json-blogpost", postJsonLd);

  if (notFound) return <Navigate to={prefix || "/"} replace />;
  // Post data is fetched async (unlike the static SERVICES list), so there's
  // a brief gap before it's known to exist — render nothing rather than a
  // false "not found" flash while that's in flight.
  if (!post) return null;

  const dateStr = post.createdAt?.toDate
    ? post.createdAt.toDate().toLocaleDateString(lang === "DE" ? "de-DE" : "en-US")
    : "";

  return (
    <main className="pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-10" aria-label="Breadcrumb">
          <Link to={prefix || "/"} className="hover:text-primary transition-colors">{bp.home}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link to={`${prefix}/#blog`} className="hover:text-primary transition-colors">{bp.breadcrumbBlog}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium line-clamp-1">{post.title}</span>
        </nav>

        <div className="flex items-center gap-3 mb-4">
          {post.category && <Badge variant="outline">{post.category}</Badge>}
          {dateStr && <span className="text-sm text-stone-400">{dateStr}</span>}
        </div>
        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-4 leading-tight">{post.title}</h1>
        {post.excerpt && (
          <p className="text-xl text-muted-foreground leading-relaxed mb-8">{post.excerpt}</p>
        )}

        {post.image && (
          <img
            {...responsiveImage(post.image)}
            sizes={COVER_SIZES}
            alt={post.title}
            width={1600}
            height={900}
            fetchPriority="high"
            className="w-full h-auto aspect-video object-cover rounded-2xl mb-8"
            referrerPolicy="no-referrer"
          />
        )}

        {post.audioUrl && (
          <div className="bg-stone-50 border border-stone-100 rounded-2xl p-5 mb-8 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Volume2 className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium mb-2">{bp.listenLabel}</p>
              {/* eslint-disable-next-line jsx-a11y/media-has-caption -- spoken narration of the text above it, not standalone media */}
              <audio controls className="w-full h-10" src={post.audioUrl} />
            </div>
          </div>
        )}

        <div className="mb-16">
          {renderPostContent(post.content)}
        </div>

        <div className="flex items-center gap-4 pt-8 border-t border-stone-100 mb-8">
          <div className="w-12 h-12 rounded-full bg-stone-100 flex items-center justify-center font-bold text-stone-600">
            {post.author?.[0] || "N"}
          </div>
          <p className="font-bold">{post.author || "Niramay"}</p>
        </div>

        <Suspense fallback={null}>
          {/* keyed by post so navigating between posts resets vote/comment state */}
          <BlogEngagement key={post.id} blogId={post.id} title={post.title} url={canonical} lang={lang} />
        </Suspense>

        {otherPosts.length > 0 && (
          <div className="pt-10 border-t border-stone-100">
            <h2 className="text-2xl font-serif font-bold mb-6">{bp.otherPostsTitle}</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {otherPosts.map(other => (
                <Link
                  key={other.id}
                  to={`${prefix}/blog/${other.slug}`}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl border border-stone-100 hover:border-primary/30 hover:bg-stone-50 transition-colors group"
                >
                  <span className="font-medium line-clamp-1">{other.title}</span>
                  <ArrowRight className="w-4 h-4 text-primary shrink-0 group-hover:translate-x-1 transition-transform" />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
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

type HealerBio = { name: string; title: string; p1: string; p2: string };

const HealerProfile = ({
  lang,
  content,
  certifications,
  image,
  reverse,
}: {
  lang: "EN" | "DE";
  content: HealerBio;
  certifications: (typeof HEALER_CERTIFICATIONS)["richa"];
  image: string;
  reverse?: boolean;
}) => {
  return (
    <div className="grid md:grid-cols-2 gap-12 md:gap-16 items-center">
      <motion.div
        initial={{ opacity: 0, x: reverse ? 30 : -30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className={`relative ${reverse ? "md:order-2" : ""}`}
      >
        <div className="aspect-[4/5] rounded-[3rem] overflow-hidden shadow-2xl">
          <img
            src={image}
            alt={content.name}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute -top-8 -right-8 w-32 h-32 bg-primary/10 rounded-full -z-10" />
        <div className="absolute -bottom-8 -left-8 w-48 h-48 bg-primary/5 rounded-full -z-10" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, x: reverse ? -30 : 30 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, delay: 0.1 }}
      >
        <p className="text-sm font-bold uppercase tracking-wider text-primary/70 mb-2">{content.title}</p>
        <h3 className="text-3xl md:text-4xl font-serif font-bold mb-6">{content.name}</h3>
        <p className="text-lg text-muted-foreground mb-5 leading-relaxed">{content.p1}</p>
        <p className="text-lg text-muted-foreground mb-8 leading-relaxed">{content.p2}</p>

        <div className="flex flex-wrap gap-3">
          {certifications.map((cert, idx) => (
            <div key={idx} className="flex items-center gap-2.5 px-4 py-3 bg-stone-50 rounded-xl border border-stone-100">
              <cert.icon className="w-5 h-5 text-primary shrink-0" />
              <span className="text-sm font-medium whitespace-nowrap">{cert[lang].name}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
};

const AboutSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].about;
  return (
    <section id="about" className="py-24 overflow-hidden">
      <div className="container mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t.title}</h2>
          <p className="text-muted-foreground text-lg">{t.description}</p>
        </div>

        <div className="space-y-24">
          <HealerProfile
            lang={lang}
            content={t.richa}
            certifications={HEALER_CERTIFICATIONS.richa}
            image={HEALER_IMAGES.richa}
          />
          <HealerProfile
            lang={lang}
            content={t.riju}
            certifications={HEALER_CERTIFICATIONS.riju}
            image={HEALER_IMAGES.riju}
            reverse
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-24 relative rounded-[2.5rem] overflow-hidden shadow-2xl max-w-4xl mx-auto"
        >
          <img
            src={HEALER_IMAGES.together}
            alt={t.together}
            loading="lazy"
            decoding="async"
            className="w-full h-[320px] md:h-[420px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-8 flex items-end gap-3">
            <Heart className="w-5 h-5 text-white/90 shrink-0 mb-1 fill-white/20" />
            <p className="text-white text-base md:text-lg font-medium leading-snug">{t.together}</p>
          </div>
        </motion.div>
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

  const allReviews = useMemo(() => [...TESTIMONIALS, ...dynamicReviews], [dynamicReviews]);
  const filtered = filter === "all" ? allReviews : allReviews.filter(t => t.category === filter);

  const reviewsJsonLd = useMemo(() => {
    // Only the Firestore-backed reviews go through the site's own moderation
    // (an admin approves each one — see notify-review.ts), so only those are
    // genuine, verifiable reviews. TESTIMONIALS in constants.ts are seed/
    // placeholder copy with no such trail; marking those up as schema.org
    // Review/AggregateRating data would risk tripping Google's fake-review
    // structured-data policy, so they're deliberately excluded here even
    // though they still render on the page like any other testimonial.
    if (dynamicReviews.length === 0) return null;
    const ratings = dynamicReviews.map(r => r.rating || 5);
    const avgRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    return {
      "@context": "https://schema.org",
      "@type": "HealthAndBeautyBusiness",
      "@id": BUSINESS_JSONLD_ID,
      name: "Niramay Wellbeing",
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(avgRating.toFixed(1)),
        reviewCount: dynamicReviews.length,
        bestRating: 5,
      },
      review: dynamicReviews.map(r => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.name },
        reviewRating: { "@type": "Rating", ratingValue: r.rating || 5, bestRating: 5 },
        reviewBody: (r[lang] || r.EN || r.DE)?.content,
      })),
    };
  }, [dynamicReviews, lang]);
  useJsonLd("ld-json-reviews", reviewsJsonLd);

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
                  className={`rounded-full border-primary-foreground/20 hover:bg-primary-foreground hover:text-primary transition-all duration-300 ${filter === cat ? "" : "bg-transparent text-primary-foreground"}`}
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
          <Button variant="outline" className="rounded-full border-white/20 bg-transparent text-white hover:bg-white hover:text-primary gap-2">
            {t.googleReview} <Globe className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

// Shared by the homepage teaser and the full /faq page so both render
// questions identically. `hiddenUntilFound` keeps collapsed answers in the
// DOM (hidden="until-found"), so the full page's answers are crawlable and
// match its FAQPage JSON-LD, and the browser's find-in-page can open them.
const FAQList = ({ faqs, lang, hiddenUntilFound }: { faqs: typeof FAQS, lang: "EN" | "DE", hiddenUntilFound?: boolean }) => (
  <Accordion multiple hiddenUntilFound={hiddenUntilFound} className="w-full">
    {faqs.map((faq) => {
      const content = faq[lang];
      return (
        <AccordionItem key={faq.EN.question} value={faq.EN.question} className="border-b-stone-200 px-4">
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
);

// The homepage shows only the `featured` questions and links through to
// /faq. It deliberately emits no FAQPage JSON-LD: Google asks for a
// question set to be marked up on one page only, and that's /faq.
const FAQSection = ({ lang }: { lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].faq;
  const prefix = langPrefix(lang);

  return (
    <section id="faq" className="py-24">
      <div className="container mx-auto px-6 max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-serif font-bold mb-6">{t.title}</h2>
          <p className="text-muted-foreground text-lg">{t.description}</p>
        </div>

        <FAQList faqs={FAQS.filter(faq => faq.featured)} lang={lang} />

        <div className="flex justify-center mt-10">
          <Link to={`${prefix}/faq`}>
            <Button variant="ghost" className="font-bold text-primary group">
              {t.seeAll} <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

const FAQ_CATEGORIES = ["start", "sessions", "services", "about"] as const;

// The full FAQ at /faq (+ /de/faq): every question, grouped by category,
// on its own indexable URL with its own title/description and the site's
// only FAQPage JSON-LD.
const FAQPage = () => {
  const { lang, onBook } = useOutletContext<LayoutContext>();
  const t = TRANSLATIONS[lang].faq;
  const sp = TRANSLATIONS[lang].servicePage;
  const prefix = langPrefix(lang);
  const canonical = `${SITE_URL}${prefix}/faq`;

  useSeo({
    title: t.seoTitle,
    description: t.seoDescription,
    canonical,
    lang,
    alternates: { en: `${SITE_URL}/faq`, de: `${SITE_URL}/de/faq` },
  });

  const faqJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    url: canonical,
    inLanguage: lang === "EN" ? "en" : "de",
    mainEntity: FAQS.map(faq => ({
      "@type": "Question",
      name: faq[lang].question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq[lang].answer,
      },
    })),
  }), [lang, canonical]);
  useJsonLd("ld-json-faq", faqJsonLd);

  const breadcrumbJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: sp.home, item: `${SITE_URL}${prefix}/` },
      { "@type": "ListItem", position: 2, name: t.breadcrumb, item: canonical },
    ],
  }), [sp.home, t.breadcrumb, prefix, canonical]);
  useJsonLd("ld-json-breadcrumb", breadcrumbJsonLd);

  return (
    <main className="pt-32 pb-24">
      <div className="container mx-auto px-6 max-w-3xl">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-10" aria-label="Breadcrumb">
          <Link to={prefix || "/"} className="hover:text-primary transition-colors">{sp.home}</Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-foreground font-medium">{t.breadcrumb}</span>
        </nav>

        <h1 className="text-4xl md:text-5xl font-serif font-bold mb-6 leading-tight">{t.pageTitle}</h1>
        <p className="text-lg text-muted-foreground leading-relaxed mb-14">{t.pageDescription}</p>

        {FAQ_CATEGORIES.map(category => (
          <section key={category} className="mb-14">
            <h2 className="text-2xl font-serif font-bold mb-4">{t.categories[category]}</h2>
            <FAQList faqs={FAQS.filter(faq => faq.category === category)} lang={lang} hiddenUntilFound />
          </section>
        ))}

        <div className="bg-stone-50 p-8 rounded-2xl border border-stone-100 text-center">
          <h2 className="text-2xl font-serif font-bold mb-3">{t.ctaTitle}</h2>
          <p className="text-muted-foreground mb-6">{t.ctaBody}</p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="rounded-full px-8 gap-2" onClick={() => onBook({ title: t.ctaBook })}>
              <Sparkles className="w-4 h-4" />
              {t.ctaBook}
            </Button>
            <a
              href="https://wa.me/4915175315761"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-2"
            >
              <MessageCircle className="w-4 h-4" /> {t.ctaWhatsapp}
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

const Footer = ({ lang, onOpenLegal }: { lang: "EN" | "DE", onOpenLegal: (type: "impressum" | "privacy") => void }) => {
  const t = TRANSLATIONS[lang].footer;
  const nav = TRANSLATIONS[lang].nav;
  const prefix = langPrefix(lang);
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
              <li><Link to={`${prefix}/#services`} className="text-muted-foreground hover:text-primary transition-colors">{nav.services}</Link></li>
              <li><Link to={`${prefix}/#about`} className="text-muted-foreground hover:text-primary transition-colors">{nav.about}</Link></li>
              <li><Link to={`${prefix}/#events`} className="text-muted-foreground hover:text-primary transition-colors">{nav.events}</Link></li>
              <li><Link to={`${prefix}/#book`} className="text-muted-foreground hover:text-primary transition-colors">{nav.book}</Link></li>
              <li><Link to={`${prefix}/#testimonials`} className="text-muted-foreground hover:text-primary transition-colors">{nav.reviews}</Link></li>
              <li><Link to={`${prefix}/#blog`} className="text-muted-foreground hover:text-primary transition-colors">{nav.blog}</Link></li>
              <li><Link to={`${prefix}/faq`} className="text-muted-foreground hover:text-primary transition-colors">{nav.faq}</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold mb-6">{t.contact}</h4>
            <ul className="space-y-4 mb-6">
              <li className="flex items-start gap-3 text-muted-foreground">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  {BUSINESS_STREET_ADDRESS}, {BUSINESS_POSTAL_CODE} {BUSINESS_CITY}, Germany
                </a>
              </li>
              <li className="flex items-start gap-3 text-muted-foreground">
                <MessageCircle className="w-5 h-5 text-primary shrink-0" />
                <a href="https://wa.me/4915175315761" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors">
                  WhatsApp: +49 151 75315761
                </a>
              </li>
            </ul>
            <a
              href={GOOGLE_MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block rounded-xl overflow-hidden border border-stone-200 hover:opacity-90 transition-opacity"
              aria-label={t.viewOnGoogleMaps}
            >
              <iframe
                src={GOOGLE_MAPS_EMBED_URL}
                title={t.viewOnGoogleMaps}
                width="100%"
                height="160"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                className="pointer-events-none w-full h-40"
              />
            </a>
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

// Shown once, on first visit, until the visitor picks Accept or Decline —
// Google Analytics only loads (see src/lib/analytics.ts) after Accept, since
// GA sets cookies and this is a German business site subject to GDPR consent
// requirements. The choice is remembered in localStorage, so returning
// visitors who already decided don't see it again.
const CookieConsent = ({ lang, onOpenPrivacy }: { lang: "EN" | "DE", onOpenPrivacy: () => void }) => {
  const [visible, setVisible] = useState(false);
  const t = TRANSLATIONS[lang].cookieConsent;

  useEffect(() => {
    setVisible(getStoredConsent() === null);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] p-4 sm:p-6">
      <div className="max-w-3xl mx-auto bg-background border border-stone-200 shadow-xl rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <p className="text-sm text-muted-foreground flex-1">
          {t.message}{" "}
          <button type="button" onClick={onOpenPrivacy} className="underline underline-offset-2 hover:text-primary">
            {t.privacyLink}
          </button>
        </p>
        <div className="flex gap-3 shrink-0">
          <Button variant="outline" size="sm" className="rounded-full" onClick={() => { denyAnalyticsConsent(); setVisible(false); }}>
            {t.reject}
          </Button>
          <Button size="sm" className="rounded-full" onClick={() => { grantAnalyticsConsent(); setVisible(false); }}>
            {t.accept}
          </Button>
        </div>
      </div>
    </div>
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
                src={t.cover}
                alt={t.title}
                width={900}
                height={1350}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
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
              className="absolute -right-4 bottom-20 z-20 bg-white p-6 rounded-2xl shadow-xl border border-stone-100 hidden md:block"
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

// Shared shell (nav, footer, the booking/legal/astrology-intake modals, and
// the site-wide LocalBusiness JSON-LD) rendered on every route. Per-route
// content — the homepage sections, or a single service's page — comes in
// through <Outlet>, and gets the state it needs (lang, the booking
// callbacks) via useOutletContext rather than every page redeclaring it.
const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  // The language is the URL, not separate app state: "/de..." is German,
  // everything else is English. That's what makes each language's content
  // a real, distinct, indexable page instead of a client-side toggle Google
  // never sees past the first version it crawls.
  const lang: "EN" | "DE" = (location.pathname === "/de" || location.pathname.startsWith("/de/")) ? "DE" : "EN";
  const toggleLang = () => {
    navigate(lang === "EN" ? `/de${location.pathname}` : location.pathname.replace(/^\/de/, "") || "/");
  };
  const [legalModal, setLegalModal] = useState<"impressum" | "privacy" | null>(null);
  const [bookingContext, setBookingContext] = useState<BookingContext | null>(null);
  const openBooking = (ctx: BookingContext = {}) => setBookingContext(ctx);
  const [astrologyIntakeOpen, setAstrologyIntakeOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = lang.toLowerCase();
  }, [lang]);

  // Loads GA only if the visitor already granted consent on a prior visit;
  // otherwise CookieConsent below prompts them and loads it on Accept.
  useEffect(() => {
    initAnalyticsFromStoredConsent();
  }, []);

  // GA's automatic page_view only fires once per document load, which for
  // this client-side-routed SPA means only the very first page a visitor
  // lands on would ever be recorded — so each route change is sent explicitly.
  useEffect(() => {
    trackPageview(location.pathname);
  }, [location.pathname]);

  const businessJsonLd = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "HealthAndBeautyBusiness",
    "@id": BUSINESS_JSONLD_ID,
    name: "Niramay Wellbeing",
    image: `${SITE_URL}/logo.svg`,
    url: SITE_URL,
    telephone: "+49 151 75315761",
    email: "richa@niramay.me",
    description: TRANSLATIONS[lang].footer.description,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_STREET_ADDRESS,
      postalCode: BUSINESS_POSTAL_CODE,
      addressLocality: BUSINESS_CITY,
      addressRegion: "Baden-Württemberg",
      addressCountry: "DE",
    },
    hasMap: GOOGLE_MAPS_URL,
    founder: [
      { "@type": "Person", name: "Richa Kansal", jobTitle: TRANSLATIONS[lang].about.richa.title },
      { "@type": "Person", name: "Riju Kansal", jobTitle: TRANSLATIONS[lang].about.riju.title },
    ],
    sameAs: [
      "https://www.instagram.com/niramay.me/",
      "https://www.facebook.com/niramayme/",
      "https://www.youtube.com/@richaniramayme",
      GOOGLE_MAPS_URL,
    ],
    // Only the sessions Niramay delivers directly — the "openInModal"
    // entries just link out to standalone third-party tools, not a service
    // Niramay itself provides, so they don't belong in this list.
    makesOffer: SERVICES.filter(s => !s.openInModal).map(s => ({
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: s[lang].title,
        description: s[lang].description,
        areaServed: "Ostfildern, Germany",
      },
    })),
    inLanguage: lang === "EN" ? "en" : "de",
  }), [lang]);
  useJsonLd("ld-json-business", businessJsonLd);

  return (
    <div className="min-h-screen selection:bg-primary/20">
      <ScrollManager />
      <Navbar lang={lang} onToggleLang={toggleLang} onBook={openBooking} />
      <Outlet context={{ lang, onBook: openBooking, onBookAstrology: () => setAstrologyIntakeOpen(true), onOpenLegal: setLegalModal } satisfies LayoutContext} />
      <Footer lang={lang} onOpenLegal={setLegalModal} />

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

      <CookieConsent lang={lang} onOpenPrivacy={() => setLegalModal("privacy")} />
    </div>
  );
};

const HomePage = () => {
  const { lang, onBook } = useOutletContext<LayoutContext>();
  const [previewTool, setPreviewTool] = useState<{ title: string; link: string } | null>(null);

  useSeo({
    title: lang === "EN"
      ? "Niramay Wellbeing — Yoga, Reiki & Holistic Therapy in Ostfildern"
      : "Niramay Wellbeing — Yoga, Reiki & Ganzheitliche Therapie in Ostfildern",
    description: lang === "EN"
      ? "Niramay Wellbeing: yoga, Reiki, NLP coaching, hypnotherapy and Vedic astrology guidance with Richa Kansal in Ostfildern, Germany. Book a free 15-minute call."
      : "Niramay Wellbeing: Yoga, Reiki, NLP-Coaching, Hypnotherapie und vedische Astrologie mit Richa Kansal in Ostfildern. Vereinbaren Sie ein kostenloses 15-minütiges Gespräch.",
    canonical: lang === "EN" ? `${SITE_URL}/` : `${SITE_URL}/de`,
    lang,
    alternates: { en: `${SITE_URL}/`, de: `${SITE_URL}/de` },
  });

  // The "openInModal" service cards link to standalone third-party
  // tools rather than a page of Niramay's own, so they still open as an
  // iframe preview here instead of routing to /services/:id.
  const handleServiceToolPreview = (service: any) => {
    setPreviewTool({ title: service[lang].title, link: service.link });
  };

  return (
    <main>
      <Hero lang={lang} onBook={onBook} />
      <ServicesSection lang={lang} onLearnMore={handleServiceToolPreview} />
      <OngoingSessionsSection lang={lang} />
      <CoursesSection lang={lang} />
      <AboutSection lang={lang} />
      <EventsSection lang={lang} />
      <BookSection lang={lang} />
      <BlogSection lang={lang} />
      <TestimonialsSection lang={lang} />
      <FAQSection lang={lang} />

      <ToolPreviewModal
        tool={previewTool}
        open={!!previewTool}
        onOpenChange={(open) => !open && setPreviewTool(null)}
      />
    </main>
  );
};

// The /write admin dashboard (Firebase Auth, the Vercel Blob upload
// client, the editor UI) is split into its own chunk and only fetched
// when a signed-in editor actually navigates there — visitors browsing
// the marketing site never pay for its bytes.
const WritePage = lazy(() => import("./pages/WritePage"));

// Route patterns reported to Vercel Speed Insights so the dashboard groups
// visits by page type (e.g. /blog/:slug) instead of "Unknown". Keep in sync
// with the <Routes> below; redirecting catch-alls are left out on purpose.
const SPEED_INSIGHTS_ROUTES = [
  "/",
  "/services/:id",
  "/blog/:slug",
  "/faq",
  "/de",
  "/de/services/:id",
  "/de/blog/:slug",
  "/de/faq",
  "/write",
].map((path) => ({ path }));

const RouteAwareSpeedInsights = () => {
  const location = useLocation();
  const route = matchRoutes(SPEED_INSIGHTS_ROUTES, location)?.[0]?.route.path ?? null;
  return <SpeedInsights route={route} />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="services/:id" element={<ServicePage />} />
            <Route path="blog/:slug" element={<BlogPostPage />} />
            <Route path="faq" element={<FAQPage />} />
            <Route path="de" element={<HomePage />} />
            <Route path="de/services/:id" element={<ServicePage />} />
            <Route path="de/blog/:slug" element={<BlogPostPage />} />
            <Route path="de/faq" element={<FAQPage />} />
            {/* An unknown path under /de falls back to the German home page
                rather than jumping to the English one. */}
            <Route path="de/*" element={<Navigate to="/de" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
          {/* Outside AppLayout: no marketing nav/footer/WhatsApp button on the
              admin tool. */}
          <Route
            path="write"
            element={
              <Suspense fallback={null}>
                <WritePage />
              </Suspense>
            }
          />
        </Routes>
        <RouteAwareSpeedInsights />
      </BrowserRouter>
    </AuthProvider>
  );
}
