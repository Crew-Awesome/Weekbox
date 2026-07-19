import { gameBananaApi } from '../../../../core/config/api/gamebanana.js';

/**
 * Fetches the HTML template for a featured carousel item.
 * @returns {Promise<string>} The HTML string of the template.
 */
async function fetchTemplate() {
    try {
        const response = await fetch('src/ui/html/app-html/main-view/discover-view/discover-carousel-featured-item.html');
        if (!response.ok) {
            throw new Error('Failed to fetch template');
        }
        return await response.text();
    } catch (error) {
        console.error("Failed to load featured carousel template:", error);
        return '';
    }
}

/**
 * Loads the featured mods data and populates the carousel container dynamically.
 * It removes hardcoded dummy elements, fetches the HTML template, and injects data using standard DOM APIs.
 * @param {HTMLElement} container - The container element holding the carousel scroller.
 * @returns {Promise<void>}
 */
export async function loadFeaturedCarousel(container) {
    const scroller = container.querySelector('.m3-carousel-scroller');
    if (!scroller) {
        return;
    }

    try {
        const featuredMods = await gameBananaApi.getFeaturedCarousel();
        
        if (featuredMods && featuredMods.length > 0) {
            const templateHtml = await fetchTemplate();
            
            if (!templateHtml) {
                return;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(templateHtml, 'text/html');
            const templateItem = doc.querySelector('.m3-carousel-item');

            if (!templateItem) {
                return;
            }

            scroller.textContent = '';
            
            featuredMods.forEach(mod => {
                const itemNode = templateItem.cloneNode(true);
                
                const img = itemNode.querySelector('.m3-card-img');
                if (img) {
                    img.src = mod.image || '';
                    img.alt = mod.title || 'Featured item';
                }

                const badge = itemNode.querySelector('.m3-card-badge');
                if (badge) {
                    badge.textContent = mod.label || '';
                }

                const title = itemNode.querySelector('.m3-card-title');
                if (title) {
                    title.textContent = mod.title || '';
                } else {
                    const h3 = itemNode.querySelector('h3');
                    if (h3) {
                        h3.textContent = mod.title || '';
                    }
                }

                const author = itemNode.querySelector('.m3-card-author');
                if (author) {
                    author.textContent = mod.author || '';
                } else {
                    const p = itemNode.querySelector('p');
                    if (p) {
                        p.textContent = mod.author || '';
                    }
                }
                
                scroller.appendChild(itemNode);
            });
        }
    } catch (error) {
        console.error("Failed to load featured carousel:", error);
    }
}
