import { describe, it, expect } from "vitest";
import { hexToHsl } from "./siteContent";
describe("hexToHsl", () => {
  it("converts brand navy", () => expect(hexToHsl("#0E3181")).toBe("222 80% 28%"));
  it("rejects bad input", () => expect(hexToHsl("blue")).toBeNull());
});
