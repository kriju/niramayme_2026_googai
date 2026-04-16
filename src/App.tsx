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
  Euro
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SERVICES, TESTIMONIALS, FAQS, CERTIFICATIONS, TRANSLATIONS, ONGOING_SESSIONS, GOOGLE_CALENDAR_URL } from "./constants";

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

const ServiceCard = ({ service, index, lang }: { service: any, index: number, lang: "EN" | "DE", key?: any }) => {
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
          <Button variant="link" className="mt-6 p-0 h-auto font-bold text-primary group-hover:translate-x-1 transition-transform">
            {t.learnMore} <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
};

const ServicesSection = ({ lang }: { lang: "EN" | "DE" }) => {
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
              <ServiceCard key={service.id} service={service} index={idx} lang={lang} />
            ))}
          </TabsContent>
          {["Physical Wellness", "Mental Clarity", "Spiritual Healing"].map(cat => (
            <TabsContent key={cat} value={cat} className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {SERVICES.filter(s => s.category === cat).map((service, idx) => (
                <ServiceCard key={service.id} service={service} index={idx} lang={lang} />
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
  const t = TRANSLATIONS[lang].testimonials;
  
  const filtered = filter === "all" ? TESTIMONIALS : TESTIMONIALS.filter(t => t.category === filter);

  return (
    <section id="testimonials" className="py-24 bg-primary text-primary-foreground">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-serif font-bold mb-6">{t.title}</h2>
            <p className="text-primary-foreground/70 text-lg">
              {t.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", "Physical Wellness", "Mental Clarity", "Spiritual Healing"].map(cat => (
              <Button 
                key={cat} 
                variant={filter === cat ? "secondary" : "outline"} 
                size="sm" 
                onClick={() => setFilter(cat)}
                className="rounded-full border-primary-foreground/20 hover:bg-primary-foreground hover:text-primary"
              >
                {cat === "all" ? t.filters.all : t.filters[cat.split(" ")[0].toLowerCase() as keyof typeof t.filters]}
              </Button>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filtered.map((test, idx) => {
              const content = test[lang];
              return (
                <motion.div
                  key={test.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.4 }}
                >
                  <Card className="bg-white/10 border-white/10 backdrop-blur-sm text-white h-full">
                    <CardHeader>
                      <div className="flex gap-1 mb-4">
                        {[1,2,3,4,5].map(i => <Sparkles key={i} className="w-4 h-4 text-yellow-400 fill-yellow-400" />)}
                      </div>
                      <p className="text-xl italic font-serif leading-relaxed mb-6">"{content.content}"</p>
                      <Separator className="bg-white/10 mb-6" />
                      <div>
                        <p className="font-bold text-lg">{test.name}</p>
                        <p className="text-sm text-white/60">{content.role}</p>
                      </div>
                    </CardHeader>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
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

  return (
    <div className="min-h-screen selection:bg-primary/20">
      <Navbar lang={lang} setLang={setLang} />
      <main>
        <Hero lang={lang} />
        <ServicesSection lang={lang} />
        <OngoingSessionsSection lang={lang} />
        <AboutSection lang={lang} />
        <TestimonialsSection lang={lang} />
        <FAQSection lang={lang} />
      </main>
      <Footer lang={lang} />
    </div>
  );
}
