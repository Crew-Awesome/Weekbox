window.HomeApp = {
    init() {
        this.mainContent = document.getElementById('main-content');
        this.container = document.querySelector('.home-container');
        
        this.mainContent.addEventListener('scroll', this.handleScroll.bind(this));

        window.HomeCarousel.init();
        window.HomeGrid.init();
        window.HomeSearch.init();
        window.HomeSearchDropdown.init();
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
        window.HomeCarousel.stopAutoSlide();
        window.HomeGrid.removeScroll();
    }
};

window.addEventListener('view:loaded', (e) => {
    if (e.detail === 'home') window.HomeApp.init();
    else window.HomeApp.destroy();
});
