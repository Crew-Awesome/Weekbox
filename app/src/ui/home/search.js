import { homeGrid } from './grid.js';
import { homeSearchDropdown } from './searchDropdown.js';

export const homeSearch = {
    timeoutId: null,

    init() {
        const input = document.getElementById('mod-search-input');
        if (!input) return;

        const newInput = input.cloneNode(true);
        input.parentNode.replaceChild(newInput, input);

        newInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(this.timeoutId);
            
            this.timeoutId = setTimeout(() => {
                this.executeSearch(query);
            }, 300);
        });

        newInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                clearTimeout(this.timeoutId);
                this.executeSearch(e.target.value.trim());
                homeSearchDropdown.hideDropdown();
                newInput.blur();
            }
        });
    },

    async executeSearch(query) {
        const carousel = document.getElementById('featured-carousel');
        const sectionTitle = document.getElementById('grid-section-title');
        const filters = document.getElementById('grid-filters');

        homeGrid.isSearchMode = query.length > 0;
        homeGrid.searchQuery = query;
        homeGrid.currentPage = 1;

        if (query.length > 0) {
            homeSearchDropdown.saveRecent(query);
            if (carousel) carousel.style.display = 'none';
            if (filters) filters.style.display = 'none';
            if (sectionTitle) sectionTitle.textContent = `Resultados para "${query}"`;
        } else {
            if (carousel) carousel.style.display = 'flex';
            if (filters) filters.style.display = 'flex';
            if (sectionTitle) sectionTitle.textContent = 'Mods';
        }

        await homeGrid.renderGrid(true);
    }
};
