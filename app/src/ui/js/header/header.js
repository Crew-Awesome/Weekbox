/**
 * Controller responsible for managing the application's secondary header.
 * Fetches the header HTML template and injects it into the DOM securely using DOMParser,
 * completely avoiding innerHTML to prevent XSS and reflow issues.
 */
export class HeaderController {
    /**
     * Initializes the HeaderController by locating the container.
     */
    constructor() {
        /** @type {HTMLElement | null} */
        this.container = document.getElementById('header-container');
    }

    /**
     * Fetches the template and injects it safely.
     * @returns {Promise<void>}
     */
    async init() {
        if (!this.container) {
            console.error('Header container not found in DOM.');
            return;
        }

        // Load default home header
        await this.loadHeader('home');

        // Listen for global navigation events from the ClientController
        document.addEventListener('navChange', async (event) => {
            const target = event.detail?.target;
            if (target) {
                await this.loadHeader(target);
            }
        });
    }

    /**
     * Loads the specific header HTML based on the navigation target.
     * @param {string} target - The navigation target (e.g., 'home', 'library', 'downloads', 'community').
     * @returns {Promise<void>}
     */
    async loadHeader(target) {
        if (!this.container) return;

        // Clear current header content securely
        while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
        }

        // 'community' explicitly has no secondary header
        if (target === 'community') {
            return;
        }

        const filePath = `src/ui/html/app-html/header/header-${target}.html`;
        const searchPath = `src/ui/html/app-html/header/header-search-bar.html`;

        try {
            const [response, searchResponse] = await Promise.all([
                fetch(filePath),
                fetch(searchPath)
            ]);

            if (response.ok && searchResponse.ok) {
                const htmlText = await response.text();
                const searchHtmlText = await searchResponse.text();
                
                /* Parse the fetched HTML securely without using innerHTML */
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                const searchDoc = parser.parseFromString(searchHtmlText, 'text/html');
                
                /* Transfer main header nodes safely */
                while (doc.body.firstChild) {
                    this.container.appendChild(doc.body.firstChild);
                }

                /* Append search bar to the right side of the newly injected header */
                const appHeader = this.container.querySelector('.app-header');
                if (appHeader) {
                    while (searchDoc.body.firstChild) {
                        appHeader.appendChild(searchDoc.body.firstChild);
                    }
                }
                
                this._bindEvents();
            } else {
                console.warn(`No header template found for target: ${target}`);
            }
        } catch (error) {
            console.error(`Error loading header for ${target}:`, error);
        }
    }

    /**
     * Binds necessary event listeners for the header elements.
     * @private
     */
    _bindEvents() {
        this._startPlaceholderRotation();
        this._bindTabEvents();
    }

    /**
     * Binds click events to the header tabs and triggers the initial view load.
     * @private
     */
    _bindTabEvents() {
        const tabs = this.container.querySelectorAll('.app-header__tab');
        if (!tabs || tabs.length === 0) return;

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active class from all
                tabs.forEach(t => t.classList.remove('app-header__tab--active'));
                // Add to clicked
                tab.classList.add('app-header__tab--active');
                
                // Dispatch view change for AppRouter to catch
                document.dispatchEvent(new CustomEvent('viewChange', {
                    detail: { target: tab.textContent.trim() }
                }));
            });
        });

        // Trigger the active tab immediately to load the default view for this header
        const activeTab = this.container.querySelector('.app-header__tab--active');
        if (activeTab) {
            document.dispatchEvent(new CustomEvent('viewChange', {
                detail: { target: activeTab.textContent.trim() }
            }));
        }
    }

    /**
     * Handles the smooth rotation of placeholder examples.
     * @private
     */
    _startPlaceholderRotation() {
        const placeholderSpan = this.container.querySelector('.placeholder-text');
        const input = this.container.querySelector('.app-header__search-input');
        if (!placeholderSpan || !input) return;

        const examples = [
            "Search for mods...",
            "Paste a Gamebanana link...",
            "Enter a Gamebanana ID..."
        ];

        let index = 0;

        if (this._placeholderInterval) {
            clearInterval(this._placeholderInterval);
        }

        this._placeholderInterval = setInterval(() => {
            // Fade out
            placeholderSpan.style.opacity = '0';
            
            setTimeout(() => {
                index = (index + 1) % examples.length;
                placeholderSpan.textContent = examples[index];
                // Fade in
                placeholderSpan.style.opacity = '1';
            }, 300); // Wait for CSS transition (0.3s)
        }, 4000); // 4 seconds per example

        // Hide custom placeholder when user types
        input.addEventListener('input', () => {
            if (input.value.length > 0) {
                placeholderSpan.style.display = 'none';
            } else {
                placeholderSpan.style.display = 'block';
            }
        });
    }
}
