import { EngineListController } from './engine-list.js';
import { MainButtonsController } from './main-buttons.js';
import { ResizeController } from './resize.js';

export class SidebarController {
    constructor(options = {}) {
        this.sidebarSelector = options.sidebarSelector || '#app-sidebar';
        this.resizerSelector = options.resizerSelector || '#app-sidebar-resizer';
        this.htmlPath = options.htmlPath || 'src/ui/html/app-html/sidebar/sidebar.html';
        this.enginesDataPath = options.enginesDataPath || 'src/backend/data/engines-router.json';
        this.engineTemplatePath = options.engineTemplatePath || 'src/ui/html/app-html/sidebar/button-engine.html';
        this.minWidth = options.minWidth || 150;
        this.maxWidth = options.maxWidth || 600;
        this.collapsedWidth = options.collapsedWidth || 70;
    }

    async init() {
        this.sidebar = document.querySelector(this.sidebarSelector);
        this.resizer = document.querySelector(this.resizerSelector);

        if (!this.sidebar || !this.resizer) return;

        await this.loadContent();
        
        const engineList = new EngineListController('#sidebar-engines-list', this.enginesDataPath, this.engineTemplatePath, this.sidebar);
        await engineList.init();

        const mainButtons = new MainButtonsController(this.sidebar);
        await mainButtons.init();

        const resizeController = new ResizeController(this.sidebar, this.resizer, {
            minWidth: this.minWidth,
            maxWidth: this.maxWidth,
            collapsedWidth: this.collapsedWidth,
            windowBreakpoint: 768
        });
        resizeController.init();
    }

    async loadContent() {
        try {
            const response = await fetch(this.htmlPath);
            if (response.ok) {
                const html = await response.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                
                while (doc.body.firstChild) {
                    this.sidebar.appendChild(doc.body.firstChild);
                }
            }
        } catch (error) {
            const err = document.createElement('div');
            err.style.padding = '20px';
            err.style.color = 'red';
            err.textContent = 'Error';
            this.sidebar.appendChild(err);
        }
    }
}