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
  updatedAt?: number;
  timeAgo: string;
  thumbnail: string;
  isNsfw: boolean;
  previewMedia?: string[];
  files?: any[];
  credits?: any[];
}

export interface GameBananaMod extends GameBananaItem {
  engineId?: string;
  engineIcon?: string;
  __featuredLabel?: string;
  __featuredCategoryId?: number;
  version?: string;
  updatesCount?: number;
  updates?: any[];
  externalLinks?: any[];
  studio?: string;
  categoryName?: string;
}

export interface GameBananaTool extends GameBananaItem {
}
