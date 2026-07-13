import { FS } from '../../utils/filesystem.js';

class GlobalDownloadToast {
    constructor() {
        this.el = null;
        this.currentView = 'engines';
        this.lastData = null;
        this.createUI();
        this.bindEvents();
    }
    
    createUI() {
        if (document.getElementById('global-dl-toast')) return;
        this.el = document.createElement('div');
        this.el.className = 'global-dl-toast';
        this.el.innerHTML = `
            <span class="toast-title" id="toast-title">Downloading Engine</span>
            <span class="toast-status" id="toast-status">0%</span>
        `;
        document.body.appendChild(this.el);
    }

    bindEvents() {
        FS.addEventListener('dl:update', (e) => this.handleUpdate(e.detail));
        
        window.addEventListener('view:loaded', (e) => {
            this.currentView = e.detail;
            this.checkVisibility();
        });
    }

    handleUpdate(data) {
        this.lastData = data;
        if (!data || data.state === 'finished' || data.state === 'cancelled' || data.state === 'error') {
            this.lastData = null;
        } else if (this.el) {
            document.getElementById('toast-title').textContent = `Downloading ${data.engineName}`;
            document.getElementById('toast-status').textContent = data.text;
        }
        this.checkVisibility();
    }

    checkVisibility() {
        if (!this.el) return;
        if (this.lastData && this.currentView !== 'engines') {
            this.el.classList.add('show');
        } else {
            this.el.classList.remove('show');
        }
    }
}

new GlobalDownloadToast();

