import { initCards } from '../../../utils/components/cards/cards.js';
import { initCarousels } from '../../../utils/components/carousel/carousel.js';
import { loadFeaturedCarousel } from './discover-carousel-featured.js';
import { renderModsGrid, loadDiscoverMods } from './discover-cards-mods.js';
import { searchModsEngine } from '../../../../backend/api/searchEngine.js';

import './discover-search.js';
import './discover-cards-mods.js';

/**
 * Initializes the Discover view.
 * Injects the grid template, loads the search bar component, and starts data fetching.
 * @returns {Promise<void>}
 */
export async function init() {
    const container = document.querySelector('.discover-container');
    
    try {
        const gridRes = await fetch('src/ui/html/app-html/main-view/discover-view/discover-grid.html');
        if (gridRes.ok) {
            const gridHtml = await gridRes.text();
            const contentDiv = container.querySelector('.discover-content');
            if (contentDiv) {
                contentDiv.insertAdjacentHTML('beforeend', gridHtml);
            }
        }
    } catch (e) {
        console.error('Error loading discover grid', e);
    }
    
    const gridContainer = container.querySelector('.discover-grid-container');
    if (gridContainer) {
        const searchBarElement = document.createElement('search-bar');
        
        const wrapper = document.createElement('div');
        wrapper.style.width = '100%';
        wrapper.style.maxWidth = '700px';
        wrapper.style.margin = '20px auto 32px auto';
        wrapper.appendChild(searchBarElement);
        
        gridContainer.parentNode.insertBefore(wrapper, gridContainer);

        searchBarElement.addEventListener('search', async (e) => {
            const query = e.detail.query;
            searchBarElement.setSearching(true);
            
            if (!query) {
                await loadDiscoverMods(container);
            } else {
                const mods = await searchModsEngine(query);
                renderModsGrid(container, mods);
            }
            
            searchBarElement.setSearching(false);
        });
    }

    initCards(container);
    await loadFeaturedCarousel(container);
    initCarousels(container);
    
    await loadDiscoverMods(container);
}