import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Announcement = { id: string; title: string; body: string; date: string };

export type LandingContent = {
  headline: string; subtitle: string; bullets: string[]; photo_url: string; cta_heading: string;
  school_name: string; logo_url: string; brand_color: string;
  welcome_title: string; welcome_text: string;
  announcements: Announcement[];
  show_prices: boolean; prices_heading: string;
};

export const defaultLanding: LandingContent = {
  headline: "1-on-1 private online English lessons",
  subtitle: "Speak English with confidence. Personal lessons, your own curriculum, and clear progress tracking — all in one student portal.",
  bullets: ["Lessons for kids, teens and adults", "Learn at your own pace", "See every lesson and score"],
  photo_url: "",
  cta_heading: "Ready to speak English with confidence?",
  school_name: "ARP Speak English With Me",
  logo_url: "",
  brand_color: "",
  welcome_title: "",
  welcome_text: "",
  announcements: [],
  show_prices: true,
  prices_heading: "Lesson prices & packages",
};

let cache: LandingContent | null = null;
let pending: Promise<LandingContent> | null = null;
const listeners = new Set<(c: LandingContent) => void>();

function load() {
  if (!pending) {
    pending = Promise.resolve(
      supabase.from("landing_content").select("content").eq("id", 1).maybeSingle()
    ).then(({ data }) => {
      cache = { ...defaultLanding, ...((data?.content as Partial<LandingContent>) ?? {}) };
      listeners.forEach((l) => l(cache!));
      return cache;
    });
  }
  return pending;
}

/** Call after saving so every open page picks up the new content. */
export function publishLanding(c: LandingContent) {
  cache = c;
  listeners.forEach((l) => l(c));
}

export function useSiteContent() {
  const [c, setC] = useState<LandingContent>(cache ?? defaultLanding);
  useEffect(() => {
    listeners.add(setC);
    load();
    return () => { listeners.delete(setC); };
  }, []);
  return c;
}

/** Editable local copy for the admin editor. */
export function useLandingContent() {
  const shared = useSiteContent();
  const [c, setC] = useState<LandingContent>(shared);
  const [touched, setTouched] = useState(false);
  useEffect(() => { if (!touched) setC(shared); }, [shared, touched]);
  return [c, (v: LandingContent) => { setTouched(true); setC(v); }] as const;
}

/** "#0E3181" -> "222 80% 28%" */
export function hexToHsl(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}
