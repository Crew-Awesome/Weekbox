import http from "@http";
import { GB_BASE_URL, FNF_GAME_ID, ENGINE_CATEGORIES } from "../constants";
import { fetchPopularRecords } from "./popular";

let cachedQuery = "";
let cachedEngineIds = "";
let cachedSortFilter = "";
let cachedRecords: any[] = [];
let chunkIndex = 0;
let hasReachedEnd = false;
let currentFetchPromise: Promise<void> | null = null;
const CHUNK_PAGES = 5; // Fetches 5 * 15 = 75 items per massive chunk

/**
 * @description Advanced hybrid search algorithm that merges GameBanana's native search results with
 * an offline popular cache. Applies an AI-like relevance scoring inspired by YouTube's recommendation system.
 * Filters strictly by title, supports pagination, multiple engines, and deduplicates automatically.
 * @param {string} query - The search string input by the user.
 * @param {string[]} engineIds - An array of engine IDs to filter the results (e.g. `["vslice", "psych"]`). Defaults to `["all"]`.
 * @param {string} sortFilter - The active sort mode (e.g. `"popular"`, `"new"`, `"updated"`). Defaults to `"popular"`.
 * @param {number} page - The UI page number currently requested.
 * @param {number} perPage - How many items should be returned per page.
 * @returns {Promise<any[]>} A highly curated, filtered, and sorted array of Mod records ready for Mod/Multi hydration.
 */
