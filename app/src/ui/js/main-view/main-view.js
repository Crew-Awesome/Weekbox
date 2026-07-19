export class MainViewController {
    constructor(containerSelector = '.app-main-content') {
        this.mainContent = document.querySelector(containerSelector);
    }

    clearView() {
        if (!this.mainContent) return;
        while (this.mainContent.firstChild) {
            this.mainContent.removeChild(this.mainContent.firstChild);
        }
    }

    async loadView(htmlPath, jsModulePath) {
        if (!this.mainContent) return;
        
        try {
            const response = await fetch(htmlPath);
            if (response.ok) {
                this.clearView();
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                while (doc.body.firstChild) {
                    this.mainContent.appendChild(doc.body.firstChild);
                }

                if (jsModulePath) {
                    const module = await import(jsModulePath);
                    if (module.init) {
                        module.init();
                    }
                }
            } else {
                console.error(`Error loading view. Status: ${response.status} for path ${htmlPath}`);
            }
        } catch (error) {
            console.error(`Fetch error while loading view from ${htmlPath}:`, error);
        }
    }
}