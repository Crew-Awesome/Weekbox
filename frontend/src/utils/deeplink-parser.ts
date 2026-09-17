/**
 * Deeplink parsing utilities (SRP).
 * Extracts mod identification data from CLI arguments, URL schemes, or query parameters.
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

    // Pattern 1: Custom weekbox:// scheme
    if (clean.toLowerCase().startsWith("weekbox://")) {
      // Direct matches for:
      // weekbox://mod/123, weekbox://mods/123, weekbox://mod,123, weekbox://download/123, weekbox://install/123, weekbox://123
      const numMatch = clean.match(/^weekbox:\/\/(?:(?:mods?|download|install)(?:\/|,))?(\d+)(?:[\/?#].*)?$/i);
      if (numMatch) {
        const id = Number(numMatch[1]);
        if (Number.isInteger(id) && id > 0) {
          return { type: "mod", id };
        }
      }

      // Pattern 1b: Generic weekbox://<type>/<id> or weekbox://<type>,<id>
      const directMatch = clean.match(/^weekbox:\/\/([a-zA-Z0-9_-]+)(?:\/|,)(\d+)(?:[\/?#].*)?$/i);
      if (directMatch) {
        const type = directMatch[1].toLowerCase();
        const id = Number(directMatch[2]);
        if (type === "mod" && Number.isInteger(id) && id > 0) {
          return { type, id };
        }
      }

      // Pattern 1c: Standard URL parser fallback for weekbox://
      try {
        const url = new URL(clean);
        if (url.protocol.toLowerCase() === "weekbox:") {
          const type = url.hostname.toLowerCase();
          const id = Number(url.pathname.replace(/^\/+/, "").split(/[\/?#]/)[0]);
          if ((type === "mod" || type === "mods" || !isNaN(Number(type))) && Number.isInteger(id) && id > 0) {
            return { type: "mod", id };
          }
          const hostId = Number(type);
          if (Number.isInteger(hostId) && hostId > 0) {
            return { type: "mod", id: hostId };
          }
        }
      } catch {
        // Ignore URL parsing errors
      }
    }

    // Pattern 2: GameBanana URLs (e.g. https://gamebanana.com/mods/12345)
    if (clean.toLowerCase().includes("gamebanana.com/mods/")) {
      const gbMatch = clean.match(/gamebanana\.com\/mods\/(\d+)/i);
      if (gbMatch) {
        const id = Number(gbMatch[1]);
        if (Number.isInteger(id) && id > 0) {
          return { type: "mod", id };
        }
      }
    }

    // Pattern 3: Pure numeric mod ID string (if passed directly)
    if (/^\d+$/.test(clean)) {
      const id = Number(clean);
      if (id > 0) {
        return { type: "mod", id };
      }
    }
  }

  return null;
}

/**
 * Reads startup arguments (window.NL_ARGS, URL parameters, or location hash)
 * and returns parsed deeplink info if present.
 */
export function parseStartupDeeplink(): ParsedDeeplink | null {
  if (typeof window === "undefined") return null;

  // 1. Check Neutralino CLI args
  if ((window as any).NL_ARGS) {
    const fromNL = parseDeeplinkArgs((window as any).NL_ARGS);
    if (fromNL) return fromNL;
  }

  // 2. Check window.location query params (?modal=123, ?mod=123, ?deeplink=...)
  try {
    const url = new URL(window.location.href);
    const modParam = url.searchParams.get("modal") || url.searchParams.get("mod");
    if (modParam && Number(modParam) > 0) {
      return { type: "mod", id: Number(modParam) };
    }
    const deeplinkParam = url.searchParams.get("deeplink") || url.searchParams.get("url");
    if (deeplinkParam) {
      const fromParam = parseDeeplinkArgs(deeplinkParam);
      if (fromParam) return fromParam;
    }
    if (window.location.hash) {
      const fromHash = parseDeeplinkArgs(window.location.hash.replace(/^#/, ""));
      if (fromHash) return fromHash;
    }
  } catch {}

  return null;
}
