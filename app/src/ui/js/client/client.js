/**
 * ClientController handles the loading and initialization of the 
 * top client bar within the main application layout.
 */
export class ClientController {
    /**
     * Creates an instance of ClientController.
     * @param {string} [containerSelector='#client-container'] - The DOM selector for the container element.
     */
    constructor(containerSelector = '#client-container') {
        this.container = document.querySelector(containerSelector);
    }

    /**
     * Initializes the client top bar by fetching its HTML and injecting it.
     * @returns {Promise<void>} Resolves when initialization is complete.
     */
    async init() {
        if (!this.container) {
            console.error('Client container not found in DOM.');
            return;
        }

        try {
            const response = await fetch('src/ui/html/app-html/client/client.html');
            if (response.ok) {
                const html = await response.text();
                this.container.innerHTML = html;
                this._bindEvents();
            } else {
                console.error(`Failed to load client HTML. Status: ${response.status}`);
            }
        } catch (error) {
            console.error('Error fetching client HTML:', error);
        }
    }

    /**
     * Binds events to the interactive elements within the client HTML.
     * @private
     */
    _bindEvents() {
        // Window Controls
        const btnMinimize = this.container.querySelector('#client-btn-minimize');
        if (btnMinimize) {
            btnMinimize.addEventListener('click', async () => {
                try {
                    await Neutralino.window.minimize();
                } catch (err) {
                    console.error('Error minimizing window:', err);
                }
            });
        }

        const btnMaximize = this.container.querySelector('#client-btn-maximize');
        if (btnMaximize) {
            btnMaximize.addEventListener('click', async () => {
                try {
                    const isMaximized = await Neutralino.window.isMaximized();
                    if (isMaximized) {
                        await Neutralino.window.unmaximize();
                    } else {
                        await Neutralino.window.maximize();
                    }
                } catch (err) {
                    // Fallback
                    try { await Neutralino.window.maximize(); } catch (e) {}
                }
            });
        }

        const btnClose = this.container.querySelector('#client-btn-close');
        if (btnClose) {
            btnClose.addEventListener('click', async () => {
                try {
                    await Neutralino.app.exit();
                } catch (err) {
                    console.error('Error closing app:', err);
                }
            });
        }

        // Navigation (Placeholders for routing logic)
        const btnBack = this.container.querySelector('#client-btn-back');
        if (btnBack) {
            btnBack.addEventListener('click', () => {
                console.log('Back clicked');
            });
        }

        const btnForward = this.container.querySelector('#client-btn-forward');
        if (btnForward) {
            btnForward.addEventListener('click', () => {
                console.log('Forward clicked');
            });
        }
    }
}
