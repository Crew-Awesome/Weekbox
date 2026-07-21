/**
 * AppRouter handles dynamically injecting HTML views into the main content area.
 * It strictly uses DOMParser to avoid innerHTML, ensuring script safety and structure integrity.
 */
export class AppRouter {
    constructor() {
        this.mainContent = document.querySelector('.main-content');
        
        // Listen for viewChange events dispatched by the Header or Client
        document.addEventListener('viewChange', this.handleViewChange.bind(this));
    }

    async init() {
        console.log('AppRouter initialized.');
    }

    /**
     * Handles the viewChange event to load the specified target.
     * @param {CustomEvent} e 
     */
    async handleViewChange(e) {
        const target = e.detail?.target;
        if (!target) return;

        const path = this.resolvePath(target);
        if (path) {
            await this.loadView(path);
        }
    }

    /**
     * Resolves a view target name to its HTML file path.
     * @param {string} target 
     * @returns {string|null}
     */
    resolvePath(target) {
        const routes = {
            'browse': 'src/ui/html/app-html/home/browse/browse.html',
            // Add more routes here as needed (e.g., 'installed', 'downloads')
        };
        return routes[target.toLowerCase()] || null;
    }

    /**
     * Fetches and injects the view HTML, then dynamically imports its JS module.
     * @param {string} path 
     */
    async loadView(path) {
        if (!this.mainContent) return;

        try {
            const response = await fetch(path);
            if (!response.ok) throw new Error(`Failed to load view: ${path}`);

            const htmlString = await response.text();
            
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');

            // Clear current main content safely
            while (this.mainContent.firstChild) {
                this.mainContent.removeChild(this.mainContent.firstChild);
            }

            // Append new nodes securely
            while (doc.body.firstChild) {
                this.mainContent.appendChild(doc.body.firstChild);
            }

            // Load and execute corresponding JavaScript module dynamically
            await this.loadViewScript(path);

        } catch (error) {
            console.error('AppRouter Error:', error);
            // Optionally clear or show error state
            while (this.mainContent.firstChild) {
                this.mainContent.removeChild(this.mainContent.firstChild);
            }
        }
    }

    /**
     * Dynamically imports the JS module matching the HTML file path.
     * Assumes JS is located in the corresponding src/ui/js/ folder hierarchy.
     * @param {string} htmlPath 
     */
    async loadViewScript(htmlPath) {
        try {
            // Convert path like 'src/ui/html/app-html/home/browse.html' 
            // to './home/browse.js' because this file is in 'src/ui/js/'
            const relativePath = htmlPath
                .replace('src/ui/html/app-html/', './')
                .replace('.html', '.js');

            const module = await import(relativePath);
            
            // Call the exported init() function if it exists
            if (module && typeof module.init === 'function') {
                await module.init();
            }
        } catch (e) {
            // It's normal for some views to not have a JS module
            console.e(`No JS module found for ${htmlPath} or failed to init:`, e);
        }
    }
}
