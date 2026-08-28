import {
  ENGINE_CATEGORIES,
  EXCLUDED_CATEGORIES,
  ALLOW_NSFW,
} from "./constants";

/**
 * @description Converts a Unix timestamp into a human-readable relative time string.
 * @param {number} timestamp - The timestamp in seconds.
 * @returns {string} Formatted string like "5m ago" or "2d ago".
 */
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

/**
 * @description Extracts and resolves the engine ID from a GameBanana record based on its nested category structure.
 * @param {any} record - The raw GameBanana mod record.
 * @returns {string} The resolved engine ID (e.g. 'psych', 'kade') or 'unknown'.
 */
export function getEngineId(record: any): string {
  const extractId = (cat: any) => {
    if (!cat) return null;
    if (cat._idRow) return cat._idRow;
    if (cat._sProfileUrl)
      return parseInt(cat._sProfileUrl.split("/").pop() || "0", 10);
    return null;
  };

  const ids = [
    extractId(record._aCategory),
    extractId(record._aSuperCategory),
    extractId(record._aRootCategory),
    extractId(record._aSubCategory),
    record.__injectedCategoryId,
  ];

  for (const id of ids) {
    if (id && ENGINE_CATEGORIES[id as keyof typeof ENGINE_CATEGORIES])
      return ENGINE_CATEGORIES[id as keyof typeof ENGINE_CATEGORIES].id;
  }
  return "unknown";
}

/**
 * @description Retrieves the icon path for a given engine ID.
 * @param {string} engineId - The internal engine ID.
 * @returns {string | undefined} The path to the engine's icon.
 */
export function getEngineIcon(engineId: string): string | undefined {
  const match = Object.values(ENGINE_CATEGORIES).find((c) => c.id === engineId);
  return match?.icon;
}

/**
 * @description Determines if a record is explicitly NSFW based on GameBanana flags or categories.
 * @param {any} record - The raw GameBanana mod record.
 * @returns {boolean} True if the record is NSFW.
 */
export function checkIsNsfw(record: any): boolean {
  if (record._bIsNsfw || record._bContainsNsfw) return true;

  // GameBanana's "Not Safe For Work" category ID is often 43772 or we can check the names if available.
  // For now, if it's in EXCLUDED_CATEGORIES, it might be NSFW.
  // Let's assume 43772 is the explicit NSFW category ID for FNF.
  const ids = [
    record._aCategory?._idRow,
    record._aSuperCategory?._idRow,
    record._aRootCategory?._idRow,
    record._aSubCategory?._idRow,
  ];
  if (ids.includes(43772)) return true;

  return false;
}

/**
 * @description Checks if a GameBanana record belongs to an explicitly excluded/blacklisted category.
 * @param {any} record - The raw GameBanana mod record.
 * @returns {boolean} True if the record should be excluded.
 */
export function isExcluded(record: any): boolean {
  if (!ALLOW_NSFW && checkIsNsfw(record)) return true;

  const ids = [
    record._aCategory?._idRow,
    record._aSuperCategory?._idRow,
    record._aRootCategory?._idRow,
    record._aSubCategory?._idRow,
  ];
  for (const id of ids) {
    if (id && EXCLUDED_CATEGORIES.has(id)) {
      // If NSFW is allowed, do not exclude the NSFW category!
      if (ALLOW_NSFW && id === 43772) continue;
      return true;
    }
  }
  return false;
}

/**
 * @description Extracts a flattened array of author names from the complex GameBanana credits structure.
 * @param {any} metaCredits - The raw credits object from the Mod/Multi endpoint.
 * @returns {string[]} An array of unique author names.
 */
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

/**
 * Extracts all preview images into a string array.
 * @param {any} record - The raw GameBanana mod record.
 * @returns {string[]} Array of image URLs.
 */
export function extractPreviewMedia(record: any): string[] {
  const images = record._aPreviewMedia?._aImages;
  if (images && Array.isArray(images)) {
    return images.map((img: any) => `${img._sBaseUrl}/${img._sFile}`);
  }
  return [];
}

/**
 * @description Extracts the primary thumbnail URL from a GameBanana record.
 * @param {any} record - The raw GameBanana mod record.
 * @returns {string} The full URL to the thumbnail, or a local placeholder.
 */
export function extractThumbnail(record: any): string {
  const images = record._aPreviewMedia?._aImages;
  if (images && images.length > 0) {
    return images[0]._sBaseUrl + "/" + images[0]._sFile;
  }
  return "assets/img/placeholder-mini.jpg";
}

/**
 * @description Safely extracts the submitter's user ID.
 * @param {any} record - The raw GameBanana mod record.
 * @returns {number} The user ID, or 0 if not found.
 */
export function extractUserId(record: any): number {
  return record._aSubmitter?._idRow || 0;
}

/**
 * @description Extracts the submitter's profile picture URL, filtering out ugly default avatars.
 * @param {any} record - The raw GameBanana mod record.
 * @returns {string} The profile picture URL, or an empty string to trigger fallback UI.
 */
export function extractUserPfp(record: any): string {
  let url = "";
  if (record._aSubmitter?._sAvatarUrl) {
    url = record._aSubmitter._sAvatarUrl;
  } else if (
    record._aSubmitter?._aAvatar?._sBaseUrl &&
    record._aSubmitter?._aAvatar?._sFile
  ) {
    url =
      record._aSubmitter._aAvatar._sBaseUrl +
      "/" +
      record._aSubmitter._aAvatar._sFile;
  }

  if (!url) return "";

  // GameBanana injects default avatars that look ugly, filter them out so UI uses our Lucide icon
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes("default") || lowerUrl.includes("avatar.png")) {
    return "";
  }

  return url;
}
