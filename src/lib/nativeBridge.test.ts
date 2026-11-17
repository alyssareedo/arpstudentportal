/**
 * Behaviour tests for the phone bridge (src/lib/nativeBridge.ts).
 *
 * Two things must hold at once:
 *  - inside a phone, new-tab links open in the system browser and file exports
 *    are saved and shared;
 *  - on the website, the bridge must stay completely out of the way.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const browserOpen = vi.fn();
const fsWrite = vi.fn();
const fsGetUri = vi.fn();
const shareShare = vi.fn();
let native = false;

vi.mock("@capacitor/core", () => ({
  Capacitor: { isNativePlatform: () => native },
}));

vi.mock("@capacitor/browser", () => ({
  Browser: { open: (...args: unknown[]) => browserOpen(...args) },
}));

vi.mock("@capacitor/filesystem", () => ({
  Filesystem: {
    writeFile: (...args: unknown[]) => fsWrite(...args),
    getUri: (...args: unknown[]) => fsGetUri(...args),
  },
  Directory: { Documents: "DOCUMENTS" },
}));

vi.mock("@capacitor/share", () => ({
  Share: { share: (...args: unknown[]) => shareShare(...args) },
}));

/** Click an anchor the way a tap does, and report whether the click was cancelled. */
function tap(anchor: HTMLAnchorElement): boolean {
  document.body.appendChild(anchor);
  const notCancelled = anchor.dispatchEvent(
    new MouseEvent("click", { bubbles: true, cancelable: true }),
  );
  anchor.remove();
  return notCancelled;
}

async function loadBridge() {
  const { initNativeBridge } = await import("./nativeBridge");
  initNativeBridge();
  // The bridge loads its plugins lazily, so give the dynamic imports a tick.
  await new Promise((resolve) => setTimeout(resolve, 0));
  await new Promise((resolve) => setTimeout(resolve, 0));
}

let registered: ((event: Event) => void) | null = null;
let originalOpen: typeof window.open;

beforeEach(() => {
  vi.resetModules();
  native = false;
  registered = null;
  browserOpen.mockClear();
  fsWrite.mockClear();
  fsGetUri.mockClear();
  shareShare.mockClear();

  originalOpen = window.open;

  const originalAdd = document.addEventListener.bind(document);
  vi.spyOn(document, "addEventListener").mockImplementation(
    ((type: string, handler: unknown, options: unknown) => {
      if (type === "click") registered = handler as (event: Event) => void;
      originalAdd(type as never, handler as never, options as never);
    }) as typeof document.addEventListener,
  );
});

afterEach(() => {
  if (registered) document.removeEventListener("click", registered, true);
  window.open = originalOpen;
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("nativeBridge", () => {
  it("stays out of the way in the website build", async () => {
    native = false;
    await loadBridge();

    const link = document.createElement("a");
    link.href = "https://abridge.example/placement-test";
    link.target = "_blank";
    const notCancelled = tap(link);

    expect(browserOpen).not.toHaveBeenCalled();
    // The browser's own new-tab behaviour must be left alone.
    expect(notCancelled).toBe(true);
  });

  it("opens new-tab links in the phone's browser", async () => {
    native = true;
    await loadBridge();

    const link = document.createElement("a");
    link.href = "https://abridge.example/placement-test";
    link.target = "_blank";
    const notCancelled = tap(link);

    expect(browserOpen).toHaveBeenCalledWith({ url: "https://abridge.example/placement-test" });
    expect(notCancelled).toBe(false);
  });

  it("routes window.open to the phone's browser", async () => {
    native = true;
    await loadBridge();

    window.open("https://youtube.example/watch?v=abc");

    expect(browserOpen).toHaveBeenCalledWith({ url: "https://youtube.example/watch?v=abc" });
  });

  it("saves an exported file and opens the share sheet", async () => {
    native = true;
    fsGetUri.mockResolvedValue({ uri: "content://files/downloads/report.csv" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ blob: async () => new Blob(["name,score\nBaiboon,5"]) })),
    );
    await loadBridge();

    const link = document.createElement("a");
    link.href = "blob:http://localhost/abc123";
    link.setAttribute("download", "report.csv");
    const notCancelled = tap(link);
    expect(notCancelled).toBe(false);

    // Saving happens asynchronously: fetch the blob, encode it, write, then share.
    await vi.waitFor(() => expect(fsWrite).toHaveBeenCalled());

    expect(fsWrite).toHaveBeenCalledWith(
      expect.objectContaining({ path: "downloads/report.csv", directory: "DOCUMENTS" }),
    );
    // The blob must reach the plugin as base64, not as raw text.
    const written = fsWrite.mock.calls[0][0] as { data: string };
    expect(written.data).toMatch(/^[A-Za-z0-9+/=]+$/);
    expect(shareShare).toHaveBeenCalledWith(expect.objectContaining({ url: expect.any(String) }));
  });

  it("leaves in-app navigation alone", async () => {
    native = true;
    await loadBridge();

    const link = document.createElement("a");
    link.href = "/schedule";
    const notCancelled = tap(link);

    expect(browserOpen).not.toHaveBeenCalled();
    expect(notCancelled).toBe(true);
  });
});
