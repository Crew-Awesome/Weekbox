import { gameBananaApi } from '../../api/gamebanana.js';
import { modModal } from './modal/index.js';

export const homeGrid = {
    currentPage: 1,
    isLoading: false,
    isSearchMode: false,
    searchQuery: "",
    currentFilter: "popular",
    hasMore: true,
    scrollHandler: null,
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
        const pills = document.querySelectorAll('.pill-btn');
        pills.forEach(pill => {
            pill.addEventListener('click', async (e) => {
                pills.forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.getAttribute('data-filter');
                this.hasMore = true;
                await this.renderGrid(true);
            });
        });
    },

    async renderGrid(isInitial = false) {
        if (this.isLoading) {
            if (isInitial) {
                this.renderVersion++;
                this.pendingInitialRender = true;
            }
            return;
        }
        const renderVersion = ++this.renderVersion;
        const grid = document.getElementById('popular-grid');
        if (!grid) return;
        if (isInitial) { this.currentPage = 1; this.hasMore = true; grid.innerHTML = ''; }

        this.isLoading = true;
        if (!isInitial) this.showLoadMoreIndicator(grid);

        try {
            let mods = this.isSearchMode
                ? await gameBananaApi.searchMods(this.searchQuery, this.currentPage)
                : await gameBananaApi.getGridMods(this.currentFilter, this.currentPage);

            if (renderVersion !== this.renderVersion) return;

            if (mods.length === 0 && isInitial) {
                grid.innerHTML = `<p style="color: var(--text-muted); padding: 16px;">No mods found.</p>`;
                this.isLoading = false;
                return;
            }
            if (mods.length === 0) {
                this.hasMore = false;
                return;
            }

            mods.forEach((mod, index) => {
                const card = document.createElement('div');
                card.className = 'mod-card mod-card-pending';
                card.style.setProperty('--card-index', index);
                card.innerHTML = `
                    <div class="mod-image-container">
                        <img src="${mod.image}" class="mod-image">
                    </div>
                    <div class="mod-info">
                        <h3 class="mod-title">${mod.title}</h3>
                        <p class="mod-author">by ${mod.author}</p>
                        <div class="mod-stats">
                            <span><i class="fa-regular fa-clock"></i> ${mod.timeAgo}</span>
                            <span><i class="fa-solid fa-heart"></i> ${mod.likes.toLocaleString()}</span>
                            <span><i class="fa-solid fa-eye"></i> ${mod.views.toLocaleString()}</span>
                        </div>
                    </div>
                `;
                
                card.addEventListener('click', () => {
                    modModal.open(mod.id);
                });

                grid.appendChild(card);
                requestAnimationFrame(() => requestAnimationFrame(() => {
                    card.classList.remove('mod-card-pending');
                    card.classList.add('mod-card-enter');
                }));
                card.addEventListener('animationend', event => {
                    if (event.animationName === 'mod-card-fade-in') card.classList.remove('mod-card-enter');
                });
            });

            if (mods.length < 12) this.hasMore = false;
        } catch (error) {
            console.error("Error loading grid items:", error);
            if (isInitial) grid.innerHTML = `<p style="color: red; padding: 16px;">Failed to load mods.</p>`;
        } finally {
            this.hideLoadMoreIndicator(grid);
            this.isLoading = false;
            if (this.pendingInitialRender) {
                this.pendingInitialRender = false;
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
        loader.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i><span>Loading more mods...</span>';
        grid.appendChild(loader);
    },

    hideLoadMoreIndicator(grid) {
        grid?.querySelector('.chunk-loader')?.remove();
    },

    setupInfiniteScroll() {
        const mainContent = document.getElementById('main-content');
        this.scrollHandler = () => {
            if (mainContent.scrollTop + mainContent.clientHeight >= mainContent.scrollHeight - 300) {
                if (!this.isLoading && this.hasMore) {
                    this.currentPage++;
                    this.renderGrid(false);
                }
            }
        };
        mainContent.addEventListener('scroll', this.scrollHandler);
    },

    removeScroll() {
        const mainContent = document.getElementById('main-content');
        if (mainContent && this.scrollHandler) mainContent.removeEventListener('scroll', this.scrollHandler);
    }
};
