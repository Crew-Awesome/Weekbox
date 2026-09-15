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
}
