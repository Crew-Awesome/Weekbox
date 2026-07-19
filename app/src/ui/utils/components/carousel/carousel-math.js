/**
 * Calculates the exact mathematical layouts (width, position, opacity) for all visual items
 * based on the absolute continuous scroll progress.
 * @param {number} totalItems - Total number of items in the carousel.
 * @param {number} p_continuous - Continuous exact index (e.g., 0.5 means halfway between item 0 and 1).
 * @param {boolean} isFinite - Whether the carousel is finite (non-looping).
 * @returns {Array<Object>} An array of layout objects {w, x, display} for each item.
 */
export function calculateVisuals(totalItems, p_continuous, isFinite) {
    const layouts = new Array(totalItems);
    for(let i = 0; i < totalItems; i++) {
        layouts[i] = { w: 0, x: 100, display: 'none' };
    }
    
    if (totalItems === 0) return layouts;

    if (isFinite) {
        p_continuous = Math.max(0, Math.min(totalItems - 1, p_continuous));
    }
    
    const p_lower = Math.floor(p_continuous);
    const fraction = p_continuous - p_lower;
    
    let idxA, idxB, idxC, idxD;
    
    if (isFinite) {
        idxA = p_lower - 1;
        idxB = p_lower;
        idxC = p_lower + 1;
        idxD = p_lower + 2;
    } else {
        idxA = (p_lower - 1 + totalItems) % totalItems;
        idxB = p_lower % totalItems;
        idxC = (p_lower + 1) % totalItems;
        idxD = (p_lower + 2) % totalItems;
    }

    // Role A: Left pill exiting
    if (idxA >= 0 && idxA < totalItems || !isFinite) {
        const w = 10 - 10 * fraction;
        const x = 0;
        layouts[idxA] = { w, x, display: w > 0.1 ? 'block' : 'none' };
    }
    
    // Role B: Active center shrinking to left pill
    if (idxB >= 0 && idxB < totalItems || !isFinite) {
        let w, x;
        if (isFinite && p_lower === 0) {
            w = 90 - 80 * fraction;
            x = 0;
        } else {
            w = 80 - 70 * fraction;
            x = 10 - 10 * fraction;
        }
        layouts[idxB] = { w, x, display: w > 0.1 ? 'block' : 'none' };
    }
    
    // Role C: Right pill growing to center
    if (idxC >= 0 && idxC < totalItems || !isFinite) {
        let w, x;
        if (isFinite && p_lower === totalItems - 2) {
            w = 10 + 80 * fraction;
            x = 90 - 80 * fraction;
        } else {
            w = 10 + 70 * fraction;
            x = 90 - 80 * fraction;
        }
        layouts[idxC] = { w, x, display: w > 0.1 ? 'block' : 'none' };
    }
    
    // Role D: Entering pill from right
    if (idxD >= 0 && idxD < totalItems || !isFinite) {
        const w = 10 * fraction;
        const x = 100 - 10 * fraction;
        layouts[idxD] = { w, x, display: w > 0.1 ? 'block' : 'none' };
    }
    
    return layouts;
}
