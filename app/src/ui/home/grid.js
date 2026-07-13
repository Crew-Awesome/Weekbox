window.HomeGrid = {
    currentPage: 1,
    isLoading: false,
    isSearchMode: false,
    searchQuery: "",
    currentFilter: "ripe", 
    scrollHandler: null,

    async init() {
        this.currentPage = 1;
        this.isSearchMode = false;
        this.setupFilters();
        await this.renderGrid(true);
        this.setupInfiniteScroll();
    },

    setupFilters() {
        const pills = document.querySelectorAll('.pill-btn');
        pills.forEach(pill => {
            pill.addEventListener('click', async (e) => {
                if (this.isLoading) return; 
                pills.forEach(p => p.classList.remove('active'));
                e.target.classList.add('active');
                this.currentFilter = e.target.getAttribute('data-filter');
                await this.renderGrid(true);
            });
        });
    },

    async renderGrid(isInitial = false) {
        if (this.isLoading) return;
        const grid = document.getElementById('popular-grid');
        if (!grid) return;
        if (isInitial) { this.currentPage = 1; grid.innerHTML = ''; }

        this.isLoading = true;

        try {
            let mods = this.isSearchMode
                ? await window.GameBananaAPI.searchMods(this.searchQuery, this.currentPage)
                : await window.GameBananaAPI.getGridMods(this.currentFilter, this.currentPage);

            if (mods.length === 0 && isInitial) {
                grid.innerHTML = `<p style="color: var(--text-muted); padding: 16px;">No mods found.</p>`;
                this.isLoading = false;
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
                    if(window.ModModal) window.ModModal.open(mod.id);
                });

                grid.appendChild(card);
            });
        } catch (error) {
            console.error("Error loading grid items:", error);
            if (isInitial) grid.innerHTML = `<p style="color: red; padding: 16px;">Failed to load mods.</p>`;
        } finally {
            this.isLoading = false;
        }
    },

    setupInfiniteScroll() {
        const mainContent = document.getElementById('main-content');
        this.scrollHandler = () => {
            if (mainContent.scrollTop + mainContent.clientHeight >= mainContent.scrollHeight - 300) {
                if (!this.isLoading) {
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