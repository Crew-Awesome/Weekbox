import { gameBananaApi } from '../../../api/gamebanana.js';
import { gridState } from './gridState.js';
import { createCard } from './cardBuilder.js';

export const gridRender = {
    async renderGrid(isInitial = false) {
        if (gridState.isLoading) {
            if (isInitial) {
                gridState.renderVersion++;
                gridState.pendingInitialRender = true;
            }
            return;
        }
        
        const grid = document.getElementById('popular-grid');
        if (!grid) return;
        const renderVersion = ++gridState.renderVersion;
        
        if (isInitial) {
            gridState.currentPage = 1;
            gridState.hasMore = true;
            grid.replaceChildren();
            grid.classList.remove('grid-empty', 'grid-error');
        }
        
        gridState.isLoading = true;
        if (!isInitial) this.showLoadMoreIndicator(grid);
        
        try {
            const mods = gridState.isSearchMode
                ? await gameBananaApi.searchMods(gridState.searchQuery, gridState.currentPage, 12)
                : await gameBananaApi.getGridMods(gridState.currentFilter, gridState.currentPage, gridState.currentCategoryId);
                
            if (renderVersion !== gridState.renderVersion) return;
            
            if (mods.length === 0 && isInitial) {
                grid.textContent = 'No mods found.';
                grid.classList.add('grid-empty');
                return;
            }
            
            grid.classList.remove('grid-empty', 'grid-error');
            if (mods.length === 0) {
                gridState.hasMore = false;
                return;
            }
            
            mods.forEach((mod, index) => grid.appendChild(createCard(mod, index)));
            if (mods.length < 12) gridState.hasMore = false;
            
        } catch {
            if (isInitial && renderVersion === gridState.renderVersion) {
                grid.textContent = 'Failed to load mods.';
                grid.classList.add('grid-error');
            }
        } finally {
            this.hideLoadMoreIndicator(grid);
            gridState.isLoading = false;
            if (gridState.pendingInitialRender) {
                gridState.pendingInitialRender = false;
                this.renderGrid(true);
            }
        }
    },
    
    showLoadMoreIndicator(grid) {
        if (grid.querySelector('.chunk-loader')) return;
        const loader = document.createElement('div');
        loader.className = 'chunk-loader';
        loader.setAttribute('role', 'status');
        loader.setAttribute('aria-live', 'polite');
        loader.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Loading more mods...</span>';
        grid.appendChild(loader);
    },
    
    hideLoadMoreIndicator(grid) {
        grid?.querySelector('.chunk-loader')?.remove();
    }
};
