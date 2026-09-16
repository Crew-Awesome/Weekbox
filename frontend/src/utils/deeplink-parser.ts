/**
 * Deeplink parsing utilities (SRP).
 * Extracts mod identification data from CLI arguments or URL strings.
 */
export interface ParsedDeeplink {
  type: string;
  id: number;
}

/**
 * Extracts mod information from command line arguments or URL string.
 */
export function parseDeeplinkArgs(
  args: string[] | string
): ParsedDeeplink | null {
  if (!args) return null;
  const list = Array.isArray(args) ? args : [String(args)];

  for (const raw of list) {
    if (typeof raw !== "string") continue;
    let clean = raw.trim().replace(/^["']|["']$/g, "").trim();
    if (clean.toLowerCase().startsWith("--path=")) {
      clean = clean.slice(7).trim().replace(/^["']|["']$/g, "").trim();
    }

    if (!clean.toLowerCase().startsWith("weekbox://")) continue;

    // Pattern 1: Direct regex match for weekbox://mod/123 or weekbox://mod,123
    const directMatch = clean.match(/^weekbox:\/\/([a-zA-Z0-9_-]+)(?:\/|,)(\d+)(?:[\/?#].*)?$/i);
    if (directMatch) {
      const type = directMatch[1].toLowerCase();
      const id = Number(directMatch[2]);
      if (type === "mod" && Number.isInteger(id) && id > 0) {
        return { type, id };
      }
    }

    // Pattern 2: Standard URL parser fallback
    try {
      const url = new URL(clean);
      if (url.protocol.toLowerCase() === "weekbox:") {
        const type = url.hostname.toLowerCase();
        const id = Number(url.pathname.replace(/^\/+/, "").split(/[\/?#]/)[0]);
        if (type === "mod" && Number.isInteger(id) && id > 0) {
          return { type, id };
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }

  return null;
}

/**
 * Reads startup arguments (window.NL_ARGS) and returns parsed deeplink info if present.
 */
export function parseStartupDeeplink(): ParsedDeeplink | null {
  if (typeof window === "undefined") return null;
  return parseDeeplinkArgs(window.NL_ARGS || []);
}
