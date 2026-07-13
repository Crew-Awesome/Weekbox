import { gameBananaApi } from '../../api/gamebanana.js';
import { modModal } from './modal/index.js';

export const homeGrid = {
    currentPage: 1,
    isLoading: false,
    isSearchMode: false,
    searchQuery: '',
    currentFilter: 'popular',
    currentCategoryId: null,
    hasMore: true,
    scrollHandler: null,
    filterClickHandler: null,
    outsideClickHandler: null,
    filterContainer: null,
    renderVersion: 0,
    pendingInitialRender: false,

    async init() {
        this.currentPage = 1;
        this.isSearchMode = false;
        this.hasMore = true;
        this.pendingInitialRender = false;
        this.setupFilters();
        await this.renderGrid(true);
        this.setupInfiniteScroll();
    },

    setupFilters() {
        this.removeFilters();

        const filters = document.getElementById('grid-filters');
        if (!filters) return;

        this.filterContainer = filters;
        this.filterClickHandler = event => {
            const typeButton = event.target.closest('.filter-type');
            if (typeButton) {
                this.selectTypeFilter(typeButton);
                return;
            }

            if (event.target.closest('#engine-filter-trigger')) {
                this.toggleCategoryDropdown();
                return;
            }

            const option = event.target.closest('#engine-filter-options .custom-option');
            if (option) this.selectCategoryFilter(option);
        };
        this.outsideClickHandler = event => {
            const dropdown = document.getElementById('engine-filter-dropdown');
            if (dropdown && !dropdown.contains(event.target)) this.setCategoryDropdown(false);
        };

        filters.addEventListener('click', this.filterClickHandler);
        document.addEventListener('click', this.outsideClickHandler);
        this.syncCategoryFilter();
    },

    selectTypeFilter(button) {
        const filter = button.dataset.filter;
        if (!filter || filter === this.currentFilter) return;

        document.querySelectorAll('.pill-btn.filter-type').forEach(pill => {
            pill.classList.toggle('active', pill === button);
        });
        this.currentFilter = filter;
        this.renderGrid(true);
    },

    selectCategoryFilter(option) {
        const value = option.dataset.categoryId;
        const categoryId = value ? Number(value) : null;
        if (categoryId === this.currentCategoryId) {
            this.setCategoryDropdown(false);
            return;
        }

        this.currentCategoryId = categoryId;
        this.syncCategoryFilter();
        this.setCategoryDropdown(false);
        this.renderGrid(true);
    },

    syncCategoryFilter() {
        const dropdown = document.getElementById('engine-filter-dropdown');
        const selectedText = document.getElementById('engine-filter-selected');
        const selectedIcon = document.getElementById('engine-filter-icon');
        const options = [...document.querySelectorAll('#engine-filter-options .custom-option')];
        const selectedOption = options.find(option => {
            const value = option.dataset.categoryId;
            return (value ? Number(value) : null) === this.currentCategoryId;
        }) || options[0];

        if (!selectedOption) return;

        options.forEach(option => {
            const isSelected = option === selectedOption;
            option.classList.toggle('selected', isSelected);
            option.setAttribute('aria-selected', String(isSelected));
        });
        if (selectedText) selectedText.textContent = selectedOption.dataset.label;
        if (selectedIcon) {
            const icon = selectedOption.querySelector('.filter-engine-icon');
            selectedIcon.replaceChildren(...[...icon.childNodes].map(node => node.cloneNode(true)));
        }
        if (dropdown) dropdown.classList.remove('open');
    },

    toggleCategoryDropdown() {
        const dropdown = document.getElementById('engine-filter-dropdown');
        this.setCategoryDropdown(!dropdown?.classList.contains('open'));
    },

    setCategoryDropdown(isOpen) {
        const dropdown = document.getElementById('engine-filter-dropdown');
        const trigger = document.getElementById('engine-filter-trigger');
        dropdown?.classList.toggle('open', isOpen);
        trigger?.setAttribute('aria-expanded', String(isOpen));
    },

    async renderGrid(isInitial = false) {
        if (this.isLoading) {
            if (isInitial) {
                this.renderVersion++;
                this.pendingInitialRender = true;
            }
            return;
        }

        const grid = document.getElementById('popular-grid');
        if (!grid) return;

        const renderVersion = ++this.renderVersion;
        if (isInitial) {
            this.currentPage = 1;
            this.hasMore = true;
            grid.replaceChildren();
            grid.classList.remove('grid-empty', 'grid-error');
        }

        this.isLoading = true;
        if (!isInitial) this.showLoadMoreIndicator(grid);

        try {
            const mods = this.isSearchMode
                ? await gameBananaApi.searchMods(this.searchQuery, this.currentPage)
                : await gameBananaApi.getGridMods(this.currentFilter, this.currentPage, this.currentCategoryId);

            if (renderVersion !== this.renderVersion) return;

            if (mods.length === 0 && isInitial) {
                grid.textContent = 'No mods found.';
                grid.classList.add('grid-empty');
                return;
            }

            grid.classList.remove('grid-empty', 'grid-error');
            if (mods.length === 0) {
                this.hasMore = false;
                return;
            }

            mods.forEach((mod, index) => grid.appendChild(this.createCard(mod, index)));
            if (mods.length < 12) this.hasMore = false;
        } catch {
            if (isInitial && renderVersion === this.renderVersion) {
                grid.textContent = 'Failed to load mods.';
                grid.classList.add('grid-error');
            }
        } finally {
            this.hideLoadMoreIndicator(grid);
            this.isLoading = false;
            if (this.pendingInitialRender) {
                this.pendingInitialRender = false;
                this.renderGrid(true);
            }
        }
    },

    createCard(mod, index) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'mod-card mod-card-pending';
        card.style.setProperty('--card-index', index);

        const imageContainer = document.createElement('div');
        imageContainer.className = 'mod-image-container';
        const image = document.createElement('img');
        image.className = 'mod-image';
        image.src = mod.image;
        image.alt = '';
        image.loading = 'lazy';
        imageContainer.appendChild(image);

        const info = document.createElement('div');
        info.className = 'mod-info';
        const title = document.createElement('h3');
        title.className = 'mod-title';
        title.textContent = mod.title;
        const author = document.createElement('p');
        author.className = 'mod-author';
        author.textContent = `by ${mod.author}`;
        const stats = document.createElement('div');
        stats.className = 'mod-stats';
        [
            ['fa-regular fa-clock', mod.timeAgo],
            ['fa-solid fa-heart', Number(mod.likes).toLocaleString()],
            ['fa-solid fa-eye', Number(mod.views).toLocaleString()]
        ].forEach(([icon, value]) => {
            const stat = document.createElement('span');
            const iconElement = document.createElement('i');
            iconElement.className = icon;
            iconElement.setAttribute('aria-hidden', 'true');
            stat.append(iconElement, document.createTextNode(` ${value}`));
            stats.appendChild(stat);
        });

        info.append(title, author, stats);
        card.append(imageContainer, info);
        card.addEventListener('click', () => modModal.open(mod.id));
        requestAnimationFrame(() => requestAnimationFrame(() => {
            card.classList.remove('mod-card-pending');
            card.classList.add('mod-card-enter');
        }));
        card.addEventListener('animationend', event => {
            if (event.animationName === 'mod-card-fade-in') card.classList.remove('mod-card-enter');
        });
        return card;
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
    },

    setupInfiniteScroll() {
        const mainContent = document.getElementById('main-content');
        if (!mainContent) return;

        this.removeScroll();
        this.scrollHandler = () => {
            if (mainContent.scrollTop + mainContent.clientHeight >= mainContent.scrollHeight - 300
                && !this.isLoading && this.hasMore) {
                this.currentPage++;
                this.renderGrid(false);
            }
        };
        mainContent.addEventListener('scroll', this.scrollHandler);
    },

    removeScroll() {
        const mainContent = document.getElementById('main-content');
        if (mainContent && this.scrollHandler) mainContent.removeEventListener('scroll', this.scrollHandler);
        this.scrollHandler = null;
    },

    removeFilters() {
        this.filterContainer?.removeEventListener('click', this.filterClickHandler);
        if (this.outsideClickHandler) document.removeEventListener('click', this.outsideClickHandler);
        this.filterContainer = null;
        this.filterClickHandler = null;
        this.outsideClickHandler = null;
    },

    destroy() {
        this.removeScroll();
        this.removeFilters();
    }
};
