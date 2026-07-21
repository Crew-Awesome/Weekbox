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

                // Make the entire top bar draggable via Neutralino's native API
                try {
                    await Neutralino.window.setDraggableRegion('client-top-bar');
                    
                    // Prevent interactive elements from triggering the window drag
                    const interactiveElements = this.container.querySelectorAll('button, .client-brand, .client-nav-links');
                    const stopDrag = (e) => e.stopPropagation();
                    interactiveElements.forEach(el => {
                        el.addEventListener('mousedown', stopDrag);
                        el.addEventListener('pointerdown', stopDrag);
                    });
                } catch (err) {
                    console.error('Error setting draggable region:', err);
                }
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
        const iconMaximize = this.container.querySelector('#client-icon-maximize');
        const iconRestore = this.container.querySelector('#client-icon-restore');

        const updateMaximizeIcon = async () => {
            if (!iconMaximize || !iconRestore) return;
            try {
                const isMaximized = await Neutralino.window.isMaximized();
                if (isMaximized) {
                    iconMaximize.style.display = 'none';
                    iconRestore.style.display = 'block';
                } else {
                    iconMaximize.style.display = 'block';
                    iconRestore.style.display = 'none';
                }
            } catch (e) {}
        };

        if (btnMaximize) {
            btnMaximize.addEventListener('click', async () => {
                try {
                    const isMaximized = await Neutralino.window.isMaximized();
                    if (isMaximized) {
                        await Neutralino.window.unmaximize();
                    } else {
                        await Neutralino.window.maximize();
                    }
                    setTimeout(updateMaximizeIcon, 100);
                } catch (err) {
                    // Fallback
                    try { await Neutralino.window.maximize(); } catch (e) {}
                }
            });
        }

        window.addEventListener('resize', updateMaximizeIcon);
        updateMaximizeIcon();

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
