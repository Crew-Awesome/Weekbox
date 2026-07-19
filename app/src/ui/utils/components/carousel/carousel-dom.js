/**
 * Builds the Double-Layer Compose Architecture for the carousel.
 * Extracts visual items into a sticky overlay and creates a dummy scroller.
 * If the carousel is infinite and has fewer than 5 items, it duplicates them in FULL SETS to prevent DOM node starvation and preserve sequence.
 * @param {HTMLElement} container - The main carousel container.
 * @param {boolean} isInfinite - Whether the carousel is infinite.
 * @returns {Object} An object containing the scroller, visualItems array, and totalItems count.
 */
export function buildComposeArchitecture(container, isInfinite) {
    const scroller = container.querySelector('.m3-carousel-scroller');
    let visualItems = Array.from(scroller.querySelectorAll('.m3-carousel-item'));
    
    // For infinite carousels, we need at least 5 nodes to render all edge transitions without overlap.
    if (isInfinite && visualItems.length > 0 && visualItems.length < 5) {
        const original = [...visualItems];
        const setsNeeded = Math.ceil(5 / original.length);
        for (let s = 1; s < setsNeeded; s++) {
            original.forEach(item => {
                const clone = item.cloneNode(true);
                visualItems.push(clone);
            });
        }
    }
    
    const totalItems = visualItems.length;
    
    if (totalItems === 0) return { scroller, visualItems, totalItems };
    
    const visualLayer = document.createElement('div');
    visualLayer.className = 'm3-carousel-visual-layer';
    
    visualItems.forEach(item => visualLayer.appendChild(item));
    
    scroller.innerHTML = ''; 
    scroller.appendChild(visualLayer);
    
    // Cache inner elements to avoid querySelector in 60fps loop
    visualItems.forEach(item => {
        item._m3Card = item.querySelector('.m3-card');
        if (item._m3Card) {
            item._m3Content = item._m3Card.querySelector('.m3-card-content');
            item._m3Badge = item._m3Card.querySelector('.m3-card-badge');
        }
    });
    
    // Create 50 dummy items for infinite to create a massive scroll buffer, or just totalItems for finite.
    const dummyCount = isInfinite ? 50 : totalItems;
    
    for(let i = 0; i < dummyCount; i++) {
        const dummy = document.createElement('div');
        dummy.className = 'm3-carousel-dummy';
        scroller.appendChild(dummy);
    }
    
    return { scroller, visualItems, totalItems };
}

/**
 * Applies calculated mathematical styles (width, left, opacity) to a visual item.
 * @param {HTMLElement} item - The visual DOM element.
 * @param {Object} layout - The layout properties calculated by the math module.
 */
export function applyVisualStyles(item, layout) {
    const newX = layout.x;
    
    // Siempre aplicamos las coordenadas, incluso si está oculto, para que esté en posición.
    item.style.width = layout.w.toFixed(2) + 'cqw'; 
    item.style.transform = `translateX(${newX.toFixed(2)}cqw)`;
    item.style.left = '0';
    
    if (layout.display === 'none') {
        item.style.visibility = 'hidden';
    } else {
        item.style.visibility = 'visible';
        
        if (item._m3Content) {
            item._m3Content.style.opacity = Math.max(0, (layout.w - 15) / 65).toFixed(2);
        }
        if (item._m3Badge) {
            item._m3Badge.style.opacity = Math.max(0, (layout.w - 15) / 65).toFixed(2);
        }
    }
}

/**
 * Handles the mathematical wrapping of the dummy scroller for infinite carousels.
 * This teleports the scroll position seamlessly without manipulating DOM nodes, bypassing Scroll Anchoring bugs.
 * @param {HTMLElement} scroller - The native scroller element.
 * @param {number} shiftDist - The width of a single dummy item (clientWidth).
 * @param {number} totalItems - The total number of visual items.
 * @returns {boolean} True if a wrap occurred.
 */
export function handleInfiniteScrollWrap(scroller, shiftDist, totalItems) {
    const p = scroller.scrollLeft / shiftDist;
    
    // With 50 dummy items, we stay in the middle (e.g. between 10 and 40).
    // If we reach near the edges, we teleport by EXACTLY `totalItems` steps.
    // Since visual math uses modulo `totalItems`, visual layout remains mathematically identical.
    if (p > 40) {
        scroller.scrollLeft -= totalItems * shiftDist;
        return true;
    } else if (p < 10) {
        scroller.scrollLeft += totalItems * shiftDist;
        return true;
    }
    return false;
}

export function createRipple(event, card) {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.classList.add('m3-carousel-ripple');
    
    const maxDistX = Math.max(x, rect.width - x);
    const maxDistY = Math.max(y, rect.height - y);
    const radius = Math.sqrt(maxDistX * maxDistX + maxDistY * maxDistY);
    
    ripple.style.width = `${radius * 2}px`;
    ripple.style.height = `${radius * 2}px`;
    ripple.style.left = `${x - radius}px`;
    ripple.style.top = `${y - radius}px`;
    
    card.appendChild(ripple);
    
    requestAnimationFrame(() => ripple.classList.add('is-active'));
    
    const cleanup = () => {
        ripple.classList.remove('is-active');
        ripple.classList.add('is-fading');
        ripple.addEventListener('transitionend', () => ripple.remove(), { once: true });
        document.removeEventListener('pointerup', cleanup);
        document.removeEventListener('pointerleave', cleanup);
    };
    
    document.addEventListener('pointerup', cleanup);
    document.addEventListener('pointerleave', cleanup);
}
