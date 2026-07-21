import { gameBananaApi } from '../../../../core/config/api/gamebanana.js';
import { ENGINE_CATEGORY_IDS, ENGINE_DETAILS } from '../../../../core/config/engines.js';
import { extractImageColor } from '../../../../ui/utils/extractImgColor.js';

/**
 * Renderiza las filas dinámicas de mods por Engine
 */
export async function loadEngineRows(container) {
    const enginesContainer = container.querySelector('#browse-engines-container');
    if (!enginesContainer) return;
    
    // Limpiar el contenedor actual por si acaso
    enginesContainer.innerHTML = '';
    
    // Obtener los IDs de las categorías mapeadas
    const engineKeys = Object.keys(ENGINE_CATEGORY_IDS);
    
    const rowElements = new Map();
    
    for (const key of engineKeys) {
        const categoryId = parseInt(key, 10);
        const engineInfo = ENGINE_DETAILS[ENGINE_CATEGORY_IDS[key]];
        
        if (!engineInfo) continue;
        
        // Crear el cascarón de la fila
        const rowDiv = document.createElement('div');
        rowDiv.className = 'browse-engine-row';
        // En lugar de ocultarlo, lo mostramos para que el usuario sepa que está cargando
        rowDiv.style.opacity = '0.7'; 
        
        const header = document.createElement('h2');
        header.className = 'browse-engine-header';
        
        // Icono del engine si existe
        if (engineInfo.icon) {
            const icon = document.createElement('img');
            icon.src = `assets/engine-icons/${engineInfo.icon}`;
            icon.alt = engineInfo.name;
            icon.style.width = '24px';
            icon.style.height = '24px';
            header.appendChild(icon);
        }
        
        // Texto del título
        const titleText = document.createTextNode(` ${engineInfo.name} Mods (Cargando...)`);
        header.appendChild(titleText);
        
        // Botón "See More"
        const seeMoreBtn = document.createElement('button');
        seeMoreBtn.className = 'browse-engine-see-more';
        seeMoreBtn.textContent = 'See More';
        seeMoreBtn.setAttribute('aria-label', `See more ${engineInfo.name} mods`);
        header.appendChild(seeMoreBtn);
        
        // Reemplazar la cuadrícula estática por un contenedor de slider
        const sliderContainer = document.createElement('div');
        sliderContainer.className = 'browse-engine-slider-container';
        sliderContainer.setAttribute('role', 'region');
        sliderContainer.setAttribute('aria-roledescription', 'carousel');
        sliderContainer.setAttribute('aria-label', `${engineInfo.name} Mods`);
        
        const prevBtn = document.createElement('button');
        prevBtn.className = 'browse-slider-btn browse-slider-prev';
        prevBtn.setAttribute('aria-label', 'Previous slide');
        prevBtn.setAttribute('title', 'Previous');
        prevBtn.innerHTML = '<img src="assets/app/client/arrow-client.svg" alt="" aria-hidden="true" style="transform: rotate(180deg);">';
        
        const sliderWrapper = document.createElement('div');
        sliderWrapper.className = 'browse-engine-slider-wrapper';
        sliderWrapper.setAttribute('aria-live', 'polite');
        
        const track = document.createElement('div');
        track.className = 'browse-engine-track';
        
        const nextBtn = document.createElement('button');
        nextBtn.className = 'browse-slider-btn browse-slider-next';
        nextBtn.setAttribute('aria-label', 'Next slide');
        nextBtn.setAttribute('title', 'Next');
        nextBtn.innerHTML = '<img src="assets/app/client/arrow-client.svg" alt="" aria-hidden="true">';
        
        sliderWrapper.appendChild(track);
        sliderContainer.appendChild(prevBtn);
        sliderContainer.appendChild(sliderWrapper);
        sliderContainer.appendChild(nextBtn);
        
        rowDiv.appendChild(header);
        rowDiv.appendChild(sliderContainer);
        
        enginesContainer.appendChild(rowDiv);
        rowElements.set(categoryId, { rowDiv, track, titleText, prevBtn, nextBtn, engineInfo });
        
        console.log(`[Browse] Añadido contenedor de engine: ${engineInfo.name}`);
    }
    
    // Cargar la data
    const promises = engineKeys.map(async (key) => {
        const categoryId = parseInt(key, 10);
        try {
            console.log(`[Browse] Solicitando mods para categoría ${categoryId}`);
            // Obtener los populares
            const result = await gameBananaApi.getGridMods('popular', 1, categoryId);
            const mods = Array.isArray(result) ? result : (result && result.mods ? result.mods : []);
            
            const element = rowElements.get(categoryId);
            if (!element) return;
            const { rowDiv, track, titleText, prevBtn, nextBtn, engineInfo } = element;
            
            // Quitar el texto de cargando
            titleText.textContent = ` ${ENGINE_DETAILS[ENGINE_CATEGORY_IDS[key]].name} Mods`;
            rowDiv.style.opacity = '1';
            
            if (mods && mods.length > 0) {
                console.log(`[Browse] Recibidos ${mods.length} mods para ${categoryId}`);
                // Tomar hasta 8 mods para no saturar tanto la pantalla de una vez
                const modsToShow = mods.slice(0, 8);
                
                modsToShow.forEach(mod => {
                    const card = createModCard(mod, engineInfo);
                    track.appendChild(card);
                });
                
                // Lógica del Slider Infinito
                let isAnimating = false;
                
                nextBtn.addEventListener('click', () => {
                    if (isAnimating || track.children.length < 2) return;
                    isAnimating = true;
                    const shiftAmount = track.firstElementChild.offsetWidth + 20; // width + gap
                    track.style.transition = 'transform 0.4s ease-in-out';
                    track.style.transform = `translateX(-${shiftAmount}px)`;
                    
                    setTimeout(() => {
                        track.style.transition = 'none';
                        track.appendChild(track.firstElementChild); // mover el primero al final
                        track.style.transform = `translateX(0)`;
                        // forzar reflow para que el transition: none aplique de inmediato
                        void track.offsetWidth;
                        isAnimating = false;
                    }, 400);
                });
                
                prevBtn.addEventListener('click', () => {
                    if (isAnimating || track.children.length < 2) return;
                    isAnimating = true;
                    const shiftAmount = track.firstElementChild.offsetWidth + 20;
                    
                    // Mover el último elemento al inicio antes de animar
                    track.prepend(track.lastElementChild);
                    track.style.transition = 'none';
                    track.style.transform = `translateX(-${shiftAmount}px)`;
                    void track.offsetWidth; // forzar reflow
                    
                    // Ahora animar a 0
                    track.style.transition = 'transform 0.4s ease-in-out';
                    track.style.transform = `translateX(0)`;
                    
                    setTimeout(() => {
                        isAnimating = false;
                    }, 400);
                });
                
            } else {
                console.warn(`[Browse] Sin resultados para ${categoryId}. Ocultando fila.`);
                rowDiv.remove(); // No hay mods, quitamos la fila
            }
        } catch (error) {
            console.error(`[Browse] Error loading mods for category ${categoryId}:`, error);
            rowElements.get(categoryId)?.rowDiv.remove();
        }
    });
    
    await Promise.allSettled(promises);
}

