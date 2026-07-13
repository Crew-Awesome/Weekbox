import { gameBananaApi } from '../../api/gamebanana.js';
import { modModal } from './modal/index.js';

export const homeGrid = {
    currentPage: 1,
    isLoading: false,
    isSearchMode: false,
    searchQuery: "",
    currentFilter: "popular",
    currentEngineId: 29202,
    hasMore: true,
    scrollHandler: null,
    
    async init() {
        this.currentPage = 1;
        this.isSearchMode = false;
        this.hasMore = true;
        this.setupFilters();
        await this.renderGrid(true);
        this.setupInfiniteScroll();
    },
    
    setupFilters() {
        const pills = document.querySelectorAll('.pill-btn.filter-type');
        pills.forEach(pill => {
            pill.addEventListener('click', async (e) => {
                if (this.isLoading) return;
                
                pills.forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                
                this.currentFilter = e.target.getAttribute('data-filter');
                this.hasMore = true;
                await this.renderGrid(true);
            });
        });

        const dropdown = document.getElementById('engine-filter-dropdown');
        const trigger = document.getElementById('engine-filter-trigger');
        const options = document.querySelectorAll('#engine-filter-options .custom-option');
        const selectedText = document.getElementById('engine-filter-selected');
        const selectedIcon = document.getElementById('engine-filter-icon');

        if (trigger) {
            trigger.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdown.classList.toggle('open');
            });
        }

        options.forEach(opt => {
            opt.addEventListener('click', async (e) => {
                e.stopPropagation();
                if (this.isLoading) return;

                const id = parseInt(opt.getAttribute('data-id'));
                const name = opt.textContent.trim();
                const iconSrc = opt.querySelector('img').src;

                this.currentEngineId = id;
                selectedText.textContent = name;
                selectedIcon.src = iconSrc;

                options.forEach(o => o.classList.remove('selected'));
                opt.classList.add('selected');
                dropdown.classList.remove('open');

                this.hasMore = true;
                await this.renderGrid(true);
            });
        });

        document.addEventListener('click', (e) => {
            if (dropdown && !dropdown.contains(e.target)) dropdown.classList.remove('open');
        });
    },
    
    async renderGrid(isInitial = false) {
        if (this.isLoading) return;
        
        const grid = document.getElementById('popular-grid');
        if (!grid) return;
        
        if (isInitial) { 
            this.currentPage = 1; 
            this.hasMore = true; 
            grid.innerHTML = ''; 
        }
        
        this.isLoading = true;
        
        try {
            let mods = this.isSearchMode
                ? await gameBananaApi.searchMods(this.searchQuery, this.currentPage)
                : await gameBananaApi.getGridMods(this.currentFilter, this.currentPage, this.currentEngineId);
                
            if (mods.length === 0 && isInitial) {
                grid.innerHTML = `<p style="color: var(--text-muted); padding: 16px;">No mods found.</p>`;
                this.isLoading = false;
                return;
            }
            
            if (mods.length === 0) {
                this.hasMore = false;
                return;
            }
            
            mods.forEach(mod => {
                const card = document.createElement('div');
                card.className = 'mod-card';
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
            });
            
            if (mods.length < 12) this.hasMore = false;
            
        } catch (error) {
            if (isInitial) grid.innerHTML = `<p style="color: red; padding: 16px;">Failed to load mods.</p>`;
        } finally {
            this.isLoading = false;
        }
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