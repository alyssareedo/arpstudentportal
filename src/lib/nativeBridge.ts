/**
 * nativeBridge — makes the app behave properly inside a phone (iOS / Android).
 *
 * The web version on Netlify needs none of this, so every path here is gated on
 * `Capacitor.isNativePlatform()`. On the web this file does nothing at all.
 *
 * Two things break inside a phone app's built-in browser:
 *
 *  1. Links meant to open in a new tab (`target="_blank"` and `window.open`)
 *     silently do nothing. That would kill assessment links, video links,
 *     materials, invoices and "Join" buttons. They now open in the phone's
 *     real browser (Chrome / Safari).
 *
 *  2. File downloads (CSV exports, TOEIC / CEFR PDF reports) do nothing either.
 *     They now save to the device and open the share sheet, so the user can
 *     keep the file or send it.
 *
 * The plugin code is loaded lazily and only when running natively, so the
 * website bundle is unchanged.
 */
import { Capacitor } from "@capacitor/core";

const EXTERNAL = /^https?:\/\//i;

export function initNativeBridge(): void {
  if (!Capacitor.isNativePlatform()) return;
  void wire();
}

async function wire() {
  const [{ Browser }, { Filesystem, Directory }, { Share }] = await Promise.all([
    import("@capacitor/browser"),
    import("@capacitor/filesystem"),
    import("@capacitor/share"),
  ]);

  // 1. window.open -> the phone's real browser.
  const originalOpen = window.open.bind(window);
  window.open = function (url?: string | URL, target?: string, features?: string) {
    const href = url === undefined || url === null ? "" : String(url);
    if (EXTERNAL.test(href)) {
      void Browser.open({ url: href });
      return null;
    }
    return originalOpen(url as string | undefined, target, features);
  } as typeof window.open;

  // 2. Anchor clicks: new-tab links -> system browser, file downloads -> save/share.
  document.addEventListener(
    "click",
    (event) => {
      const anchor = (event.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;

      const href = anchor.href;
      if (!href) return;

      const download = anchor.getAttribute("download");
      if (download !== null && /^(blob:|data:)/i.test(href)) {
        event.preventDefault();
        event.stopPropagation();
        void saveAndShare(href, download || "file", Filesystem, Directory, Share);
        return;
      }

      if (anchor.target === "_blank" && EXTERNAL.test(href)) {
        event.preventDefault();
        event.stopPropagation();
        void Browser.open({ url: href });
      }
    },
    true,
  );
}

async function saveAndShare(
  href: string,
  filename: string,
  Filesystem: typeof import("@capacitor/filesystem").Filesystem,
  Directory: typeof import("@capacitor/filesystem").Directory,
  Share: typeof import("@capacitor/share").Share,
) {
  try {
    const blob = await (await fetch(href)).blob();
    const base64 = await blobToBase64(blob);
    const name = filename.replace(/[^\w.\-() ]+/g, "_").slice(0, 80) || "file";
    const path = `downloads/${name}`;

    await Filesystem.writeFile({
      path,
      data: base64,
      directory: Directory.Documents,
      recursive: true,
    });

    const { uri } = await Filesystem.getUri({ path, directory: Directory.Documents });
    await Share.share({ title: name, url: uri, dialogTitle: "Save or send this file" });
  } catch (error) {
    console.error("nativeBridge: could not save the file", error);
  }
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}
