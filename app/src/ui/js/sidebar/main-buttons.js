import { MainViewController } from '../main-view/main-view.js';

export class MainButtonsController {
    constructor(sidebar) {
        this.sidebar = sidebar;
        this.mainView = new MainViewController('.app-main-content');
    }

    async init() {
        if (!this.sidebar) return;

        const buttons = this.sidebar.querySelectorAll('.app-sidebar-button, .app-sidebar-config-button');
        
        buttons.forEach(button => {
            button.addEventListener('click', () => this.handleButtonClick(button, buttons));
        });
        
        const discoverBtn = Array.from(buttons).find(b => b.getAttribute('title') === 'Discover');
        if (discoverBtn) {
            await this.handleButtonClick(discoverBtn, buttons);
        }
    }

    async handleButtonClick(button, allButtons) {
        allButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        const action = button.getAttribute('title');
        
        if (action === 'Discover') {
            await this.mainView.loadView(
                'src/ui/html/app-html/main-view/discover-view/discover.html',
                './discover-view/discover.js'
            );
        } else if (action === 'Mod Manager') {
            console.log('Mod Manager View Clicked');
        } else if (action === 'Engine Manager') {
            console.log('Engine Manager View Clicked');
        } else if (action === 'Configuration') {
            console.log('Configuration View Clicked');
        } else if (button.hasAttribute('data-engine')) {
            this.mainView.clearView();
            const engineVersion = button.getAttribute('data-engine');
            console.log(`Engine View Clicked: ${engineVersion}`);
        }
    }
}