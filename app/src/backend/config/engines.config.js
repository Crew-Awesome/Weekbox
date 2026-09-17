export const ENGINE_DETAILS = {
  vslice: { name: "Base Game", icon: "vslice.png" },
  psych: { name: "Psych Engine", icon: "psych.png" },
  pslice: { name: "P-Slice", icon: "pslice.png" },
  fpsplus: { name: "FPS Plus", icon: "fpsplus.png" },
  psychonline: { name: "Psych Online", icon: "psychonline.png" },
  codename: { name: "Codename Engine", icon: "codename.png" },
  executable: { name: "Executable", icon: "exe.png" },
};



export const ENGINE_LAUNCH_BEHAVIORS = {
  default: { scope: "shared-engine" },
  vslice: { scope: "shared-engine" },
  psych: { scope: "shared-engine" },
  pslice: { scope: "shared-engine" },
  fpsplus: { scope: "shared-engine" },
  psychonline: { scope: "shared-engine" },
  codename: { scope: "exclusive-mod", modArgument: "-mod" },
};

export function getEngineLaunchBehavior(engineId) {
  return ENGINE_LAUNCH_BEHAVIORS[engineId] || ENGINE_LAUNCH_BEHAVIORS.default;
}

export function getEngineModLaunchArgs(engineId, modFolderName) {
  const { modArgument } = getEngineLaunchBehavior(engineId);
  if (!modArgument || !modFolderName) return [];
  return modArgument === "positional"
    ? [modFolderName]
    : [modArgument, modFolderName];
}

export const ENGINE_CATEGORY_IDS = {
  29202: "vslice",
  28367: "psych",
  34764: "codename",
  3827: "executable",
  43798: "pslice",
  43850: "fpsplus",
  43788: "psychonline",
};

export const ENGINE_CATEGORY_ROOTS =
  Object.keys(ENGINE_CATEGORY_IDS).map(Number);

export const CATEGORY_ROOTS = [...ENGINE_CATEGORY_ROOTS, 43773];

export const CATEGORY_GROUPS = {
  43773: [43773, 3046, 3828, 43772],
};

export const MOD_KIND_CATEGORY_IDS = {
  43803: "dependency",
  43804: "dependency",
  43793: "addon",
};

// GameBanana's obsolete Legacy Categories root. Keep 3833 for direct profile

export const EXCLUDED_MOD_CATEGORY_IDS = [43772, 3833, 44037];
