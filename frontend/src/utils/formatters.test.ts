import { describe, it, expect } from "vitest";
import { formatBytes, formatTimeAgo } from "./formatters";

describe("Formatters Utility", () => {
  describe("formatBytes", () => {
    it("should format 0 bytes correctly", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
    });

    it("should format KB correctly", () => {
      expect(formatBytes(1024)).toBe("1 KB");
    });

    it("should format MB correctly with precision", () => {
      expect(formatBytes(1048576 * 1.5)).toBe("1.5 MB");
    });

    it("should use the fallback for invalid inputs", () => {
      expect(formatBytes(null, 2, "Unknown")).toBe("Unknown");
    });
  });

  describe("formatTimeAgo", () => {
    it("should format seconds correctly", () => {
      expect(formatTimeAgo(30)).toBe("30s");
    });

    it("should format minutes correctly", () => {
      expect(formatTimeAgo(125)).toBe("2m");
    });

    it("should format hours correctly", () => {
      expect(formatTimeAgo(3600 * 5)).toBe("5h");
    });
  });
});
