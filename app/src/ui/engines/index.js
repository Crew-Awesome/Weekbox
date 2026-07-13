import { FS } from '../../utils/filesystem.js';
import { appEvents } from '../../core/events.js';
import { getSelectedEngine } from '../../core/state.js';

/**
 * Class representing a global toast notification for tracking download progress.
 * It creates a floating UI element that persists across different views
 * to keep the user informed about the current download state.
 */
class GlobalDownloadToast {
    /**
     * Initializes the toast notification, sets the default view context,
     * and binds the necessary event listeners.
     */
    constructor() {
        this.el = null;
        this.currentView = 'engines';
        this.lastData = null;
        this.createUI();
        this.bindEvents();
    }
    
    /**
     * Constructs and injects the DOM elements for the toast notification
     * if they do not already exist in the document.
     */
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

    /**
     * Binds internal events to external application triggers, such as
     * file system updates and view changes.
     */
    bindEvents() {
        FS.addEventListener('dl:update', (e) => this.handleUpdate(e.detail));
        
        appEvents.addEventListener('view:loaded', (e) => {
            this.currentView = e.detail;
            this.checkVisibility();
        });
    }

    /**
     * Processes download progress data and updates the textual content
     * of the toast notification.
     * 
     * @param {Object} data - The download progress payload.
     */
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

    /**
     * Evaluates whether the toast should be visible based on the presence
     * of active download data and the user's current view.
     */
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

/**
 * Main view controller for the Engines section.
 * Manages UI interactions, version selection, download handling, 
 * and engine execution.
 */
export const enginesView = {
    /**
     * Initializes the engines view by retrieving the selected engine,
     * setting up the interface, and binding event listeners.
     */
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
        
        this.fsListener = (e) => this.handleProgress(e.detail);
        FS.addEventListener('dl:update', this.fsListener);
        this.setupCustomDropdown(engine);
        this.setupLaunchButton();
        this.setupDownloadActions();
        
        if (FS.activeDownload) this.handleProgress(FS.activeDownload);
    },

    /**
     * Cleans up event listeners and references to prevent memory leaks 
     * when the view is destroyed or changed.
     */
    destroy() {
        if (this.outsideClickHandler) document.removeEventListener('click', this.outsideClickHandler);
        if (this.fsListener) FS.removeEventListener('dl:update', this.fsListener);
    },

    /**
     * Updates the main download UI inside the engines view based on the 
     * current download progress data.
     * 
     * @param {Object} dlData - The download progress payload from the filesystem service.
     */
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

    /**
     * Asynchronously evaluates if the currently selected engine version is installed
     * and updates the text and interactivity of the launch button accordingly.
     */
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

    /**
     * Assigns click handlers to the pause and cancel actions within the download UI.
     */
    setupDownloadActions() {
        const btnPause = document.getElementById('dl-pause');
        const btnCancel = document.getElementById('dl-cancel');
        btnPause.onclick = () => {
            const isPaused = FS.togglePause();
            btnPause.textContent = isPaused ? "Resume" : "Pause";
        };
        btnCancel.onclick = () => FS.cancelDownload();
    },
    
    /**
     * Resolves the appropriate download link for a version based on the 
     * user's current operating system and architecture.
     * 
     * @param {Object} versionData - The dataset containing varying OS and architecture download URLs.
     * @returns {string|null} The resolved download URL, or null if no compatible build is found.
     */
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

    /**
     * Sets up the main execution logic for the launch button. It determines whether 
     * the engine should be played locally or queued for installation via the filesystem.
     */
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
            
            const targetLink = this.getTargetLink(versionData);
            
            if (!targetLink) return alert("OS or architecture not supported.");
            
            document.getElementById('dl-pause').textContent = "Pause";
            await FS.installEngine(engine.id, engine.meta.name, selectedVersion, targetLink);
        };
    },

    /**
     * Tries to extract a readable version string from a given URL using regular expressions.
     * Acts as a fallback for generic or unparsed version configurations.
     * 
     * @param {string} url - The URL to inspect.
     * @returns {string} The parsed version string, or "Unknown".
     */
    extractVersionFallback(url) {
        if (!url) return "Unknown";
        const githubMatch = url.match(/\/download\/(v?([^\/]+))\//);
        if (githubMatch && githubMatch[2]) return githubMatch[2];
        
        const genericMatch = url.match(/(?:v|-)?(\d+\.\d+(?:\.\d+)?(?:[a-zA-Z0-9-]*))/i);
        if (genericMatch && genericMatch[1]) return genericMatch[1];
        
        return "Unknown";
    },

    /**
     * Configures the behavior and population of the custom version selector dropdown.
     * Overrides and corrects undefined version naming before appending UI options.
     * 
     * @param {Object} engine - The engine metadata block containing the version array.
     */
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
    
    /**
     * Dynamically fetches release notes matching the current version from the GitHub API.
     * Parses the markdown body into basic HTML elements to be injected into the view container.
     * 
     * @param {Object} versionData - The structured dataset encompassing the selected version parameters.
     */
    async updateReleaseNotes(versionData) {
        const notesContainer = document.getElementById('engine-release-notes');
        if (!notesContainer) return;
        
        notesContainer.innerHTML = '<p style="color: var(--text-muted);">Fetching release notes...</p>';
        
        const link = this.getTargetLink(versionData) || versionData.win || versionData.lin || versionData.mac || "";
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

/**
 * Attaches the main view script execution binding to the application's global 
 * router mechanism. Triggered upon specific view navigation requests.
 */
export function registerEnginesView() {
    appEvents.addEventListener('view:loaded', (event) => {
        if (event.detail === 'engines') enginesView.init();
        else enginesView.destroy();
    });
}


// TIME TO MODULARIZE THIS FILE