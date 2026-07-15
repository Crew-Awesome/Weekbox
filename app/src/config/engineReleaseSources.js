export const ENGINE_RELEASE_SOURCES = {
  vslice: {
    repository: "FunkinCrew/Funkin",
    assets: {
      win: [/windows/i, /installer.*\.zip$/i],
      lin: [/linux/i],
      mac: [/macos|osx|\.dmg$/i],
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
};
