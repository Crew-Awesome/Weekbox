import { http } from "../../backend/http";

/**
 * Cache entry for translated content.
 */
interface TranslationCacheEntry {
  translated: string;
  sourceLang: string;
}

/**
 * In-memory cache to prevent redundant network translation requests.
 */
const translationCache = new Map<string, TranslationCacheEntry>();

/**
 * In-flight requests map to deduplicate simultaneous translation tasks.
 */
const inFlightTranslations = new Map<string, Promise<TranslationCacheEntry>>();

/**
 * Cooldown timestamp in ms when rate-limited by upstream translation provider.
 */
let rateLimitCooldownUntil = 0;

/**
 * Options for translation requests.
 */
export interface TranslateOptions {
  text: string;
  targetLang: "es" | "en";
  signal?: AbortSignal;
}

/**
 * Splits large HTML or plain text into manageable chunks respecting tag boundaries.
 * @param {string} text - The input text or HTML.
 * @param {number} maxChunkLength - Maximum character length per chunk.
 * @returns {string[]} Array of string chunks.
 */
function splitIntoChunks(text: string, maxChunkLength = 4500): string[] {
  if (text.length <= maxChunkLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxChunkLength) {
      chunks.push(remaining);
      break;
    }

    let splitIndex = remaining.lastIndexOf("</p>", maxChunkLength);
    if (splitIndex === -1 || splitIndex < maxChunkLength / 2) {
      splitIndex = remaining.lastIndexOf("</div>", maxChunkLength);
    }
    if (splitIndex === -1 || splitIndex < maxChunkLength / 2) {
      splitIndex = remaining.lastIndexOf("<br>", maxChunkLength);
    }
    if (splitIndex === -1 || splitIndex < maxChunkLength / 2) {
      splitIndex = remaining.lastIndexOf("\n", maxChunkLength);
    }
    if (splitIndex === -1 || splitIndex < maxChunkLength / 2) {
      splitIndex = remaining.lastIndexOf(". ", maxChunkLength);
    }
    if (splitIndex === -1 || splitIndex < maxChunkLength / 2) {
      splitIndex = maxChunkLength;
    } else {
      if (remaining.substring(splitIndex, splitIndex + 4) === "</p>") {
        splitIndex += 4;
      } else if (remaining.substring(splitIndex, splitIndex + 6) === "</div>") {
        splitIndex += 6;
      } else if (remaining.substring(splitIndex, splitIndex + 4) === "<br>") {
        splitIndex += 4;
      } else if (remaining.substring(splitIndex, splitIndex + 2) === ". ") {
        splitIndex += 2;
      }
    }

    if (splitIndex <= 0) {
      splitIndex = maxChunkLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex);
  }

  return chunks;
}

function parseTranslationResponse(
  rawData: any,
  fallbackText: string,
  targetLang: string
): TranslationCacheEntry {
  if (!rawData) {
    return { translated: fallbackText, sourceLang: "unknown" };
  }

  let translatedText = "";
  let detectedSource = "";

  if (Array.isArray(rawData)) {
    if (Array.isArray(rawData[0]) && typeof rawData[0][0] === "string") {
      translatedText = rawData
        .map((item: any) =>
          Array.isArray(item) && typeof item[0] === "string" ? item[0] : ""
        )
        .join("");
      detectedSource =
        typeof rawData[0][1] === "string" ? rawData[0][1] : "";
    } else if (Array.isArray(rawData[0]) && Array.isArray(rawData[0][0])) {
      translatedText = rawData[0]
        .map((chunk: any) =>
          Array.isArray(chunk) && typeof chunk[0] === "string" ? chunk[0] : ""
        )
        .join("");
      detectedSource = typeof rawData[2] === "string" ? rawData[2] : "";
    } else if (typeof rawData[0] === "string") {
      translatedText = rawData[0];
      detectedSource = typeof rawData[1] === "string" ? rawData[1] : "";
    }
  } else if (typeof rawData === "string") {
    translatedText = rawData;
  }

  return {
    translated: translatedText || fallbackText,
    sourceLang: detectedSource || (translatedText ? targetLang : "unknown"),
  };
}

