export interface ModCreditAuthor {
  name: string;
  role?: string;
  avatarUrl?: string;
  id?: number;
}

export interface ModCreditGroup {
  groupName: string;
  authors: ModCreditAuthor[];
}

export interface ModItem {
  id: number;
  name: string;
  title?: string;
  description: string;
  htmlBody?: string;
  img: string;
  icon?: string;
  showIcon?: boolean;
  previewMedia?: string[];
  author?: string;
  authors?: string[];
  credits?: ModCreditGroup[];
  submittedAt?: number;
  updatedAt?: number;
  engineId?: string;
  engineName?: string;
  defaultEngineId?: string;
  files?: any[];
  version?: string;
  updatesCount?: number;
  updates?: any[];
  externalLinks?: any[];
  studio?: string;
  categoryName?: string;
  views?: number;
  likes?: number;
  downloads?: number;
  isNsfw?: boolean;
  installedAt?: number;
  isInstalled?: boolean;
  favorite?: boolean;
  userPfp?: string;
  userId?: number;
}

/**
 * Metadata representation of a locally installed mod.
 */
export interface InstalledMod extends ModItem {
  installed: boolean;
  installedAt: number;
  installPath: string;
  gameId?: number;
  thumbnailBase64?: string;
  timeAgo?: string;
  userPfp?: string;
  userId?: number;
}

/**
 * Payload required to register an installed mod into local persistence.
 */
export type RegisterInstalledModPayload = Partial<InstalledMod> & {
  id: number | string;
  name?: string;
  title?: string;
  thumbnail?: string;
  [key: string]: any;
};
