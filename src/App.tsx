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
  Euro,
  Star,
  Plus,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { db } from "./lib/firebase";
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  Timestamp, 
  limit,
  where,
  getDocs
} from "firebase/firestore";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SERVICES, TESTIMONIALS, FAQS, CERTIFICATIONS, TRANSLATIONS, ONGOING_SESSIONS, GOOGLE_CALENDAR_URL, GOOGLE_REVIEW_URL } from "./constants";

const BookingModal = ({ children, lang }: { children: React.ReactNode, lang: "EN" | "DE" }) => {
  const t = TRANSLATIONS[lang].booking;
  return (
    <Dialog>
      <DialogTrigger render={children} />
      <DialogContent className="sm:max-w-[900px] h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-3xl font-serif">{t.title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full h-full min-h-0 mt-4 relative">
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
      await addDoc(collection(db, "reviews"), {
        ...formData,
        createdAt: serverTimestamp(),
        lang,
        approved: true, // Auto-approve for demo simplicity as requested
      });
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

const Navbar = ({ lang, setLang }: { lang: "EN" | "DE", setLang: (l: "EN" | "DE") => void }) => {
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
          <a href="#about" className="text-sm font-medium hover:text-primary transition-colors">{t.about}</a>
          <a href="#blog" className="text-sm font-medium hover:text-primary transition-colors">{t.blog}</a>
          <a href="#testimonials" className="text-sm font-medium hover:text-primary transition-colors">{t.reviews}</a>
          <a href="#faq" className="text-sm font-medium hover:text-primary transition-colors">{t.faq}</a>
          
          <div className="flex items-center gap-4 ml-4">
            <Button variant="ghost" size="sm" onClick={() => setLang(lang === "EN" ? "DE" : "EN")} className="gap-2">
              <Globe className="w-4 h-4" />
              {lang}
            </Button>
            <BookingModal lang={lang}>
              <Button size="sm" className="rounded-full px-6">{t.bookNow}</Button>
            </BookingModal>
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
            <a href="#about" onClick={() => setIsMobileMenuOpen(false)}>{t.about}</a>
            <a href="#blog" onClick={() => setIsMobileMenuOpen(false)}>{t.blog}</a>
            <a href="#testimonials" onClick={() => setIsMobileMenuOpen(false)}>{t.reviews}</a>
            <a href="#faq" onClick={() => setIsMobileMenuOpen(false)}>{t.faq}</a>
            <Separator />
            <div className="flex justify-between items-center">
              <Button variant="ghost" onClick={() => setLang(lang === "EN" ? "DE" : "EN")} className="gap-2">
                <Globe className="w-4 h-4" />
                {t.switchLang}
              </Button>
              <BookingModal lang={lang}>
                <Button className="rounded-full">{t.bookNow}</Button>
              </BookingModal>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = ({ lang }: { lang: "EN" | "DE" }) => {
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
            <BookingModal lang={lang}>
              <Button size="lg" className="rounded-full px-8 gap-2 h-14 text-lg">
                {t.ctaPrimary} <ArrowRight className="w-5 h-5" />
              </Button>
            </BookingModal>
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

        <Tabs defaultValue="all" className="w-full">
          <div className="flex justify-center mb-12">
            <TabsList className="bg-white border rounded-full p-1 h-14">
              <TabsTrigger value="all" className="rounded-full px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t.tabs.all}</TabsTrigger>
              <TabsTrigger value="Physical Wellness" className="rounded-full px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t.tabs.physical}</TabsTrigger>
              <TabsTrigger value="Mental Clarity" className="rounded-full px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t.tabs.mental}</TabsTrigger>
              <TabsTrigger value="Spiritual Healing" className="rounded-full px-8 h-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">{t.tabs.spiritual}</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all" className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES.map((service, idx) => (
              <ServiceCard key={service.id} service={service} index={idx} lang={lang} onLearnMore={onLearnMore} />
            ))}
          </TabsContent>
          {["Physical Wellness", "Mental Clarity", "Spiritual Healing"].map(cat => (
            <TabsContent key={cat} value={cat} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.filter(s => s.category === cat).map((service, idx) => (
                <ServiceCard key={service.id} service={service} index={idx} lang={lang} onLearnMore={onLearnMore} />
              ))}
            </TabsContent>
          ))}
        </Tabs>
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
                <Card className="h-full border border-stone-100 shadow-sm hover:shadow-md transition-all bg-stone-50/30">
                  <CardHeader>
                    <CardTitle className="text-xl font-serif">{content.title}</CardTitle>
                    <div className="flex items-center gap-2 text-primary font-medium text-sm mt-2">
                      <Clock className="w-4 h-4" />
                      {content.time}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                      {content.description}
                    </p>
                    <div className="flex items-center justify-between mt-auto">
                      <div className="flex items-center gap-1 font-bold text-stone-900">
                        <Euro className="w-4 h-4" />
                        {content.price.replace("€", "").replace(" €", "")}
                      </div>
                      <BookingModal lang={lang}>
                        <Button size="sm" variant="outline" className="rounded-full">
                          {t.bookBtn}
                        </Button>
                      </BookingModal>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>
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
            <div className="aspect-square rounded-[3rem] overflow-hidden shadow-2xl">
              <img 
                src="https://picsum.photos/seed/healer/800/800" 
                alt="Richa - Certified Therapist" 
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
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

            <Dialog>
              <DialogTrigger render={<Button size="lg" className="rounded-full px-8 h-14">{t.cta}</Button>} />
              <DialogContent className="sm:max-w-[700px]">
                <DialogHeader>
                  <DialogTitle>{t.cta}</DialogTitle>
                </DialogHeader>
                <div className="aspect-video bg-stone-100 rounded-xl flex items-center justify-center">
                  <p className="text-muted-foreground italic">{t.videoPlaceholder}</p>
                </div>
              </DialogContent>
            </Dialog>
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
    const q = query(collection(db, "reviews"), orderBy("createdAt", "desc"));
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

const Footer = ({ lang }: { lang: "EN" | "DE" }) => {
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
              <li><a href="#testimonials" className="text-muted-foreground hover:text-primary transition-colors">{nav.reviews}</a></li>
              <li><a href="#blog" className="text-muted-foreground hover:text-primary transition-colors">{nav.blog}</a></li>
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
          <p>© 2024 Niramay Wellness. {t.rights}</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-primary transition-colors">{t.impressum}</a>
            <a href="#" className="hover:text-primary transition-colors">{t.privacy}</a>
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

export default function App() {
  const [lang, setLang] = useState<"EN" | "DE">("EN");
  const [selectedBlog, setSelectedBlog] = useState<any>(null);

  const handleServiceLearnMore = async (service: any) => {
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

    // Find a blog post that matches this service's category
    const q = query(
      collection(db, "blogs"), 
      where("category", "==", service.category),
      where("lang", "==", lang),
      limit(1)
    );
    
    try {
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSelectedBlog({ id: snap.docs[0].id, ...snap.docs[0].data() });
      } else {
        // Fallback to scrolling to blog section if no specific post found
        document.getElementById('blog')?.scrollIntoView({ behavior: 'smooth' });
      }
    } catch (error) {
      console.error("Error fetching blog for service:", error);
      document.getElementById('blog')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen selection:bg-primary/20">
      <Navbar lang={lang} setLang={setLang} />
      <main>
        <Hero lang={lang} />
        <ServicesSection lang={lang} onLearnMore={handleServiceLearnMore} />
        <OngoingSessionsSection lang={lang} />
        <AboutSection lang={lang} />
        <BlogSection lang={lang} />
        <TestimonialsSection lang={lang} />
        <FAQSection lang={lang} />
      </main>
      <Footer lang={lang} />
      
      <BlogDetailModal 
        blog={selectedBlog} 
        open={!!selectedBlog} 
        onOpenChange={(open) => !open && setSelectedBlog(null)} 
        lang={lang}
      />
    </div>
  );
}
