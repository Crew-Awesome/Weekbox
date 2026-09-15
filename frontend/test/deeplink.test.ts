import { describe, it, expect } from "vitest";
import { parseDeeplinkArgs } from "../src/core/backend/os/protocol";

describe("Deeplink Protocol Parser", () => {
  it("parses standard deeplink weekbox://mod/526302", () => {
    const result = parseDeeplinkArgs(["weekbox://mod/526302"]);
    expect(result).toEqual({ type: "mod", id: 526302 });
  });

  it("parses deeplink enclosed in quotes", () => {
    const result = parseDeeplinkArgs(['"weekbox://mod/526302"']);
    expect(result).toEqual({ type: "mod", id: 526302 });
  });

  it("parses deeplink with trailing slash", () => {
    const result = parseDeeplinkArgs(["weekbox://mod/526302/"]);
    expect(result).toEqual({ type: "mod", id: 526302 });
  });

  it("parses deeplink with query parameters", () => {
    const result = parseDeeplinkArgs(["weekbox://mod/526302?ref=gamebanana&theme=dark"]);
    expect(result).toEqual({ type: "mod", id: 526302 });
  });

  it("parses deeplink from full Windows command line arguments array", () => {
    const args = [
      "C:\\Users\\leive\\Proyectos\\WeekBox-Proyectos\\Weekbox-otra-re-escritura\\dist\\WeekBox\\WeekBox-win_x64.exe",
      "--path=C:\\Users\\leive\\Proyectos\\WeekBox-Proyectos\\Weekbox-otra-re-escritura\\dist\\WeekBox",
      '"weekbox://mod/526302"',
    ];
    const result = parseDeeplinkArgs(args);
    expect(result).toEqual({ type: "mod", id: 526302 });
  });

  it("parses deeplink when passed as --path=\"weekbox://mod/526302\"", () => {
    const result = parseDeeplinkArgs(['--path="weekbox://mod/526302"']);
    expect(result).toEqual({ type: "mod", id: 526302 });
  });

  it("returns null for non-deeplink arguments", () => {
    expect(parseDeeplinkArgs(["--verbose", "--load-dir-res"])).toBeNull();
    expect(parseDeeplinkArgs([])).toBeNull();
  });
});
