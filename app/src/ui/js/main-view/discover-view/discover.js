import { initCards } from '../../../utils/components/cards/cards.js';
import { initCarousels } from '../../../utils/components/carousel/carousel.js';
import { loadFeaturedCarousel } from './discover-carousel-featured.js';
import { loadDiscoverMods } from './discover-cards-mods.js';
import { initSearchBar } from './discover-search.js';

export async function init() {
    const container = document.querySelector('.discover-container');
    
    // Inject the grid HTML
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
    
    // Initialize base components
    initCards(container);
    await loadFeaturedCarousel(container);
    initCarousels(container);
    
    // Inject search bar and initialize
    await initSearchBar(container);
    
    // Fetch API mods and inject them into the grid
    await loadDiscoverMods(container);
}