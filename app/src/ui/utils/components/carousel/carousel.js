import { M3Carousel } from './carousel-core.js';

export function initCarousels() {
    const carousels = document.querySelectorAll('.m3-carousel');
    carousels.forEach(element => {
        // Inicializamos los módulos
        new M3Carousel(element);
    });
}