/**
 * @description The official GameBanana ID for Friday Night Funkin'
 */
export const FNF_GAME_ID = 8694;

/**
 * @description Map of allowed GameBanana categories (Engines/Executables) that this app supports.
 * Contains metadata for rendering UI icons and resolving engine IDs.
 */
export const ENGINE_CATEGORIES: Record<
  number,
  { id: string; name: string; icon: string }
> = {
  29202: {
    id: "vslice",
    name: "V-Slice Engine",
    icon: "/assets/icons/categories/vslice.png",
  },
  28367: {
    id: "psych",
    name: "Psych Engine",
    icon: "/assets/icons/categories/psych.png",
  },
  34764: {
    id: "codename",
    name: "Codename Engine",
    icon: "/assets/icons/categories/codename.png",
  },
  3827: {
    id: "executable",
    name: "Executable Mods",
    icon: "/assets/icons/categories/exe.png",
  },
  43798: {
    id: "pslice",
    name: "P-Slice Engine",
    icon: "/assets/icons/categories/pslice.png",
  },
  43850: {
    id: "fpsplus",
    name: "FPS Plus",
    icon: "/assets/icons/categories/fpsplus.png",
  },
  43788: {
    id: "psychonline",
    name: "Psych Online",
    icon: "/assets/icons/categories/psychonline.png",
  },
};

/**
 * @description Set of GameBanana category IDs that should be strictly excluded (e.g. adult content, unrelated categories).
 */
export const EXCLUDED_CATEGORIES = new Set([43772, 3833, 44037]);

/**
 * @description Master toggle to allow or hide NSFW / Adult content.
 * Currently set to true for testing, can be hooked to user settings later.
 */
export const ALLOW_NSFW = true;

/**
 * @description The base URL for GameBanana API v11 requests.
 */
export const GB_BASE_URL = "https://gamebanana.com/apiv11";
