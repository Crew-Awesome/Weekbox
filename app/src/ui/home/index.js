import { appEvents } from '../../core/events.js';
import { homeCarousel } from './carousel.js';
import { homeGrid } from './grid.js';
import { homeSearch } from './search.js';
import { homeSearchDropdown } from './searchDropdown.js';

export const homeView = {
    init() {
        this.mainContent = document.getElementById('main-content');
        this.container = document.querySelector('.home-container');
        
        this.mainContent.addEventListener('scroll', this.handleScroll.bind(this));

        homeCarousel.init();
        homeGrid.init();
        homeSearch.init();
        homeSearchDropdown.init();
    },

    handleScroll() {
        if (!this.container) return;
        if (this.mainContent.scrollTop > 50) {
            this.container.classList.add('scrolled');
        } else {
            this.container.classList.remove('scrolled');
        }
    },

    destroy() {
        if (this.mainContent) {
            this.mainContent.removeEventListener('scroll', this.handleScroll);
        }
        homeCarousel.stopAutoSlide();
        homeGrid.removeScroll();
    }
};

export function registerHomeView() {
    appEvents.addEventListener('view:loaded', (event) => {
        if (event.detail === 'home') homeView.init();
        else homeView.destroy();
    });
}