function createModCard(mod, engineInfo) {
    const card = document.createElement('div');
    card.className = 'm3-card browse-m3-card'; // browse-m3-card para estilos específicos
    
    // Extraer color de forma asincrónica si hay imagen
    const imageSrc = mod.image || 'https://images.gamebanana.com/img/ss/mods/default.jpg';
    extractImageColor(imageSrc).then(color => {
        card.style.setProperty('--card-hover-bg', color.hex);
    }).catch(err => console.warn('No se pudo extraer color de', imageSrc));
    
    // Contenedor de la imagen
    const imgWrapper = document.createElement('div');
    imgWrapper.className = 'browse-m3-card-img-wrapper';
    
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = mod.title || 'Mod Cover';
    
    imgWrapper.appendChild(img);
    
    // Píldora del Engine (si hay)
    if (engineInfo && engineInfo.icon) {
        const chip = document.createElement('div');
        chip.className = 'm3-card-engine-chip';
        chip.innerHTML = `
            <img src="assets/engine-icons/${engineInfo.icon}" alt="Engine">
            <span>${engineInfo.name}</span>
        `;
        imgWrapper.appendChild(chip);
    }
    
    // Contenido (texto abajo de la imagen)
    const content = document.createElement('div');
    content.className = 'm3-card-content';
    
    const title = document.createElement('h3');
    title.className = 'm3-card-title';
    title.textContent = mod.title || 'Unknown Mod';
    
    const author = document.createElement('p');
    author.className = 'm3-card-author';
    author.textContent = mod.author || 'Unknown Creator';
    
    // Stats row (Views, Likes, TimeAgo)
    const statsRow = document.createElement('div');
    statsRow.className = 'm3-card-stats';
    
    const formatNumber = (num) => num >= 1000 ? (num/1000).toFixed(1) + 'k' : num;
    
    statsRow.innerHTML = `
        <span class="m3-card-stat"><img src="assets/app/icons/eye.svg" style="width:14px; opacity:0.8;"> ${formatNumber(mod.views)}</span>
        <span class="m3-card-stat"><img src="assets/app/icons/likes.svg" style="width:14px; opacity:0.8;"> ${formatNumber(mod.likes)}</span>
        <span class="m3-card-stat" style="margin-left: auto; display:flex; align-items:center; gap:4px;"><img src="assets/app/icons/calendar.svg" style="width:12px; opacity:0.6;"> ${mod.timeAgo}</span>
    `;
    
    content.appendChild(title);
    content.appendChild(author);
    content.appendChild(statsRow);
    
    card.appendChild(imgWrapper);
    card.appendChild(content);
    
    // Hacer la card clickeable
    card.addEventListener('click', () => {
        const event = new CustomEvent('weekbox-open-mod', { 
            detail: { id: mod.id, url: mod.url },
            bubbles: true
        });
        card.dispatchEvent(event);
    });
    
    return card;
}
