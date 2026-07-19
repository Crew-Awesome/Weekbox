import { gameBananaApi } from '../../core/config/api/gamebanana.js';

export async function searchModsEngine(query, page = 1) {
    try {
        const results = await gameBananaApi.searchMods(query, page);
        return results;
    } catch (error) {
        console.error("Error searching mods:", error);
        return [];
    }
}
