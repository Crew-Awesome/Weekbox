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

        try {
            const response = await fetch(filePath);
            if (response.ok) {
                const htmlText = await response.text();
                
                /* Parse the fetched HTML securely without using innerHTML */
                const parser = new DOMParser();
                const doc = parser.parseFromString(htmlText, 'text/html');
                
                /* Transfer nodes safely */
                while (doc.body.firstChild) {
                    this.container.appendChild(doc.body.firstChild);
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
     * Currently a stub for future interactivity.
     * @private
     */
    _bindEvents() {
        /* Intentionally left blank for future logic implementation */
    }
}
