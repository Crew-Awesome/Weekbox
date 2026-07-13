import { storageBridge } from './storagePatch.js';
import { router } from './router.js';
import { registerHomeView } from '../ui/home/index.js';
import { registerEnginesView } from '../ui/engines/index.js';

async function startApp() {
    try {
        Neutralino.init();
        Neutralino.events.on('windowClose', () => Neutralino.app.exit());

        await storageBridge.init();
        registerHomeView();
        registerEnginesView();
        await router.init();
        console.log('WeekBox: modules loaded.');
    } catch (error) {
        console.error('Startup error:', error);
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.innerHTML = `<div style="padding: 24px; color: #ff4a4a;"><h2>Load error</h2><p>${error.message}</p></div>`;
        }
    }
}

startApp();
