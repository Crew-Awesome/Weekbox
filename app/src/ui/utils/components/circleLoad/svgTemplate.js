export function getCircleSvgTemplate(config) {
    return `
        <svg width="${config.size}" height="${config.size}" viewBox="0 0 ${config.size} ${config.size}" class="md3-component-circle-load-wave-svg">
            <circle cx="${config.center}" cy="${config.center}" r="${config.radius}" class="md3-component-circle-load-track" style="stroke: ${config.trackColor};" />
            <circle cx="${config.center + config.radius}" cy="${config.center}" r="2" class="md3-component-circle-load--stop-indicator" style="fill: ${config.activeColor};" />
            <path class="md3-component-circle-load--active-indicator" style="stroke: ${config.activeColor};" />
        </svg>
    `;
}