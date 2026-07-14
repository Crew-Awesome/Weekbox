import { appEvents } from '../../core/events.js';
import { getSelectedEngine } from '../../core/state.js';
import { fetchAndRenderReleaseNotes } from './releaseNotes.js';

export const enginesView = {
    init() {
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
        
        this.setupCustomDropdown(engine);
        this.updateButtonState();
    },

    destroy() {
        if (this.outsideClickHandler) document.removeEventListener('click', this.outsideClickHandler);
    },

    async updateButtonState() {
        const launchBtn = document.getElementById('launch-engine-btn');
        const dlUI = document.getElementById('download-ui');
        if (!launchBtn) return;
        
        // Deshabilitamos el botón y ocultamos la interfaz de descarga permanentemente
        launchBtn.textContent = "Unavailable";
        launchBtn.disabled = true;
        if (dlUI) dlUI.style.display = 'none';
    },

    getTargetLink(versionData) {
        const os = window.NL_OS;
        const arch = window.NL_ARCH;
        
        if (os === 'Windows') {
            if (arch === 'x64') {
                return versionData.win64 || versionData.win || null;
            } else {
                return versionData.win32 || versionData.win || null;
            }
        } else if (os === 'Linux') {
            return versionData.lin || null;
        } else if (os === 'Darwin') {
            return versionData.mac || null;
        }
        return null;
    },

    extractVersionFallback(url) {
        if (!url) return "Unknown";
        const githubMatch = url.match(/\/download\/(v?([^\/]+))\//);
        if (githubMatch && githubMatch[2]) return githubMatch[2];
        
        const genericMatch = url.match(/(?:v|-)?(\d+\.\d+(?:\.\d+)?(?:[a-zA-Z0-9-]*))/i);
        if (genericMatch && genericMatch[1]) return genericMatch[1];
        
        return "Unknown";
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
            if (!v.version || v.version === "Unknown") {
                const sampleLink = v.win64 || v.win32 || v.win || v.lin || v.mac || Object.values(v).find(val => typeof val === 'string' && val.startsWith('http')) || "";
                v.version = this.extractVersionFallback(sampleLink);
            }
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
                
                fetchAndRenderReleaseNotes(v, this.getTargetLink(v));
                this.updateButtonState(); 
            });
            optionsContainer.appendChild(optionDiv);
        });
        
        this.currentVersion = engine.versions[0].version;
        selectedText.textContent = this.currentVersion;
        badge.textContent = `Version: ${this.currentVersion}`;
        
        fetchAndRenderReleaseNotes(engine.versions[0], this.getTargetLink(engine.versions[0]));
        this.updateButtonState();
        
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
        });
        
        this.outsideClickHandler = (e) => {
            if (!dropdown.contains(e.target)) dropdown.classList.remove('open');
        };
        document.addEventListener('click', this.outsideClickHandler);
    }
};

export function registerEnginesView() {
    appEvents.addEventListener('view:loaded', (event) => {
        if (event.detail === 'engines') enginesView.init();
        else enginesView.destroy();
    });
}