import { searchModsEngine } from '../../../../backend/api/searchEngine.js';
import { renderModsGrid, loadDiscoverMods } from './discover-cards-mods.js';

export async function initSearchBar(container) {
    try {
        const res = await fetch('src/ui/html/app-html/main-view/discover-view/search-bar.html');
        if (res.ok) {
            const html = await res.text();
            
            // Insertar antes del grid de mods
            const gridContainer = container.querySelector('.discover-grid-container');
            if (gridContainer) {
                gridContainer.insertAdjacentHTML('beforebegin', html);
                
                const searchInput = container.querySelector('#discover-search-input');
                const searchBtn = container.querySelector('#discover-search-btn');
                
                const performSearch = async () => {
                    const query = searchInput.value.trim();
                    if (!query) {
                        // Cargar mods populares por defecto si la búsqueda está vacía
                        await loadDiscoverMods(container);
                        return;
                    }
                    
                    searchBtn.disabled = true;
                    searchBtn.querySelector('.md3-btn__label').textContent = 'Buscando...';
                    
                    const mods = await searchModsEngine(query);
                    renderModsGrid(container, mods);
                    
                    searchBtn.disabled = false;
                    searchBtn.querySelector('.md3-btn__label').textContent = 'Buscar';
                };
                
                searchBtn.addEventListener('click', performSearch);
                searchInput.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        performSearch();
                    }
                });
            }
        }
    } catch (e) {
        console.error('Error loading search bar', e);
    }
}
