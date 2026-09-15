import type { ModItem } from "../types";

export const MOCK_MODS: ModItem[] = [
  {
    id: 1001,
    name: "Friday Night Funkidsasadsdaasdsadsaaaaaaaaaaaaaasdasdasdasdasdassdasddn': Mod Title",
    description:
      "Mod asdsdaadsDescription that's very long but very very very long",
    img: "/assets/images/placeholder-mini.jpg",
    icon: "/assets/icons/categories/codename.png",
    showIcon: true,
  },
  {
    id: 1002,
    name: "No Icon Card",
    description: "This card explicitly hides the icon and its mask.",
    img: "/assets/images/placeholder-mini.jpg",
    icon: "/assets/icons/categories/vslice.png",
    showIcon: false,
  },
  {
    id: 1003,
    name: "Different Icon Card",
    description: "This card uses a different customizable icon.",
    img: "/assets/images/placeholder-mini.jpg",
    icon: "/assets/icons/app/launcher-icon.png",
    showIcon: true,
  },
  {
    id: 1004,
    name: "Standard Card",
    description: "Another regular card.",
    img: "/assets/images/placeholder-mini.jpg",
    icon: "/assets/icons/categories/fpsplus.png",
    showIcon: true,
  },
];

export const EXTENDED_MOCKS: ModItem[] = Array.from({ length: 16 }).map(
  (_, i) => MOCK_MODS[i % MOCK_MODS.length],
);
