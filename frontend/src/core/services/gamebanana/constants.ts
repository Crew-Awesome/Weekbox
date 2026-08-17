export const FNF_GAME_ID = 8694;

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

export const EXCLUDED_CATEGORIES = new Set([43772, 3833, 44037]);

export const GB_BASE_URL = "https://gamebanana.com/apiv11";
