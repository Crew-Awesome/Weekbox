import { centerWindow, ensureTmpDirectory, readStoredWindowDimensions, writeStoredWindowDimensions } from './windowSize.js';
import { initModsLibrary, startLibraryWatcher } from '../../utils/fileSystem/mods-library.js';
import { initCircleLoad, updateCircleProgress } from '../../../ui/utils/components/circleLoad/circleLoad.js';
import { ClientController } from '../../../ui/js/client/client.js';

/**
 * Loads HTML content into the main app container.
 * @param {string} path - The relative path to the HTML file to load.
 */
async function loadContent(path) {
    const app = document.getElementById('app');
    if (!app) return;
    try {
        const response = await fetch(path);
        app.innerHTML = await response.text();
    } catch (e) {
        app.innerHTML = '<div style="padding:24px;color:#fff;">Error</div>';
    }
}

/**
 * Waits for the DOM and essential resources (like fonts) to be fully loaded.
 */
async function waitForResources() {
    updateCircleProgress(30);
    await document.fonts.ready;
    updateCircleProgress(50);
    if (document.readyState === 'complete') return;
    return new Promise(resolve => window.addEventListener('load', resolve, { once: true }));
}

/**
 * Scans the provided container for all image elements and returns a promise that
 * resolves when all images have either successfully loaded or failed.
 * @param {HTMLElement} container - The DOM container to scan for images.
 * @returns {Promise<void>} Resolves when all images are processed.
 */
async function waitForImagesToLoad(container) {
    const images = Array.from(container.querySelectorAll('img'));
    if (!images.length) return;
    
    const promises = images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
            img.onload = resolve;
            img.onerror = resolve;
        });
    });
    await Promise.all(promises);
}

/**
 * Initializes the main window logic, managing the splash screen lifecycle,
 * background loading of the main application, window resizing, and smooth fade transitions.
 */
export function initWindowLogic() {
    let resizeTimeout;
    let isAutoResizing = false;

    Neutralino.events.on('ready', async () => {
        isAutoResizing = true;
        
        const app = document.getElementById('app');
        if (!app) return;
        
        // Setup Splash Screen Layer
        const splashContainer = document.createElement('div');
        splashContainer.id = 'splash-container';
        splashContainer.style.position = 'absolute';
        splashContainer.style.top = '0';
        splashContainer.style.left = '0';
        splashContainer.style.width = '100%';
        splashContainer.style.height = '100%';
        splashContainer.style.zIndex = '9999';
        splashContainer.style.backgroundColor = 'var(--md-sys-color-background, #121212)';
        
        // Setup Main App Layer (Invisible at startup)
        const mainContainer = document.createElement('div');
        mainContainer.id = 'main-container';
        mainContainer.style.position = 'absolute';
        mainContainer.style.top = '0';
        mainContainer.style.left = '0';
        mainContainer.style.width = '100%';
        mainContainer.style.height = '100%';
        mainContainer.style.opacity = '0';
        mainContainer.style.pointerEvents = 'none';
        
        app.appendChild(mainContainer);
        app.appendChild(splashContainer);
        
        // Load Splash Screen first
        const splashResponse = await fetch('src/ui/html/setupWindow.html');
        splashContainer.innerHTML = await splashResponse.text();
        initCircleLoad('#splash-container .md3-component-circle-load', splashContainer);
        
        const setSplashText = (text) => {
            const el = document.getElementById('setup-window-progress-text');
            if (el) el.textContent = text;
        };
        
        setSplashText('Configuring window...');
        
        updateCircleProgress(10);
        await Neutralino.window.setSize({ width: 400, height: 600 });
        await centerWindow(400, 600);
        await Neutralino.window.show();
        
        setSplashText('Setting up temporary directories...');
        await ensureTmpDirectory();
        
        setSplashText('Initializing mods library...');
        await initModsLibrary();
        startLibraryWatcher();
        
        setSplashText('Loading user interface...');
        
        // Load Main App in the background
        const appResponse = await fetch('src/ui/html/app.html');
        mainContainer.innerHTML = await appResponse.text();
        
        setSplashText('Waiting for core resources...');
        updateCircleProgress(30);
        await waitForResources();
        
        setSplashText('Starting layout and modules...');
        // Initialize Client Top Bar
        const clientBar = new ClientController();
        await clientBar.init(); 
        
        updateCircleProgress(60);
        
        setSplashText('Downloading cover images...');
        // Wait for all newly injected images (like carousel posters) to actually download
        await waitForImagesToLoad(mainContainer);
        
        updateCircleProgress(90);
        setSplashText('Finishing up...');
        
        // Brief pause to allow the progress circle animation to gracefully reach 100%
        await new Promise(resolve => setTimeout(resolve, 800));
        updateCircleProgress(100);
        setSplashText('Ready!');
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // Resize to full window dimensions
        let [X, Y] = [1280, 720];
        const stored = await readStoredWindowDimensions();
        if (stored) {
            X = stored.width;
            Y = stored.height;
            
            const currentDpi = window.devicePixelRatio || 1;
            const savedDpi = stored.dpi || currentDpi;
            
            if (currentDpi !== savedDpi) {
                const ratio = currentDpi / savedDpi;
                X = Math.round(X * ratio);
                Y = Math.round(Y * ratio);
            }
        }
        
        await Neutralino.window.setSize({ width: X, height: Y });
        
        if (stored && typeof stored.x === 'number' && typeof stored.y === 'number') {
            await Neutralino.window.move(stored.x, stored.y);
        } else {
            await centerWindow(X, Y);
        }
        
        // Prepare main app for interaction
        mainContainer.style.opacity = '1';
        mainContainer.style.pointerEvents = 'auto';
        
        // Wait 1200ms before fading out
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Force a layout reflow before applying the opacity transition to ensure it animates smoothly
        splashContainer.style.transition = 'opacity 0.6s ease';
        void splashContainer.offsetWidth; 
        
        // Fade out Splash
        splashContainer.style.opacity = '0';
        
        setTimeout(() => {
            splashContainer.remove();
            
            // Clean up temporary DOM wrappers
            while(mainContainer.firstChild) {
                app.appendChild(mainContainer.firstChild);
            }
            mainContainer.remove();
            
            isAutoResizing = false;
        }, 600);
    });

    window.addEventListener('resize', () => {
        if (isAutoResizing) return;
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(async () => {
            try {
                const size = await Neutralino.window.getSize();
                const pos = await Neutralino.window.getPosition();
                await writeStoredWindowDimensions({ 
                    width: size.width, 
                    height: size.height,
                    x: pos.x,
                    y: pos.y,
                    dpi: window.devicePixelRatio || 1
                });
            } catch (e) {
                console.error(e);
            }
        }, 500);
    });

    Neutralino.events.on('windowClose', async () => {
        try {
            const size = await Neutralino.window.getSize();
            const pos = await Neutralino.window.getPosition();
            await writeStoredWindowDimensions({ 
                width: size.width, 
                height: size.height,
                x: pos.x,
                y: pos.y,
                dpi: window.devicePixelRatio || 1
            });
        } catch (e) {}
        Neutralino.app.exit();
    });
}