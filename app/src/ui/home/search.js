window.HomeSearch = {
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
                window.HomeSearchDropdown.hideDropdown();
                newInput.blur();
            }
        });
    },

    async executeSearch(query) {
        const carousel = document.getElementById('featured-carousel');
        const sectionTitle = document.getElementById('grid-section-title');
        const filters = document.getElementById('grid-filters');

        window.HomeGrid.isSearchMode = query.length > 0;
        window.HomeGrid.searchQuery = query;
        window.HomeGrid.currentPage = 1;

        if (query.length > 0) {
            window.HomeSearchDropdown.saveRecent(query);
            if (carousel) carousel.style.display = 'none';
            if (filters) filters.style.display = 'none';
            if (sectionTitle) sectionTitle.textContent = `Resultados para "${query}"`;
        } else {
            if (carousel) carousel.style.display = 'flex';
            if (filters) filters.style.display = 'flex';
            if (sectionTitle) sectionTitle.textContent = 'Mods';
        }

        await window.HomeGrid.renderGrid(true);
    }
};
