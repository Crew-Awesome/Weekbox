window.HomeSearchDropdown = {
    recentSearches: [],
    maxRecent: 5,
    fetchTimeout: null,
    
    init() {
        this.loadRecent();
        this.input = document.getElementById('mod-search-input');
        this.dropdown = document.getElementById('search-dropdown');
        if(!this.input || !this.dropdown) return;

        this.input.addEventListener('focus', () => this.showDropdown());
        this.input.addEventListener('input', () => this.updateDropdown());
        
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.hideDropdown();
            }
        });
    },
    
    loadRecent() {
        try {
            const saved = localStorage.getItem('genesis_recent_searches');
            this.recentSearches = saved ? JSON.parse(saved) : [];
        } catch(e) { this.recentSearches = []; }
    },
    
    saveRecent(query) {
        if(!query) return;
        this.recentSearches = this.recentSearches.filter(q => q.toLowerCase() !== query.toLowerCase());
        this.recentSearches.unshift(query);
        if(this.recentSearches.length > this.maxRecent) this.recentSearches.pop();
        localStorage.setItem('genesis_recent_searches', JSON.stringify(this.recentSearches));
    },
    
    showDropdown() {
        this.updateDropdown();
        this.dropdown.style.display = 'flex';
    },
    
    hideDropdown() {
        this.dropdown.style.display = 'none';
    },
    
    async updateDropdown() {
        const query = this.input.value.trim().toLowerCase();
        this.dropdown.innerHTML = '';
        
        let filteredRecent = this.recentSearches;
        if(query) {
            filteredRecent = this.recentSearches.filter(q => q.toLowerCase().includes(query));
        }
        
        if(filteredRecent.length > 0) {
            this.renderSection('Búsquedas recientes', filteredRecent, 'fa-clock-rotate-left');
        }

        if(query.length > 2) {
            clearTimeout(this.fetchTimeout);
            
            const relatedSection = document.createElement('div');
            relatedSection.className = 'dropdown-section';
            relatedSection.innerHTML = `<div class="dropdown-title">Relacionadas</div><div class="dropdown-item" style="cursor:default;"><i class="fa-solid fa-spinner fa-spin"></i> Cargando...</div>`;
            this.dropdown.appendChild(relatedSection);

            this.fetchTimeout = setTimeout(async () => {
                const related = await this.fetchRelated(query);
                if(related.length > 0) {
                    relatedSection.innerHTML = `<div class="dropdown-title">Sugerencias relacionadas</div>`;
                    related.forEach(title => {
                        const item = document.createElement('div');
                        item.className = 'dropdown-item';
                        item.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> <span>${title}</span>`;
                        item.addEventListener('click', () => {
                            this.input.value = title;
                            this.hideDropdown();
                            window.HomeSearch.executeSearch(title);
                        });
                        relatedSection.appendChild(item);
                    });
                } else {
                    relatedSection.style.display = 'none';
                }
            }, 500);
        }
        
        if(this.dropdown.innerHTML === '') {
            this.dropdown.innerHTML = `<div class="dropdown-item empty-state">No hay búsquedas recientes</div>`;
        }
    },
    
    renderSection(title, items, icon) {
        const section = document.createElement('div');
        section.className = 'dropdown-section';
        section.innerHTML = `<div class="dropdown-title">${title}</div>`;
        
        items.forEach(text => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${text}</span>`;
            item.addEventListener('click', () => {
                this.input.value = text;
                this.hideDropdown();
                window.HomeSearch.executeSearch(text);
            });
            section.appendChild(item);
        });
        
        this.dropdown.appendChild(section);
    },
    
    async fetchRelated(query) {
        try {
            const res = await window.GameBananaAPI.searchMods(query, 1, 3); 
            return res.map(m => m.title);
        } catch(e) { return []; }
    }
};
