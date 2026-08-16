import { ENGINE_CATEGORIES, EXCLUDED_CATEGORIES } from './constants';

export function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor(Date.now() / 1000) - timestamp;
  if (seconds < 60) return "Just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return minutes + "m ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + "h ago";
  const days = Math.floor(hours / 24);
  if (days < 30) return days + "d ago";
  const months = Math.floor(days / 30);
  if (months < 12) return months + "mo ago";
  const years = Math.floor(days / 365);
  return years + "y ago";
}

export function getEngineId(record: any): string {
  const ids = [
    record._aCategory?._idRow,
    record._aSuperCategory?._idRow,
    record._aRootCategory?._idRow,
    record._aSubCategory?._idRow,
    record.__injectedCategoryId
  ];
  for (const id of ids) {
    if (id && ENGINE_CATEGORIES[id]) return ENGINE_CATEGORIES[id];
  }
  return "unknown";
}

export function isExcluded(record: any): boolean {
  const ids = [
    record._aCategory?._idRow,
    record._aSuperCategory?._idRow,
    record._aRootCategory?._idRow,
    record._aSubCategory?._idRow,
  ];
  for (const id of ids) {
    if (id && EXCLUDED_CATEGORIES.has(id)) return true;
  }
  return false;
}

export function extractAuthors(metaCredits: any): string[] {
  const authors: string[] = [];
  if (metaCredits) {
    for (const group of Object.values(metaCredits)) {
      if (Array.isArray(group)) {
         group.forEach((credit: any) => {
           if (credit && credit[0]) authors.push(credit[0]);
         });
      }
    }
  }
  return Array.from(new Set(authors));
}

export function extractThumbnail(record: any): string {
  const images = record._aPreviewMedia?._aImages;
  if (images && images.length > 0) {
     return images[0]._sBaseUrl + "/" + images[0]._sFile;
  }
  return "assets/img/placeholder-mini.jpg";
}

