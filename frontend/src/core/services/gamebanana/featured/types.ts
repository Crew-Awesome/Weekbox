/**
 * @description Represents the engine associated with a featured mod in the JSON schema.
 */
export interface FeaturedEngine {
  id: string;
  name: string;
  icon: string;
}

/**
 * @description Represents the category classification of a featured mod.
 */
export interface FeaturedCategory {
  id: number;
  name: string;
}

/**
 * @description Raw structure of a mod object as defined in the external Featured JSON schema.
 */
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

/**
 * @description Represents a ranking group within the featured schema (e.g. "Community Pick").
 */
export interface FeaturedRanking {
  label: string;
  mods: FeaturedModRaw[];
}

/**
 * @description Root schema of the external featured JSON.
 */
export interface FeaturedSchema {
  schemaVersion: number;
  revision: string;
  rankings: FeaturedRanking[];
}
