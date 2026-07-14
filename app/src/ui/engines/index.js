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
        const dlTextSizer = document.getElementById('dl-text-sizer');
        const dlActiveLayer = document.getElementById('dl-active-layer');
        const downloadActions = document.getElementById('engine-download-actions');

        if (!launchBtn) return;

        if (this.activeInstall) {
            launchBtn.disabled = true;
            return;
        }
        if (downloadActions) downloadActions.hidden = true;
        
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
                this.activeInstall = {
                    engineId: this.currentEngine.id,
                    version: this.currentVersion
                };
                this.setupDownloadActions(activeBtn, downloadActions);
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
                    dlUI.style.display = 'block';
                    const initialText = "0% - Starting download...";
                    if (dlText) dlText.textContent = initialText;
                    if (dlTextSizer) dlTextSizer.textContent = initialText;
                    if (dlActiveLayer) dlActiveLayer.style.clipPath = `inset(0 100% 0 0)`;
                }

                const success = await downloadEngine.install(
                    this.currentEngine.id, 
                    this.currentVersion, 
                    downloadUrl, 
                    (progressInfo) => {
                        const p = Math.floor(progressInfo.progress);
                        const progressText = `${p}% - ${progressInfo.status}`;
                        
                        if (dlText) dlText.textContent = progressText;
                        if (dlTextSizer) dlTextSizer.textContent = progressText;
                        
                        if (dlActiveLayer) {
                            dlActiveLayer.style.clipPath = `inset(0 ${100 - progressInfo.progress}% 0 0)`;
                        }
                    },
                    state => this.updateInstallState(state, activeBtn)
                );

                this.activeInstall = null;
                if (downloadActions) downloadActions.hidden = true;
                if (success) {
                    if (dlUI) dlUI.style.display = 'none';
                    this.updateButtonState(); 
                } else {
                    if (dlText) dlText.textContent = "0% - Download failed";
                    if (dlTextSizer) dlTextSizer.textContent = "0% - Download failed";
                    activeBtn.disabled = false;
                    activeBtn.textContent = "Retry Download";
                }
            });
        }
    },

    setupDownloadActions(activeBtn, downloadActions) {
        if (!downloadActions || !this.activeInstall) return;
        downloadActions.hidden = false;
        const pauseBtn = document.getElementById('pause-engine-download-btn');
        const cancelBtn = document.getElementById('cancel-engine-download-btn');
        const { engineId, version } = this.activeInstall;

        pauseBtn.onclick = async () => {
            if (pauseBtn.textContent === 'Pause') {
                await downloadEngine.pause(engineId, version);
            } else {
                await downloadEngine.resume(engineId, version);
            }
        };
        cancelBtn.onclick = async () => {
            cancelBtn.disabled = true;
            await downloadEngine.cancel(engineId, version);
        };
        activeBtn.textContent = 'Downloading...';
    },

    updateInstallState(state, activeBtn) {
        const pauseBtn = document.getElementById('pause-engine-download-btn');
        const cancelBtn = document.getElementById('cancel-engine-download-btn');

        if (state === 'paused') {
            activeBtn.textContent = 'Paused';
            if (pauseBtn) pauseBtn.textContent = 'Resume';
        } else if (state === 'downloading') {
            activeBtn.textContent = 'Downloading...';
            if (pauseBtn) pauseBtn.textContent = 'Pause';
        } else if (state === 'installing') {
            activeBtn.textContent = 'Installing...';
            if (pauseBtn) pauseBtn.disabled = true;
        } else if (state === 'cancelled') {
            activeBtn.textContent = 'Cancelled';
            if (pauseBtn) pauseBtn.disabled = true;
            if (cancelBtn) cancelBtn.disabled = true;
        }
    }
};

export function registerEnginesView() {
    appEvents.addEventListener('view:loaded', (event) => {
        if (event.detail === 'engines') enginesView.init();
        else enginesView.destroy();
    });
}
