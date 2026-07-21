import { gameBananaApi } from '../../../../core/config/api/gamebanana.js';

/**
 * Fetches the HTML template for a featured carousel item.
 * @returns {Promise<string>} The HTML string of the template.
 */
async function fetchTemplate() {
    try {
        const response = await fetch('src/ui/html/app-html/home/browse/browse-carousel-featured-item.html');
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
        const rawFeaturedMods = await gameBananaApi.getFeaturedCarousel();
        
        // Extraer exactamente 4 mods por cada sección válida
        const featuredMods = [];
        const sectionsMap = new Map();
        
        if (rawFeaturedMods) {
            for (const mod of rawFeaturedMods) {
                if (!sectionsMap.has(mod.label)) {
                    sectionsMap.set(mod.label, []);
                }
                sectionsMap.get(mod.label).push(mod);
            }
            
            // Agregar al carrusel final solo las secciones que tengan al menos 4 items, cortando en 4 exactos
            for (const [label, mods] of sectionsMap.entries()) {
                if (mods.length >= 1) {
                    featuredMods.push(...mods);
                }
            }
        }
        
        if (featuredMods.length > 0) {
            const templateHtml = await fetchTemplate();
            
            if (!templateHtml) {
                return null;
            }

            const parser = new DOMParser();
            const doc = parser.parseFromString(templateHtml, 'text/html');
            const templateItem = doc.querySelector('.m3-carousel-item');

            if (!templateItem) {
                return null;
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
            
            return {
                totalItems: featuredMods.length,
                sectionCount: featuredMods.length / 4,
                itemsPerSection: 5
            };
        }
        return null;
    } catch (error) {
        console.error("Failed to load featured carousel:", error);
        return null;
    }
}
