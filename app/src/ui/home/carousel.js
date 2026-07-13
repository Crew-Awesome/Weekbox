import { gameBananaApi } from '../../api/gamebanana.js';
import { modModal } from './modal/index.js';

export const homeCarousel = {
    currentSlideIndex: 0,
    slideInterval: null,
    totalSlides: 0,

    async init() {
        const track = document.getElementById('carousel-track');
        const dotsContainer = document.getElementById('carousel-dots');
        if (!track) return;

        try {
            const mods = await gameBananaApi.getFeaturedCarousel();
            if (mods.length === 0) {
                track.innerHTML = `<div style="padding: 24px; color: var(--text-muted);">No featured mods found.</div>`;
                return;
            }

            track.innerHTML = '';
            dotsContainer.innerHTML = '';
            this.totalSlides = mods.length;

            mods.forEach((mod, index) => {
                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                slide.style.backgroundImage = `url('${mod.image}')`;
                
                slide.innerHTML = `
                    <div class="carousel-overlay"></div>
                    <div class="carousel-content">
                        <span class="badge">${mod.label}</span>
                        <h1>${mod.title}</h1>
                        <p>by ${mod.author}</p>
                        <button class="action-btn download-mod-btn">
                            <i class="fa-solid fa-download"></i> Download
                        </button>
                    </div>
                `;
                
                const downloadBtn = slide.querySelector('.download-mod-btn');
                downloadBtn.addEventListener('click', () => {
                    modModal.open(mod.id);
                });
                
                track.appendChild(slide);
                
                const dot = document.createElement('div');
                dot.className = 'dot';
                dot.addEventListener('click', () => this.goToSlide(index));
                dotsContainer.appendChild(dot);
            });

            this.setupControls();
            this.updateDots();
            this.startAutoSlide();
        } catch (error) {
            track.innerHTML = `<div style="padding: 24px; color: red;">Carousel error</div>`;
        }
    },

    setupControls() {
        const btnPrev = document.getElementById('carousel-prev');
        const btnNext = document.getElementById('carousel-next');
        if (btnPrev) {
            const newPrev = btnPrev.cloneNode(true);
            btnPrev.parentNode.replaceChild(newPrev, btnPrev);
            newPrev.addEventListener('click', () => this.prevSlide());
        }
        if (btnNext) {
            const newNext = btnNext.cloneNode(true);
            btnNext.parentNode.replaceChild(newNext, btnNext);
            newNext.addEventListener('click', () => this.nextSlide());
        }
    },

    updateDots() {
        const dots = document.querySelectorAll('.dot');
        if (dots.length === 0) return;
        dots.forEach(d => { d.classList.remove('active'); d.style.display = 'none'; });

        const groupStart = Math.floor(this.currentSlideIndex / 4) * 4;

        for (let offset = 0; offset < Math.min(4, this.totalSlides - groupStart); offset++) {
            const dotIndex = groupStart + offset;
            dots[dotIndex].style.display = 'block';
            dots[dotIndex].style.order = offset + 1;
        }

        dots[this.currentSlideIndex].classList.add('active');
    },

    goToSlide(index) {
        const track = document.getElementById('carousel-track');
        if (!track) return;
        this.currentSlideIndex = index;
        track.style.transform = `translateX(-${this.currentSlideIndex * 100}%)`;
        this.updateDots();
        this.startAutoSlide();
    },

    nextSlide() { 
        if (this.totalSlides > 0) this.goToSlide((this.currentSlideIndex + 1) % this.totalSlides); 
    },
    
    prevSlide() { 
        if (this.totalSlides > 0) this.goToSlide((this.currentSlideIndex - 1 + this.totalSlides) % this.totalSlides); 
    },

    startAutoSlide() {
        this.stopAutoSlide();
        this.slideInterval = setInterval(() => this.nextSlide(), 5000);
    },

    stopAutoSlide() {
        if (this.slideInterval) clearInterval(this.slideInterval);
    }
};