/**
 * Translates a single text segment via Google Translate single API.
 * Uses direct fetch, with Node IPC and local proxy fallbacks.
 * @param {string} segment - The text or HTML segment to translate.
 * @param {"es" | "en"} targetLang - Target language code.
 * @param {AbortSignal} [signal] - Optional abort signal.
 * @returns {Promise<TranslationCacheEntry>}
 */
async function translateSingleSegment(
  segment: string,
  targetLang: "es" | "en",
  signal?: AbortSignal
): Promise<TranslationCacheEntry> {
  const directUrl = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${targetLang}`;
  const body = `q=${encodeURIComponent(segment)}`;
  const fetchOptions: RequestInit = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body,
    signal,
  };

  try {
    const response = await fetch(directUrl, fetchOptions);
    if (response.status === 429) {
      rateLimitCooldownUntil = Date.now() + 60000;
      return { translated: segment, sourceLang: "unknown" };
    }
    if (response.ok) {
      const rawData = await response.json();
      const parsed = parseTranslationResponse(rawData, segment, targetLang);
      if (parsed.sourceLang !== "unknown") {
        return parsed;
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
  }

  if (typeof window !== "undefined" && window.NODE?.call) {
    try {
      const rawData = await http.fetchJson(directUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        },
        body,
      });
      const parsed = parseTranslationResponse(rawData, segment, targetLang);
      if (parsed.sourceLang !== "unknown") {
        return parsed;
      }
    } catch (err: any) {
      if (err?.name === "AbortError") throw err;
    }
  }

  try {
    const proxyUrl = `/api/translate?client=dict-chrome-ex&sl=auto&tl=${targetLang}`;
    const response = await fetch(proxyUrl, fetchOptions);
    if (response.ok) {
      const rawData = await response.json();
      const parsed = parseTranslationResponse(rawData, segment, targetLang);
      if (parsed.sourceLang !== "unknown") {
        return parsed;
      }
    }
  } catch (err: any) {
    if (err?.name === "AbortError") throw err;
  }

  return {
    translated: segment,
    sourceLang: "unknown",
  };
}

/**
 * Translates text or HTML content into the target language using Google Translate.
 * Transparently chunks long text, throttles requests, deduplicates concurrent calls,
 * and caches results in memory.
 * @param {TranslateOptions} options - Translation parameters.
 * @returns {Promise<TranslationCacheEntry>} Translated content and detected source language.
 */
export async function translateModText({
  text,
  targetLang,
  signal,
}: TranslateOptions): Promise<TranslationCacheEntry> {
  if (!text || !text.trim()) {
    return { translated: text, sourceLang: targetLang };
  }

  const cacheKey = `${targetLang}:::${text}`;
  const cached = translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const inFlight = inFlightTranslations.get(cacheKey);
  if (inFlight) {
    return inFlight;
  }

  if (Date.now() < rateLimitCooldownUntil) {
    return { translated: text, sourceLang: targetLang };
  }

  const requestPromise = (async () => {
    try {
      const chunks = splitIntoChunks(text, 4500);
      const results: TranslationCacheEntry[] = [];

      for (let i = 0; i < chunks.length; i++) {
        if (signal?.aborted) {
          throw new DOMException("Aborted", "AbortError");
        }
        if (i > 0) {
          await new Promise((resolve) => setTimeout(resolve, 150));
        }
        const chunkResult = await translateSingleSegment(chunks[i], targetLang, signal);
        results.push(chunkResult);
      }

      const translated = results.map((r) => r.translated).join("");
      const sourceLang = results[0]?.sourceLang || "unknown";

      const finalResult: TranslationCacheEntry = {
        translated,
        sourceLang,
      };

      if (sourceLang !== "unknown") {
        translationCache.set(cacheKey, finalResult);
      }
      return finalResult;
    } catch (error: any) {
      if (error?.name === "AbortError") {
        throw error;
      }
      return {
        translated: text,
        sourceLang: "unknown",
      };
    } finally {
      inFlightTranslations.delete(cacheKey);
    }
  })();

  inFlightTranslations.set(cacheKey, requestPromise);
  return requestPromise;
}
