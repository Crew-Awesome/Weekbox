export interface ModItem {
  id: number;
  name: string;
  description: string;
  htmlBody?: string;
  img: string;
  icon?: string;
  showIcon?: boolean;
  previewMedia?: string[];
  author?: string;
  submittedAt?: number;
  updatedAt?: number;
  engineId?: string;
  files?: any[];
}