export async function fetchSearchRecords(
  query: string,
  engineIds: string[] = ["all"],
  sortFilter: string = "popular",
  page: number = 1,
  perPage: number = 15,
): Promise<any[]> {
  try {
    const currentEngineIds = engineIds.join(",");
    const isNewQuery =
      query !== cachedQuery ||
      currentEngineIds !== cachedEngineIds ||
      sortFilter !== cachedSortFilter;

    if (isNewQuery) {
      cachedQuery = query;
      cachedEngineIds = currentEngineIds;
      cachedSortFilter = sortFilter;
      cachedRecords = [];
      chunkIndex = -1;
      hasReachedEnd = false;
      currentFetchPromise = null;
    }

    let chunksLoadedThisCall = 0;

    while (
      cachedRecords.length < page * perPage &&
      chunkIndex < 50 &&
      !hasReachedEnd &&
      chunksLoadedThisCall < 2
    ) {
      if (currentFetchPromise) {
        await currentFetchPromise;
        if (query !== cachedQuery || currentEngineIds !== cachedEngineIds) {
          return [];
        }
        continue;
      }

      chunksLoadedThisCall++;
      chunkIndex++;
      const startGBPage = chunkIndex * CHUNK_PAGES + 1;
      const expectedQuery = query;
      const expectedEngineIds = currentEngineIds;

      currentFetchPromise = (async () => {
        const requests = Array.from({ length: CHUNK_PAGES }).map(
          async (_, i) => {
            const p = startGBPage + i;
            const url = `${GB_BASE_URL}/Util/Search/Results?_sModelName=Mod&_idGameRow=${FNF_GAME_ID}&_sSearchString=${encodeURIComponent(query)}&_nPage=${p}&_nPerpage=15`;
            try {
              const res: any = await http.fetchJson(url);
              return res?._aRecords || [];
            } catch {
              return [];
            }
          },
        );

        const popularPromise = fetchPopularRecords(null, 10, 300);
        const pages = await Promise.all(requests);
        const popularMods = await popularPromise;

        if (cachedQuery !== expectedQuery || cachedEngineIds !== expectedEngineIds) {
          return;
        }

        let emptyCount = 0;
        for (const p of pages) {
          if (p.length === 0) emptyCount++;
        }
        if (emptyCount === CHUNK_PAGES) {
          hasReachedEnd = true;
        }

        let newRecords = [...pages.flat(), ...popularMods];

        // Filter by Multiple Engines
        if (!engineIds.includes("all")) {
          // Resolve numeric IDs for the allowed engines
          const allowedNumericIds = engineIds
            .map((id) => {
              const match = Object.entries(ENGINE_CATEGORIES).find(
                ([_, cat]) => cat.id === id,
              );
              return match ? match[0] : null;
            })
            .filter(Boolean);

          if (allowedNumericIds.length > 0) {
            newRecords = newRecords.filter((r: any) => {
              // Si es un mod del pool de populares, ya trae el engineId resuelto
              if (r.__resolvedEngineId) {
                return engineIds.includes(r.__resolvedEngineId);
              }

              // Para mods nativos de GameBanana, buscar el ID numérico en la URL del perfil de la categoría
              const c =
                r._aCategory ||
                r._aSubCategory ||
                r._aRootCategory ||
                r._aSuperCategory;
              if (!c || !c._sProfileUrl) return false;

              const catId = c._sProfileUrl.split("/").pop();
              return allowedNumericIds.includes(catId);
            });
          }
        }

        // "AI-like" Relevance Algorithm (Based on YouTube Recommendations PDF)
        const queryTerms = query
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter(Boolean);
        const currentTimestamp = Math.floor(Date.now() / 1000);

        newRecords.sort((a: any, b: any) => {
          // 1. Feature Representation (Views as engagement surrogate, Age as "Example Age")
          const viewsA = a._nViewCount || 0;
          const viewsB = b._nViewCount || 0;
          const downloadsA = a._nDownloadCount || 0;
          const downloadsB = b._nDownloadCount || 0;

          const dateA = a._tsDateAdded || 0;
          const dateB = b._tsDateAdded || 0;

          // Age in days
          const ageDaysA = Math.max(1, (currentTimestamp - dateA) / 86400);
          const ageDaysB = Math.max(1, (currentTimestamp - dateB) / 86400);

          // 2. Semantic matching (Metadatos y Transcripción AI)
          const nameA = (a._sName || "").toLowerCase();
          const nameB = (b._sName || "").toLowerCase();
          const descA = JSON.stringify(a).toLowerCase(); // Simulating deep metadata check
          const descB = JSON.stringify(b).toLowerCase();

          // Calculate Match ratio based on words
          const exactMatchScore = (name: string, desc: string) => {
            let score = 0;
            const cleanName = name.replace(/[^a-z0-9]/g, "");
            const cleanFullQuery = queryTerms.join("");

            if (cleanName.includes(cleanFullQuery)) score += 50;
            else {
              let titleMatch = false;
              queryTerms.forEach((term) => {
                if (name.includes(term)) {
                  score += 10;
                  titleMatch = true;
                } else if (desc.includes(term)) {
                  score += 2;
                }
              });

              // La gente suele buscar por título. Si el título no tiene absolutamente ninguna
              // coincidencia con la búsqueda, descartamos el mod para evitar spam popular.
              if (!titleMatch) return 0;
            }
            return score;
          };

          const relevanceA = exactMatchScore(nameA, descA);
          const relevanceB = exactMatchScore(nameB, descB);

          // 3. Expected Engagement & Freshness (PDF Section 3.3 and 4.2)
          const freshnessA = Math.exp(-ageDaysA / 60) * 50000;
          const freshnessB = Math.exp(-ageDaysB / 60) * 50000;

          // Score = Relevance * (Downloads*2 + Views + Freshness Boost)
          let scoreA =
            relevanceA > 0
              ? relevanceA * (downloadsA * 2 + viewsA + freshnessA)
              : 0;
          let scoreB =
            relevanceB > 0
              ? relevanceB * (downloadsB * 2 + viewsB + freshnessB)
              : 0;

          // Allow strict sorting if requested
          if (sortFilter === "new" || sortFilter === "updated") {
            scoreA = dateA;
            scoreB = dateB;
          }

          return scoreB - scoreA;
        });

        // Eliminar mods que no tienen absolutamente ninguna relevancia (score 0)
        // a menos que estemos ordenando estrictamente por nuevo/actualizado
        if (sortFilter === "popular") {
          newRecords = newRecords.filter((r) => {
            const n = (r._sName || "").toLowerCase();
            const qTerms = query
              .toLowerCase()
              .split(/[^a-z0-9]+/)
              .filter(Boolean);
            const cleanFull = qTerms.join("");
            if (n.replace(/[^a-z0-9]/g, "").includes(cleanFull)) return true;

            // Estricto: Al menos un término debe estar en el título
            return qTerms.some((term) => n.includes(term));
          });
        }

        // Avoid duplicates both globally and internally
        const existingIds = new Set(cachedRecords.map((r) => r._idRow));
        const uniqueNewRecords = [];
        for (const r of newRecords) {
          if (!existingIds.has(r._idRow)) {
            existingIds.add(r._idRow);
            uniqueNewRecords.push(r);
          }
        }
        newRecords = uniqueNewRecords;

        cachedRecords = [...cachedRecords, ...newRecords];
      })();

      await currentFetchPromise;
      currentFetchPromise = null;
    }

    const start = (page - 1) * perPage;
    return cachedRecords.slice(start, start + perPage);
  } catch (e) {
    console.error("Search failed:", e);
    return [];
  }
}
