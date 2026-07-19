import { getCircleSvgTemplate } from './svgTemplate.js';
import { startAnimation } from './animator.js';

function parseColor(val, defaultColor) {
    if (!val) return defaultColor;
    val = val.trim();
    if (val.includes(',')) return `rgb(${val})`;
    return `#${val.replace(/^#/, '')}`;
}

function extractConfig(container) {
    const size = parseFloat(container.dataset.size) || 80;
    const radius = 34;
    const circumference = 2 * Math.PI * radius;
    const wavelength = parseFloat(container.dataset.wavelength) || 15;

    return {
        size,
        center: size / 2,
        radius,
        circumference,
        gapOffset: parseFloat(container.dataset.gap) || 0.05,
        waves: Math.round(circumference / wavelength),
        amplitude: Math.min(parseFloat(container.dataset.amplitude) || 3, 5),
        activeColor: parseColor(container.dataset.color, '6750A4'),
        trackColor: parseColor(container.dataset.trackColor, 'E8DEF8')
    };
}

/**
 * Public API for the Material Design 3 Circle Load component.
 */
export class CircleLoad {
    constructor(container) {
        if (!container) throw new Error("Container is required for CircleLoad");
        if (container.circleLoadAPI) return container.circleLoadAPI;
        
        this.container = container;
        this.container.dataset.init = "true";
        this.container.circleLoadAPI = this;
        
        this.config = extractConfig(this.container);
        this.container.innerHTML = getCircleSvgTemplate(this.config);
        
        this.elements = {
            path: this.container.querySelector('.md3-component-circle-load--active-indicator'),
            track: this.container.querySelector('.md3-component-circle-load-track'),
            stopIndicator: this.container.querySelector('.md3-component-circle-load--stop-indicator')
        };
        
        this.targetProgress = 0;
        startAnimation(this.container, this.config, this.elements, this);
    }
    
    /**
     * Sets the progress of the loader.
     * @param {number} percent - Progress from 0 to 100
     */
    setProgress(percent) {
        this.targetProgress = percent / 100;
    }
    
    /**
     * Sets the mode of the loader.
     * @param {string} mode - "determinate" or "indeterminate"
     */
    setMode(mode) {
        this.container.dataset.mode = mode;
    }
}

// Legacy helper functions that use the new Object-Oriented API
export function initCircleLoad(containerSelector = '.md3-component-circle-load', parentContainer = document) {
    const containers = parentContainer.querySelectorAll(containerSelector);
    containers.forEach(container => new CircleLoad(container));
}

export function updateCircleProgress(percent, containerSelector = '.md3-component-circle-load', parentContainer = document) {
    const containers = typeof containerSelector === 'string' ? parentContainer.querySelectorAll(containerSelector) : [containerSelector];
    containers.forEach(c => {
        if (c.circleLoadAPI) c.circleLoadAPI.setProgress(percent);
    });
}

export function setCircleMode(mode, containerSelector = '.md3-component-circle-load', parentContainer = document) {
    const containers = typeof containerSelector === 'string' ? parentContainer.querySelectorAll(containerSelector) : [containerSelector];
    containers.forEach(c => {
        if (c.circleLoadAPI) c.circleLoadAPI.setMode(mode);
    });
}