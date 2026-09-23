import { describe, it, expect } from "vitest";
import {
  isSafeExtractionPath,
  parseExtractedFileName,
} from "../../extensions/backend/node/fs/archive-extractor.mjs";

describe("Archive Extractor Zip Slip Protection", () => {
  const destDir = "C:\\Games\\FNF\\mods\\my-cool-mod";

  it("permits valid paths located inside destination folder", () => {
    expect(isSafeExtractionPath(destDir, "assets/data/song.json")).toBe(true);
    expect(isSafeExtractionPath(destDir, "song.json")).toBe(true);
    expect(isSafeExtractionPath(destDir, "assets/images/characters/bf.png")).toBe(true);
  });

  it("blocks directory traversal attempts using parent directories (..)", () => {
    expect(isSafeExtractionPath(destDir, "../../windows/system32/cmd.exe")).toBe(false);
    expect(isSafeExtractionPath(destDir, "../another-mod/malicious.dll")).toBe(false);
    expect(isSafeExtractionPath(destDir, "folder/../../../escape.exe")).toBe(false);
  });

  it("blocks entries containing null bytes", () => {
    expect(isSafeExtractionPath(destDir, "song.json\0.exe")).toBe(false);
  });

  it("filters unsafe filenames in extraction line parser", () => {
    expect(parseExtractedFileName("Extracting  ../../dangerous.dll")).toBeNull();
    expect(parseExtractedFileName("Extracting  C:\\Windows\\evil.exe")).toBeNull();
    expect(parseExtractedFileName("inflating: ../../startup.bat")).toBeNull();
    expect(parseExtractedFileName("x ../../hack.sh")).toBeNull();
    expect(parseExtractedFileName("Extracting  assets/characters/dad.png")).toBe(
      "assets/characters/dad.png"
    );
  });
});
