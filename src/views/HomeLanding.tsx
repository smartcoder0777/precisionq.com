"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { MessageCircle, Send, Sparkles } from "lucide-react";
import { qpMediaUrl } from "@/lib/public-media";
import { useToast } from "@/hooks/use-toast";

type LandingWord = {
  id: string;
  text: string;
  color: string;
};

type HomeLandingProps = {
  bgStatus: "image" | "video";
  bgImage: string;
  bgVideo: string;
  footerText: string;
  words: LandingWord[];
};

type FloatingWord = LandingWord & {
  left: number;
  top: number;
  dx: number;
  dy: number;
  duration: number;
  delay: number;
  rotateY: number;
  scale: number;
};

function createCaptcha(): { a: number; b: number } {
  return {
    a: Math.floor(Math.random() * 9) + 1,
    b: Math.floor(Math.random() * 9) + 1,
  };
}

function buildFloatingWords(words: LandingWord[], count: number): FloatingWord[] {
  const source = words.length > 0 ? words : [{ id: "fallback", text: "Roswell Care", color: "#60a5fa" }];
  const clones: FloatingWord[] = [];
  for (let i = 0; i < count; i += 1) {
    const base = source[i % source.length];
    clones.push({
      ...base,
      id: `${base.id}-${i}`,
      left: Math.random() * 100,
      top: Math.random() * 100,
      dx: (Math.random() * 90 - 45),
      dy: (Math.random() * 90 - 45),
      duration: 8 + Math.random() * 10,
      delay: Math.random() * -20,
      rotateY: Math.random() * 160 - 80,
      scale: 0.75 + Math.random() * 0.9,
    });
  }
  return clones;
}

const HomeLanding = ({ bgStatus, bgImage, bgVideo, footerText, words }: HomeLandingProps) => {
  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [captcha, setCaptcha] = useState<{ a: number; b: number }>({ a: 1, b: 1 });
  const [captchaInput, setCaptchaInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [floatingWords, setFloatingWords] = useState<FloatingWord[]>([]);

  useEffect(() => {
    const syncViewport = () => {
      const width = window.innerWidth;
      setIsMobile(width < 640);
      setIsTablet(width >= 640 && width < 1024);
    };
    syncViewport();
    setCaptcha(createCaptcha());
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  useEffect(() => {
    const wordCount = isMobile ? 18 : isTablet ? 30 : 42;
    setFloatingWords(buildFloatingWords(words, wordCount));
  }, [isMobile, isTablet, words]);

  useEffect(() => {
    setCaptcha(createCaptcha());
    setCaptchaInput("");
  }, [formOpen]);

  const expectedCaptcha = captcha.a + captcha.b;

  const submitContact = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({ title: "Error", description: "Please fill all fields.", variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Error", description: "Please enter a valid email.", variant: "destructive" });
      return;
    }
    if (Number(captchaInput) !== expectedCaptcha) {
      toast({ title: "Error", description: "Captcha answer is incorrect.", variant: "destructive" });
      setCaptcha(createCaptcha());
      setCaptchaInput("");
      return;
    }
    try {
      setSubmitting(true);
      const res = await fetch("/api/public/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message }),
      });
      const data = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !data.ok) {
        toast({ title: "Error", description: data.message ?? "Submit failed.", variant: "destructive" });
        return;
      }
      setName("");
      setEmail("");
      setMessage("");
      setCaptcha(createCaptcha());
      setCaptchaInput("");
      toast({ title: "Success", description: "Your message has been sent." });
    } catch {
      toast({ title: "Error", description: "Request failed.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const mediaImage = qpMediaUrl(bgImage);
  const mediaVideo = qpMediaUrl(bgVideo);
  const showVideo = bgStatus === "video" && !!mediaVideo;
  const showImage = !showVideo && !!mediaImage;
  const footerDisplayText = (footerText || "Roswell Medical Center").replace(/\$year\$/g, String(new Date().getFullYear()));

  return (
    <main className="relative min-h-[100svh] w-full overflow-hidden bg-slate-950 text-white">
      {showVideo && (
        <video className="absolute inset-0 h-full w-full object-cover" src={mediaVideo} autoPlay muted loop playsInline />
      )}
      {showImage && (
        <img className="absolute inset-0 h-full w-full object-cover" src={mediaImage} alt="Background" />
      )}
      <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-slate-900/45 to-black/65" />

      <div className="pointer-events-none absolute inset-0 perspective-[1200px]">
        {floatingWords.map((word) => {
          // CSS custom vars drive each word's random path.
          const style = {
            left: `${word.left}%`,
            top: `${word.top}%`,
            color: word.color || "#93c5fd",
            "--dx": `${word.dx}vw`,
            "--dy": `${word.dy}vh`,
            "--rotY": `${word.rotateY}deg`,
            "--scale": `${word.scale}`,
            animationDuration: `${word.duration}s`,
            animationDelay: `${word.delay}s`,
          } as CSSProperties & Record<string, string>;
          return (
            <span
              key={word.id}
              className="home-floating-word"
              style={style}
            >
              {word.text}
            </span>
          );
        })}
      </div>

      <div className="absolute left-3 top-3 z-20 flex items-start gap-2 sm:left-4 sm:top-4 sm:gap-3">
        <button
          type="button"
          onClick={() => setFormOpen((s) => !s)}
          className="rounded-full border border-white/25 bg-black/45 p-3 text-white backdrop-blur transition hover:bg-white/20"
          aria-label={formOpen ? "Hide contact form" : "Show contact form"}
        >
          <MessageCircle className="h-5 w-5" />
        </button>

        {formOpen && (
          <section className="w-[calc(100vw-4rem)] max-w-[420px] rounded-2xl border border-white/25 bg-black/55 p-3 shadow-2xl backdrop-blur-md sm:w-[min(92vw,420px)] sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-cyan-300" />
              <h2 className="text-lg font-semibold">Contact Us</h2>
            </div>
            <div className="space-y-3">
              <input
                className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:outline-none"
                placeholder="User name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:outline-none"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <textarea
                rows={4}
                className="w-full rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:outline-none"
                placeholder="Message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  className="rounded-md border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/70 focus:outline-none"
                  placeholder={`Captcha: ${captcha.a} + ${captcha.b} = ?`}
                  value={captchaInput}
                  onChange={(e) => setCaptchaInput(e.target.value)}
                />
                <button
                  type="button"
                  className="rounded-md border border-white/30 px-3 text-xs hover:bg-white/20"
                  onClick={() => {
                    setCaptcha(createCaptcha());
                    setCaptchaInput("");
                  }}
                >
                  Refresh
                </button>
              </div>
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitContact()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-950 transition hover:bg-cyan-400 disabled:opacity-70"
              >
                <Send className="h-4 w-4" />
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </section>
        )}
      </div>

      <div className="absolute inset-0 z-10 flex items-center justify-center px-6">
        <img
          src="/images/logo.png"
          alt="Roswell logo"
          className="h-24 w-auto drop-shadow-[0_0_30px_rgba(255,255,255,0.35)] sm:h-36 md:h-48 lg:h-56"
        />
      </div>

      <p className="absolute inset-x-0 bottom-3 z-20 px-6 text-center text-[11px] font-medium text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,0.75)] sm:bottom-4 sm:px-12 sm:text-xs md:bottom-6 md:px-24 md:text-sm lg:px-40 xl:px-56">
        {footerDisplayText}
      </p>
    </main>
  );
};

export default HomeLanding;
