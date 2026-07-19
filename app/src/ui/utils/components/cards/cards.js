function parseColor(val, defaultColor) {
    if (!val) return defaultColor;
    val = val.trim();
    if (val.includes(',')) return `rgb(${val})`;
    return val.startsWith('#') ? val : `#${val}`;
}

function createRipple(event, card) {
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.classList.add('md3-component-card-ripple');
    
    const maxDistX = Math.max(x, rect.width - x);
    const maxDistY = Math.max(y, rect.height - y);
    const radius = Math.sqrt(maxDistX * maxDistX + maxDistY * maxDistY);
    const diameter = radius * 2;
    
    ripple.style.width = `${diameter}px`;
    ripple.style.height = `${diameter}px`;
    ripple.style.left = `${x - radius}px`;
    ripple.style.top = `${y - radius}px`;
    
    card.appendChild(ripple);
    
    requestAnimationFrame(() => {
        ripple.classList.add('is-active');
    });
    
    return ripple;
}

export function initCards(parentContainer = document) {
    const cards = parentContainer.querySelectorAll('.md3-component-card:not([data-init="true"])');
    
    cards.forEach(card => {
        card.dataset.init = "true";
        
        const type = card.dataset.type || 'filled';
        card.classList.add(`md3-component-card--${type}`);
        
        const scheme = card.dataset.colorScheme;
        if (scheme) {
            card.style.setProperty('--card-bg', `var(--m3-component-${scheme}-container)`);
            card.style.setProperty('--card-color', `var(--m3-component-on-${scheme}-container)`);
        }
        
        const customBg = card.dataset.customBg;
        const customColor = card.dataset.customColor;
        
        if (customBg) card.style.setProperty('--card-bg', parseColor(customBg, 'transparent'));
        if (customColor) card.style.setProperty('--card-color', parseColor(customColor, 'inherit'));
        
        // --- NUEVO: Inyección de imagen de fondo ---
        const bgImage = card.dataset.bgImage;
        if (bgImage) {
            const bgElement = document.createElement('div');
            bgElement.classList.add('md3-component-card-bg');
            bgElement.style.backgroundImage = `url('${bgImage}')`;
            card.appendChild(bgElement);
            card.classList.add('has-bg-image');
        }
        // -------------------------------------------

        const isClickable = card.dataset.clickable === 'true';
        if (isClickable) {
            card.classList.add('md3-component-card--clickable');
            if(!card.hasAttribute('tabindex') && !card.hasAttribute('disabled') && card.getAttribute('aria-disabled') !== 'true') {
                card.setAttribute('tabindex', '0');
            }
            card.addEventListener('pointerdown', (e) => {
                if(card.hasAttribute('disabled') || card.getAttribute('aria-disabled') === 'true') return;
                
                card.classList.add('is-dragged');
                const ripple = createRipple(e, card);
                
                const cleanup = () => {
                    card.classList.remove('is-dragged');
                    ripple.classList.remove('is-active');
                    ripple.classList.add('is-fading');
                    ripple.addEventListener('transitionend', () => ripple.remove(), { once: true });
                    
                    document.removeEventListener('pointerup', cleanup);
                    document.removeEventListener('pointercancel', cleanup);
                    document.removeEventListener('pointerleave', cleanup);
                };
                
                document.addEventListener('pointerup', cleanup);
                document.addEventListener('pointercancel', cleanup);
                document.addEventListener('pointerleave', cleanup);
            });
        }
    });
}