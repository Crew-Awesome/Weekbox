import { describe, it, expect } from "vitest";
import { formatBytes, formatTimeAgo, formatFileSize } from "../src/utils/formatters";

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

  describe("formatFileSize", () => {
    it("should format undefined or null as empty string", () => {
      expect(formatFileSize(undefined)).toBe("");
      expect(formatFileSize(null as any)).toBe("");
    });

    it("should format 0 bytes correctly", () => {
      expect(formatFileSize(0)).toBe("0 B");
    });

    it("should format bytes under 1KB", () => {
      expect(formatFileSize(500)).toBe("500 B");
    });

    it("should format KB correctly", () => {
      expect(formatFileSize(2048)).toBe("2.0 KB");
    });

    it("should format MB correctly", () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB");
      expect(formatFileSize(25 * 1024 * 1024)).toBe("25 MB");
    });

    it("should format GB correctly", () => {
      expect(formatFileSize(1.5 * 1024 * 1024 * 1024)).toBe("1.50 GB");
    });
  });
});
