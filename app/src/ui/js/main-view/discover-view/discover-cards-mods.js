import { extractImageColor } from '../../../utils/extractImgColor.js';
import { gameBananaApi } from '../../../../core/config/api/gamebanana.js';
import { installMod } from '../../../../backend/utils/fileSystem/downloader/mods.js';

export function applyDiscoverCardMods(container) {
    const dynamicCards = container.querySelectorAll('.md3-component-card[data-type="dynamic-color"]:not(.discover-dynamic-card)');
    
    dynamicCards.forEach(card => {
        const img = card.querySelector('img');
        if (!img) return;
        
        card.classList.add('discover-dynamic-card');
        
        // Wait for image to load before extracting color, if not already loaded
        if (img.complete) {
            extractColorFromImage(img, card);
        } else {
            img.onload = () => extractColorFromImage(img, card);
        }
    });
}

function extractColorFromImage(img, card) {
    extractImageColor(img.src).then(colorData => {
        card.style.setProperty('--card-bg', colorData.hex);
        card.style.setProperty('--card-color', colorData.isDark ? '#FFFFFF' : '#000000');
        card.style.setProperty('--card-bg-rgb', `${colorData.r}, ${colorData.g}, ${colorData.b}`);
    }).catch(err => {
        console.warn('Could not extract color for card', err);
    });
}

export async function loadDiscoverMods(container) {
    const grid = container.querySelector('#mods-grid');
    const template = container.querySelector('#mod-card-template');
    
    if (!grid || !template) return;
    
    // Clear grid safely
    while(grid.firstChild) {
        grid.removeChild(grid.firstChild);
    }
    
    try {
        const response = await gameBananaApi.getGridMods('popular', 1);
        const mods = Array.isArray(response) ? response : response.mods || [];
        
        mods.forEach(mod => {
            const clone = template.content.cloneNode(true);
            const card = clone.querySelector('.md3-component-card');
            const engineBadge = clone.querySelector('.card-badge-engine');
            const img = clone.querySelector('.mod-thumbnail');
            const title = clone.querySelector('.mod-title');
            const authorStats = clone.querySelector('.mod-author-stats');
            const downloadBtn = clone.querySelector('.download-btn');
            
            // Text values injected securely
            engineBadge.textContent = mod.engineId || 'Unknown Engine';
            title.textContent = mod.title;
            
            const formatNumber = num => new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
            authorStats.textContent = `${mod.author} • ${formatNumber(mod.views)} views • ${mod.timeAgo}`;
            
            // Setting attributes securely
            img.src = mod.image || '';
            img.alt = mod.title || 'Mod Thumbnail';
            
            // Fix for cards.css disabling pointer events on all child elements
            downloadBtn.style.pointerEvents = 'auto';
            
            // Action bindings
            const openMod = (e) => {
                if (e) e.stopPropagation();
                if (window.Neutralino) {
                    Neutralino.os.open(`https://gamebanana.com/mods/${mod.id}`);
                } else {
                    window.open(`https://gamebanana.com/mods/${mod.id}`, '_blank');
                }
            };
            
            downloadBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 1. Change button state
                const originalText = downloadBtn.textContent;
                downloadBtn.textContent = 'Iniciando...';
                downloadBtn.disabled = true;
                
                try {
                    // 2. Fetch full details to get the download URL
                    const details = await gameBananaApi.getModDetails(mod.id);
                    if (!details || !details.downloadUrl) {
                        throw new Error("No download URL found for this mod.");
                    }
                    
                    downloadBtn.textContent = 'Descargando...';
                    
                    // 3. Trigger native backend download
                    const result = await installMod(mod.title, details.downloadUrl);
                    
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
            
            card.addEventListener('click', openMod);
            
            grid.appendChild(clone);
        });
        
        // Apply the dynamic background styling once the nodes are inserted
        applyDiscoverCardMods(grid);
        
    } catch (err) {
        console.error('Error loading GameBanana mods for grid:', err);
    }
}
