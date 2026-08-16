export interface GameBananaItem {
  id: number;
  gameId: number;
  title: string;
  description: string;
  author: string;
  authors: string[];
  likes: number;
  views: number;
  downloads: number;
  submittedAt: number;
  timeAgo: string;
  thumbnail: string;
}

export interface GameBananaMod extends GameBananaItem {
  engineId: string;
}

export interface GameBananaTool extends GameBananaItem {
  // Las tools no dependen de engineId, asi que mantenemos su propia interfaz
}

