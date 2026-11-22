import { useEffect } from "react";
import defaultLogo from "@/assets/logo.png";
import { hexToHsl, useSiteContent } from "@/lib/siteContent";

export function useBrand() {
  const c = useSiteContent();
  return { name: c.school_name || "ARP Speak English With Me", logo: c.logo_url || defaultLogo };
}

/** Applies the admin-chosen main colour and school name across the app. */
export function BrandingApplier() {
  const c = useSiteContent();
  useEffect(() => {
    const root = document.documentElement;
    const hsl = c.brand_color ? hexToHsl(c.brand_color) : null;
    for (const v of ["--primary", "--ring"]) hsl ? root.style.setProperty(v, hsl) : root.style.removeProperty(v);
    if (c.school_name) document.title = c.school_name;
  }, [c.brand_color, c.school_name]);
  return null;
}
