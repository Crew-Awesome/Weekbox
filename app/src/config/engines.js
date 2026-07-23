export const ENGINE_DETAILS = {
  vslice: { name: "Base Game", icon: "vslice.png" },
  psych: { name: "Psych Engine", icon: "psych.png" },
  pslice: { name: "P-Slice", icon: "pslice.png" },
  fpsplus: { name: "FPS Plus", icon: "fpsplus.png" },
  psychonline: { name: "Psych Online", icon: "psychonline.png" },
  codename: { name: "Codename Engine", icon: "codename.png" },
  executable: { name: "Executable", icon: "exe.png" },
};

// Launch behavior is separate from display/category metadata so new engines can
// declare whether their mods share one process or are selected per launch.
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

// GameBanana's obsolete Legacy Categories root. Keep 3833 for direct profile
// lookups that omit the root-category relationship.
export const EXCLUDED_MOD_CATEGORY_IDS = [43772, 3833, 44037];
