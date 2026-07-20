import { extractImageColor } from '../../../utils/extractImgColor.js';
import { gameBananaApi } from '../../../../core/config/api/gamebanana.js';
import { installMod } from '../../../../backend/utils/fileSystem/downloader/mods.js';
import { initCards } from '../../../utils/components/cards/cards.js';

/**
 * Web Component representing a single Mod Card.
 * Uses Light DOM to inherit global styles such as '.md3-component-card'.
 * @extends HTMLElement
 */
export class ModCard extends HTMLElement {
    /**
     * Initializes the ModCard component.
     */
    constructor() {
        super();
        this._mod = null;
    }

    /**
     * Sets the mod data and triggers a re-render if the component is connected to the DOM.
     * @param {Object} data - The mod data object.
     */
    set mod(data) {
        this._mod = data;
        if (this.isConnected) {
            this.render();
        }
    }

    /**
     * Gets the current mod data.
     * @returns {Object} The mod data object.
     */
    get mod() {
        return this._mod;
    }

    /**
     * Invoked when the custom element is first connected to the document's DOM.
     * Triggers the initial render if mod data is already provided.
     */
    connectedCallback() {
        if (this._mod && !this.hasChildNodes()) {
            this.render();
        }
    }

    /**
     * Renders the card by cloning the template and injecting data securely.
     */
    render() {
        if (!this._mod) return;
        
        const template = document.querySelector('#mod-card-template');
        if (!template) {
            console.error('mod-card-template not found in the DOM');
            return;
        }

        /**
         * Securely clone the template.
         * Using .textContent prevents XSS vulnerabilities when injecting dynamic data.
         */
        const clone = template.content.cloneNode(true);
        
        const card = clone.querySelector('.md3-component-card');
        const engineBadge = clone.querySelector('.card-badge-engine');
        const img = clone.querySelector('.mod-thumbnail');
        const title = clone.querySelector('.mod-title');
        const authorStats = clone.querySelector('.mod-author-stats');
        const downloadBtn = clone.querySelector('.download-btn');

        engineBadge.textContent = this._mod.engineId || 'Unknown Engine';
        title.textContent = this._mod.title;
        
        const formatNumber = num => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
        authorStats.textContent = `${this._mod.author} • ${formatNumber(this._mod.views)} views • ${this._mod.timeAgo}`;

        img.src = this._mod.image || '';
        img.alt = this._mod.title || 'Mod Thumbnail';
        
        this.addEventListeners(card, downloadBtn);
        
        this.appendChild(clone);
        
        this.applyDynamicColor();
        
        /**
         * Initialize ripple effects on the newly rendered card.
         */
        initCards(this);
    }

    /**
     * Attaches interaction events to the card and its download button.
     * @param {HTMLElement} cardElement - The main card container element.
     * @param {HTMLElement} downloadBtn - The download button element.
     */
    addEventListeners(cardElement, downloadBtn) {
        const modId = this._mod.id;
        const modTitle = this._mod.title;

        cardElement.addEventListener('click', (e) => {
            if (e) e.stopPropagation();
            if (window.Neutralino) {
                Neutralino.os.open(`https://gamebanana.com/mods/${modId}`);
            } else {
                window.open(`https://gamebanana.com/mods/${modId}`, '_blank');
            }
        });

        // Evita que el ripple de la tarjeta se active al presionar el botón
        downloadBtn.addEventListener('pointerdown', (e) => {
            e.stopPropagation();
        });

        downloadBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            const originalText = downloadBtn.textContent;
            downloadBtn.textContent = 'Iniciando...';
            downloadBtn.disabled = true;
            
            try {
                const details = await gameBananaApi.getModDetails(modId);
                if (!details || !details.downloadUrl) {
                    throw new Error("No download URL found for this mod.");
                }
                
                downloadBtn.textContent = 'Descargando...';
                
                const result = await installMod(modTitle, details.downloadUrl);
                
                if (result.success) {
                    downloadBtn.textContent = 'Instalado';
                    downloadBtn.style.backgroundColor = 'var(--m3-component-primary)';
                    downloadBtn.style.color = 'var(--m3-component-on-primary)';
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error("Error during mod installation:", error);
                downloadBtn.textContent = 'Error';
                setTimeout(() => {
                    downloadBtn.textContent = originalText;
                    downloadBtn.disabled = false;
                }, 3000);
            }
        });
    }

    /**
     * Extracts the dominant color from the loaded image and applies it as a dynamic background.
     */
    applyDynamicColor() {
        const card = this.querySelector('.md3-component-card');
        const img = this.querySelector('.mod-thumbnail');
        if (!img || !card) return;

        const extractColor = () => {
            extractImageColor(img.src).then(colorData => {
                let { r, g, b } = colorData;
                
                // Calculamos la luminancia real percibida
                const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
                
                // Si el color es muy claro, lo forzamos a oscurecerse drásticamente
                if (luminance > 90) {
                    const factor = 90 / luminance; 
                    r = Math.floor(r * factor);
                    g = Math.floor(g * factor);
                    b = Math.floor(b * factor);
                }

                // Tope máximo absoluto por canal para asegurar que NUNCA sea blanco/gris claro
                r = Math.min(r, 130);
                g = Math.min(g, 130);
                b = Math.min(b, 130);

                // Solo aplicamos el fondo, no tocamos --card-color
                card.style.setProperty('--card-bg-rgb', `${r}, ${g}, ${b}`);
                card.classList.add('discover-dynamic-card');
            }).catch(err => {
                console.warn('Could not extract color for card', err);
            });
        };

        if (img.complete) {
            extractColor();
        } else {
            img.onload = extractColor;
        }
    }
}

if (!customElements.get('mod-card')) {
    customElements.define('mod-card', ModCard);
}

/**
 * Renders the provided mods into the grid container securely.
 * @param {HTMLElement} container - The main discover view container.
 * @param {Array} mods - Array of mod objects to render.
 */
export function renderModsGrid(container, mods) {
    const grid = container.querySelector('#mods-grid');
    if (!grid) return;
    
    /**
     * Safely clear the grid using child removal instead of innerHTML.
     */
    while(grid.firstChild) {
        grid.removeChild(grid.firstChild);
    }
    
    mods.forEach(mod => {
        const card = document.createElement('mod-card');
        card.mod = mod;
        grid.appendChild(card);
    });
}

/**
 * Fetches popular mods from the GameBanana API and triggers rendering.
 * @param {HTMLElement} container - The main discover view container.
 * @returns {Promise<void>}
 */
export async function loadDiscoverMods(container) {
    try {
        const response = await gameBananaApi.getGridMods('popular', 1);
        const mods = Array.isArray(response) ? response : response.mods || [];
        renderModsGrid(container, mods);
    } catch (err) {
        console.error('Error loading GameBanana mods for grid:', err);
    }
}
