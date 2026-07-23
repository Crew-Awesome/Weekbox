export const ENGINE_RELEASE_SOURCES = {
  vslice: {
    repository: "FunkinCrew/Funkin",
    assets: {
      win: [/^funkin-windows-(?:64bit|x64)\.zip$/i],
      lin: [/linux/i],
      // v0.8.4 ships its macOS disk image inside this installer archive
      // instead of publishing a separately named macOS asset.
      mac: [/macos|osx/i, /^funkin-installer-[\d.]+\.zip$/i],
    },
    exclude: [/debug/i, /html5/i],
  },
  codename: {
    repository: "CodenameCrew/CodenameEngine",
    assets: {
      win: [/windows\.zip$/i],
      lin: [/linux\.zip$/i],
      mac: [/mac(?:os)?\.(?:zip|tar\.gz)$/i],
    },
    exclude: [/update|assets/i],
    nightly: {
      branch: "main",
      assets: {
        win: { workflow: "windows.yml", artifact: "Codename Engine" },
        lin: { workflow: "linux.yml", artifact: "Codename Engine" },
        mac: { workflow: "macos.yml", artifact: "Codename Engine" },
      },
    },
    updates: { channel: "nightly" },
  },
  psych: {
    repository: "ShadowMario/FNF-PsychEngine",
    assets: {
      win64: [/windows64/i],
      win32: [/windows32/i],
      lin: [/linux/i],
      mac: [/macos/i],
    },
  },
  pslice: {
    repository: "Psych-Slice/P-Slice",
    assets: {
      win: [/(?:^|[^a-z])win(?:dows)?(?:[^a-z]|$)/i],
      lin: [/linux/i],
      mac: [/(?:\.mac|\.macos)\.zip$/i],
      mac64: [/macosx64/i],
      macarm: [/macosarm64/i],
    },
    exclude: [/android|ios/i],
  },
  fpsplus: {
    repository: "ThatRozebudDude/FPS-Plus-Public",
    assets: { win: [/^fpsplus_/i] },
    exclude: [/example_mods/i],
  },
  psychonline: {
    repository: "Snirozu/Funkin-Psych-Online",
    assets: {
      win: [/^windowsbuild\.zip$/i],
      lin: [/^linuxbuild\.zip$/i],
      mac: [/^macbuild\.zip$/i],
    },
    updates: { channel: "release" },
  },
};
