import { initCarousels } from '../../../utils/components/carousel/carousel.js';
import { loadFeaturedCarousel } from './browse-carousel-featured.js';
import { loadEngineRows } from './browse-engines.js';

/**
 * Initializes the Browse view.
 * Specifically loads the featured carousel.
 */
export async function init() {
    const container = document.querySelector('.browse-container');
    if (!container) return;

    const result = await loadFeaturedCarousel(container);
    initCarousels(); // Inicializa todos los .m3-carousel
    
    // Cargar filas de engines
    loadEngineRows(container);
    
    const carouselEl = container.querySelector('.m3-carousel');
    const api = carouselEl?.m3CarouselAPI;
    
    if (api && result && result.totalItems > 0) {
        setupCarouselControls(container, api, result);
    }
}

function setupCarouselControls(container, api, { totalItems, sectionCount, itemsPerSection }) {
    const prevBtn = container.querySelector('.browse-carousel-prev');
    const nextBtn = container.querySelector('.browse-carousel-next');
    const pillsContainer = container.querySelector('.browse-carousel-pills');
    
    if (!prevBtn || !nextBtn || !pillsContainer) return;
    
    // Al dar click en prev, saltamos a la sección anterior
    prevBtn.addEventListener('click', () => {
        const currentLogicalIndex = ((api.currentIndex % api.totalItems) + api.totalItems) % api.totalItems;
        const currentSection = Math.floor(currentLogicalIndex / itemsPerSection);
        const targetSection = currentSection - 1;
        api.goToLogicalIndex(targetSection * itemsPerSection);
    });
    
    // Al dar click en next, saltamos a la siguiente sección
    nextBtn.addEventListener('click', () => {
        const currentLogicalIndex = ((api.currentIndex % api.totalItems) + api.totalItems) % api.totalItems;
        const currentSection = Math.floor(currentLogicalIndex / itemsPerSection);
        const targetSection = currentSection + 1;
        api.goToLogicalIndex(targetSection * itemsPerSection);
    });
    
    // Crear pastillas dinámicamente según itemsPerSection (ej. 4 pastillas fijas que se resetean)
    pillsContainer.innerHTML = '';
    const pills = [];
    for (let i = 0; i < itemsPerSection; i++) {
        const pill = document.createElement('div');
        pill.className = 'browse-carousel-pill';
        const fill = document.createElement('div');
        fill.className = 'browse-carousel-pill-fill';
        pill.appendChild(fill);
        
        pill.addEventListener('click', () => {
            const currentLogicalIndex = ((api.currentIndex % api.totalItems) + api.totalItems) % api.totalItems;
            const currentSection = Math.floor(currentLogicalIndex / itemsPerSection);
            api.goToLogicalIndex(currentSection * itemsPerSection + i);
        });
        
        pillsContainer.appendChild(pill);
        pills.push(pill);
    }
    
    // Sincronizar pastillas con el slide actual
    api.element.addEventListener('m3-carousel-slide-change', (e) => {
        const index = e.detail.index; // índice de 0 a totalItems - 1
        const pillIndex = index % itemsPerSection; // qué pastilla de la sección está activa
        
        pills.forEach((p, i) => {
            if (i === pillIndex) {
                p.classList.remove('is-active');
                void p.offsetWidth; // Forzar reflow para reiniciar la animación
                p.classList.add('is-active');
                
                const fill = p.querySelector('.browse-carousel-pill-fill');
                if (fill) fill.style.animationDuration = '3s'; // El autoplay por defecto es 3000ms
            } else {
                p.classList.remove('is-active');
            }
        });
    });
    
    // Inicializar la primera pastilla
    if (pills[0]) {
        pills[0].classList.add('is-active');
        const fill = pills[0].querySelector('.browse-carousel-pill-fill');
        if (fill) fill.style.animationDuration = '3s';
    }
}