const EnginesController = {
    init() {
        const engine = window.SelectedEngine;
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
        
        this.fsListener = (e) => this.handleProgress(e.detail);
        FS.addEventListener('dl:update', this.fsListener);

        this.setupCustomDropdown(engine);
        this.setupLaunchButton();
        this.setupDownloadActions();
        
        if (FS.activeDownload) this.handleProgress(FS.activeDownload);
    },

    destroy() {
        if (this.outsideClickHandler) document.removeEventListener('click', this.outsideClickHandler);
        if (this.fsListener) FS.removeEventListener('dl:update', this.fsListener);
    },

    handleProgress(dlData) {
        const launchBtn = document.getElementById('launch-engine-btn');
        const dlUI = document.getElementById('download-ui');
        const dlFill = document.getElementById('dl-fill');
        const dlText = document.getElementById('dl-text');
        const dlActions = document.getElementById('dl-actions');
        
        if (!dlData || dlData.state === 'finished' || dlData.state === 'cancelled' || dlData.state === 'error') {
            dlUI.style.display = 'none';
            this.updateButtonState();
            return;
        }

        if (dlData.engineId !== this.currentEngine.id) {
            dlUI.style.display = 'none';
            launchBtn.textContent = `Downloading ${dlData.engineName}...`;
            launchBtn.disabled = true;
            return;
        }

        launchBtn.textContent = "Downloading";
        launchBtn.disabled = true;
        dlUI.style.display = 'flex';
        
        dlText.textContent = dlData.text;
        dlFill.style.width = `${dlData.percent || 0}%`;

        if (dlData.state === 'extracting') {
            dlActions.style.display = 'none';
        } else {
            dlActions.style.display = 'flex';
        }
    },

    async updateButtonState() {
        if (FS.activeDownload) {
            this.handleProgress(FS.activeDownload);
            return;
        }

        const launchBtn = document.getElementById('launch-engine-btn');
        const dlUI = document.getElementById('download-ui');
        if (!launchBtn) return;
        
        launchBtn.textContent = "Checking...";
        launchBtn.disabled = true;
        dlUI.style.display = 'none';
        
        const isInstalled = await FS.isEngineInstalled(this.currentEngine.id, this.currentVersion);
        
        launchBtn.textContent = isInstalled ? "Play" : "Download";
        launchBtn.disabled = false;
    },

    setupDownloadActions() {
        const btnPause = document.getElementById('dl-pause');
        const btnCancel = document.getElementById('dl-cancel');

        btnPause.onclick = () => {
            const isPaused = FS.togglePause();
            btnPause.textContent = isPaused ? "Resume" : "Pause";
        };
        btnCancel.onclick = () => FS.cancelDownload();
    },

    setupLaunchButton() {
        const launchBtn = document.getElementById('launch-engine-btn');
        if (!launchBtn) return;

        launchBtn.onclick = async () => {
            const selectedVersion = this.currentVersion;
            const engine = this.currentEngine;
            
            const isInstalled = await FS.isEngineInstalled(engine.id, selectedVersion);
            
            if (isInstalled) {
                launchBtn.textContent = "Running";
                launchBtn.disabled = true;
                
                try {
                    await FS.runEngine(engine.id, selectedVersion, (state) => {
                        if (state === 'closed') {
                            launchBtn.textContent = "Play";
                            launchBtn.disabled = false;
                        }
                    });
                } catch (e) {
                    launchBtn.textContent = "Play";
                    launchBtn.disabled = false;
                }
                return;
            }
            
            const versionData = engine.versions.find(v => v.version === selectedVersion);
            if (!versionData) return;
            
            const os = window.NL_OS; 
            let targetLink = versionData.win || versionData.lin || versionData.mac;
            if (os === 'Windows' && versionData.win) targetLink = versionData.win;
            if (os === 'Linux' && versionData.lin) targetLink = versionData.lin;
            if (os === 'Darwin' && versionData.mac) targetLink = versionData.mac;
            
            if (!targetLink) return alert("OS not supported.");
            
            document.getElementById('dl-pause').textContent = "Pause";
            await FS.installEngine(engine.id, engine.meta.name, selectedVersion, targetLink);
        };
    },

    setupCustomDropdown(engine) {
        const dropdown = document.getElementById('engine-version-dropdown');
        let trigger = document.getElementById('engine-version-trigger');
        const optionsContainer = document.getElementById('engine-version-options');
        const badge = document.getElementById('engine-display-version');
        
        const newTrigger = trigger.cloneNode(true);
        trigger.parentNode.replaceChild(newTrigger, trigger);
        trigger = newTrigger; 
        
        const selectedText = document.getElementById('engine-version-selected');
        optionsContainer.innerHTML = '';
        
        if (engine.versions.length === 0) {
            selectedText.textContent = 'Unknown';
            badge.textContent = `Version: Unknown`;
            return;
        }
        
        engine.versions.forEach((v, index) => {
            const optionDiv = document.createElement('div');
            optionDiv.className = 'custom-option';
            if (index === 0) optionDiv.classList.add('selected'); 
            optionDiv.textContent = v.version;
            
            optionDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                this.currentVersion = v.version;
                selectedText.textContent = v.version;
                badge.textContent = `Version: ${v.version}`;
                document.querySelectorAll('.custom-option').forEach(opt => opt.classList.remove('selected'));
                optionDiv.classList.add('selected');
                dropdown.classList.remove('open');
                
                this.updateReleaseNotes(v);
                this.updateButtonState(); 
            });
            optionsContainer.appendChild(optionDiv);
        });
        
        this.currentVersion = engine.versions[0].version;
        selectedText.textContent = this.currentVersion;
        badge.textContent = `Version: ${this.currentVersion}`;
        
        this.updateReleaseNotes(engine.versions[0]);
        this.updateButtonState(); 
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        
        this.outsideClickHandler = (e) => {
            if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
        };
        document.addEventListener('click', this.outsideClickHandler);
    },
    
    async updateReleaseNotes(versionData) {
        const notesContainer = document.getElementById('engine-release-notes');
        if (!notesContainer) return;
        
        notesContainer.innerHTML = '<p style="color: var(--text-muted);">Fetching release notes...</p>';
        const link = versionData.win || versionData.lin || versionData.mac || "";
        const match = link.match(/github\.com\/([^\/]+)\/([^\/]+)\/releases\/download\/([^\/]+)\//);
        
        if (!match) {
            notesContainer.innerHTML = '<p><em>No release notes available.</em></p>';
            return;
        }
        
        try {
            const res = await fetch(`https://api.github.com/repos/${match[1]}/${match[2]}/releases/tags/${match[3]}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            
            let safeMarkdown = (data.body || "No description.")
                .replace(/</g, "&lt;").replace(/>/g, "&gt;"); 
            
            let html = safeMarkdown
                .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>')
                .replace(/\r\n|\n/g, '<br>');
                
            notesContainer.innerHTML = html;
        } catch (error) {
            notesContainer.innerHTML = '<p><em>Failed to fetch release notes.</em></p>';
        }
    }
};

window.EnginesApp = EnginesController;

window.addEventListener('view:loaded', (e) => {
    if (e.detail === 'engines') window.EnginesApp.init();
    else if (window.EnginesApp && window.EnginesApp.destroy) window.EnginesApp.destroy();
});
