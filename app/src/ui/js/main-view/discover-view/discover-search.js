import { searchModsEngine } from '../../../../backend/api/searchEngine.js';

/**
 * Web Component representing the search bar in the Discover view.
 * Uses Light DOM to inherit global styles and avoid CSS encapsulation issues.
 * @extends HTMLElement
 */
export class SearchBar extends HTMLElement {
    /**
     * Initializes the SearchBar component.
     */
    constructor() {
        super();
    }

    /**
     * Invoked when the custom element is first connected to the document's DOM.
     * Fetches the HTML template securely and initializes event listeners.
     * @returns {Promise<void>}
     */
    async connectedCallback() {
        /**
         * Prevent double rendering if the element is moved within the DOM.
         */
        if (this.hasChildNodes()) return;
        
        try {
            const res = await fetch('src/ui/html/app-html/main-view/discover-view/discover-search-bar.html');
            if (res.ok) {
                const text = await res.text();
                
                /**
                 * Securely parse the HTML string using DOMParser to prevent XSS attacks.
                 * Avoids the use of innerHTML.
                 */
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');
                
                while (doc.body.firstChild) {
                    this.appendChild(doc.body.firstChild);
                }
                
                this.addEventListeners();
            }
        } catch (e) {
            console.error('Error loading search bar HTML', e);
        }
    }

    /**
     * Attaches click and keypress event listeners to the search input and button.
     * Dispatches a custom 'search' event when triggered.
     */
    addEventListeners() {
        const searchInput = this.querySelector('#discover-search-input');
        const searchBtn = this.querySelector('#discover-search-btn');

        if (!searchInput || !searchBtn) return;

        const performSearch = () => {
            const query = searchInput.value.trim();
            this.dispatchEvent(new CustomEvent('search', {
                detail: { query },
                bubbles: true,
                composed: true
            }));
        };

        searchBtn.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }

    /**
     * Updates the UI state of the search button to indicate a loading process.
     * @param {boolean} isSearching - True if a search is currently in progress.
     */
    setSearching(isSearching) {
        const btn = this.querySelector('#discover-search-btn');
        if (!btn) return;
        
        btn.disabled = isSearching;
        const span = btn.querySelector('span');
        if (span) span.textContent = isSearching ? 'Buscando...' : 'Buscar';
    }
}

if (!customElements.get('search-bar')) {
    customElements.define('search-bar', SearchBar);
}
