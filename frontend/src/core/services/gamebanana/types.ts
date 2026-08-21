export interface GameBananaItem {
  id: number;
  gameId: number;
  title: string;
  description: string;
  htmlBody: string;
  author: string;
  userId: number;
  userPfp: string;
  authors: string[];
  likes: number;
  views: number;
  downloads: number;
  submittedAt: number;
  timeAgo: string;
  thumbnail: string;
  isNsfw: boolean;
}

export interface GameBananaMod extends GameBananaItem {
  engineId?: string;
  engineIcon?: string;
  __featuredLabel?: string;
  __featuredCategoryId?: number;
}

export interface GameBananaTool extends GameBananaItem {
  // Las tools no dependen de engineId, asi que mantenemos su propia interfaz
}
