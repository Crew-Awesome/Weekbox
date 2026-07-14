// ui/engines/index.js
import { appEvents } from '../../core/events.js';
import { getSelectedEngine } from '../../core/state.js';
import { engineDropdown } from './dropdown.js';
import { getTargetLink } from './utils.js';
import { FS } from '../../utils/filesystem.js';
import { downloadEngine } from './downloadEngine.js';

export const enginesView = {
    async init() {
        const engine = getSelectedEngine();
        if (!engine) return;
        
        this.currentEngine = engine;
        document.getElementById('engine-display-title').textContent = engine.meta.name;
        
        const bottomIcon = document.getElementById('engine-bottom-icon');
        if (engine.meta.icon) {
            bottomIcon.src = `assets/icons/${engine.meta.icon}`;
            bottomIcon.style.display = 'block';
        } else {
            bottomIcon.style.display = 'none';
        }
        
        if (!FS.isInitialized) await FS.init();

        engineDropdown.setup(engine, (version) => {
            this.currentVersion = version;
            this.updateButtonState();
        });
    },
    
    destroy() {
        engineDropdown.destroy();
    },
    
    async updateButtonState() {
        const launchBtn = document.getElementById('launch-engine-btn');
        const dlUI = document.getElementById('download-ui');
        const dlText = document.getElementById('dl-text');
        const dlFill = document.getElementById('dl-fill');

        if (!launchBtn) return;
        
        const versionData = this.currentEngine.versions.find(v => v.version === this.currentVersion);
        
        if (!versionData) {
            launchBtn.textContent = "Unavailable";
            launchBtn.disabled = true;
            if (dlUI) dlUI.style.display = 'none';
            return;
        }

        const isInstalled = await FS.isEngineInstalled(this.currentEngine.id, this.currentVersion);

        const newBtn = launchBtn.cloneNode(true);
        launchBtn.parentNode.replaceChild(newBtn, launchBtn);
        const activeBtn = document.getElementById('launch-engine-btn');

        if (isInstalled) {
            activeBtn.textContent = "Launch";
            activeBtn.disabled = false;
            if (dlUI) dlUI.style.display = 'none';
            
            activeBtn.addEventListener('click', async () => {
                activeBtn.disabled = true;
                activeBtn.textContent = "Running...";
                await FS.runEngine(this.currentEngine.id, this.currentVersion, (state) => {
                    if (state === 'completed' || state === 'error' || state === 'not_found') {
                        activeBtn.disabled = false;
                        activeBtn.textContent = "Launch";
                    }
                });
            });
            
        } else {
            const downloadUrl = getTargetLink(versionData);
            
            if (!downloadUrl) {
                activeBtn.textContent = "Unsupported OS";
                activeBtn.disabled = true;
                if (dlUI) dlUI.style.display = 'none';
                return;
            }

            activeBtn.textContent = "Download";
            activeBtn.disabled = false;
            
            activeBtn.addEventListener('click', async () => {
                activeBtn.disabled = true;
                if (dlUI) {
                    dlUI.style.display = 'flex';
                    dlText.textContent = "Iniciando descarga...";
                    dlFill.style.width = "0%";
                }

                // Asegúrate de enviar solo: engineId, version, url, y la función de progreso
                const success = await downloadEngine.install(
                    this.currentEngine.id, 
                    this.currentVersion, 
                    downloadUrl, 
                    (progressInfo) => {
                        if (dlText) dlText.textContent = progressInfo.status;
                        if (dlFill) dlFill.style.width = `${progressInfo.progress}%`;
                    }
                );

                if (success) {
                    if (dlUI) dlUI.style.display = 'none';
                    this.updateButtonState(); 
                } else {
                    if (dlText) dlText.textContent = "Descarga fallida";
                    activeBtn.disabled = false;
                    activeBtn.textContent = "Retry Download";
                }
            });
        }
    }
};

export function registerEnginesView() {
    appEvents.addEventListener('view:loaded', (event) => {
        if (event.detail === 'engines') enginesView.init();
        else enginesView.destroy();
    });
}