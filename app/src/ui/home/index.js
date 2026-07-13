import { appEvents } from '../../core/events.js';
import { homeCarousel } from './carousel.js';
import { homeGrid } from './grid.js';
import { homeSearch } from './search.js';
import { homeSearchDropdown } from './searchDropdown.js';

export const homeView = {
    init() {
        this.mainContent = document.getElementById('main-content');
        this.container = document.querySelector('.home-container');
        this.scrollHandler ??= this.handleScroll.bind(this);
        this.mainContent.removeEventListener('scroll', this.scrollHandler);
        this.mainContent.addEventListener('scroll', this.scrollHandler);

        homeCarousel.init();
        homeGrid.init();
        homeSearch.init();
        homeSearchDropdown.init();
    },

    handleScroll() {
        if (!this.container) return;
        const isScrolled = this.container.classList.contains('scrolled');
        const shouldCompact = isScrolled
            ? this.mainContent.scrollTop > 30
            : this.mainContent.scrollTop > 70;

        if (shouldCompact) {
            this.container.classList.add('scrolled');
        } else {
            this.container.classList.remove('scrolled');
        }
    },

    destroy() {
        if (this.mainContent) {
            this.mainContent.removeEventListener('scroll', this.scrollHandler);
        }
        homeCarousel.stopAutoSlide();
        homeGrid.destroy();
    }
};

export function registerHomeView() {
    appEvents.addEventListener('view:loaded', (event) => {
        if (event.detail === 'home') homeView.init();
        else homeView.destroy();
    });
}
