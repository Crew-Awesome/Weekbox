export interface FeaturedEngine {
  id: string;
  name: string;
  icon: string;
}

export interface FeaturedCategory {
  id: number;
  name: string;
}

export interface FeaturedModRaw {
  id: number;
  title: string;
  description?: string;
  author: string;
  image: string;
  likes?: number;
  downloads?: number;
  views?: number;
  publishedAt: number;
  updatedAt?: number;
  url?: string;
  engine: FeaturedEngine;
  category: FeaturedCategory;
}

export interface FeaturedRanking {
  label: string;
  mods: FeaturedModRaw[];
}

export interface FeaturedSchema {
  schemaVersion: number;
  revision: string;
  rankings: FeaturedRanking[];
}
