import type { GameBananaMod } from "@core";

/**
 * @description Configuration for an easter egg.
 */
export interface EasterEggConfig {
  id: string;
  match: (mods: GameBananaMod[]) => boolean;
  mainImage: string;
  confettiImages: string[];
}

export const EASTER_EGG_BASE_PATH = "/assets/icons/search-easter-egg";

/**
 * @description Array of easter eggs configurations for the home searchbar.
 */
export const SEARCH_EASTER_EGGS: EasterEggConfig[] = [
  {
    id: "qt",
    match: (mods: GameBananaMod[]) => {
      return mods.some((mod) => mod.id === 566597);
    },
    mainImage: `${EASTER_EGG_BASE_PATH}/qt/qt.webp`,
    confettiImages: [
      `${EASTER_EGG_BASE_PATH}/qt/crayonSticker.webp`,
      `${EASTER_EGG_BASE_PATH}/qt/qtSticker1.webp`,
      `${EASTER_EGG_BASE_PATH}/qt/qtSticker2.webp`,
      `${EASTER_EGG_BASE_PATH}/qt/qtSticker3.webp`,
      `${EASTER_EGG_BASE_PATH}/qt/skullSticker.webp`,
      `${EASTER_EGG_BASE_PATH}/qt/starSticker.webp`,
    ],
  },
  {
    id: "whitty",
    match: (mods: GameBananaMod[]) => {
      return mods.some((mod) => mod.id === 44214);
    },
    mainImage: `${EASTER_EGG_BASE_PATH}/whitty/Whitty_Ballistic.gif`,
    confettiImages: [`${EASTER_EGG_BASE_PATH}/whitty/Whitty_Icon.webp`],
  },
];
