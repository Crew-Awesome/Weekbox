import { calculateVisuals } from './carousel-math.js';
import { buildComposeArchitecture, applyVisualStyles, handleInfiniteScrollWrap } from './carousel-dom.js';

/**
 * M3Carousel orchestrates the Material Design 3 HorizontalMultiBrowseCarousel logic.
 * It manages state, native scroll events, manual dragging, and auto-play loops.
 */
export class M3Carousel {
    /**
     * @param {HTMLElement} element - The root carousel element
     */
    constructor(element) {
        this.element = element;
        
        const typeAttr = this.element.dataset.type || 'manual';
        const types = typeAttr.split(' ');
        
        this.isAuto = types.includes('auto');
        this.isInfinite = types.includes('infinite');
        this.isManual = types.includes('manual') || (!this.isAuto);
        
        const ratioAttr = this.element.dataset.aspectRatio || '16 / 9';
        this.element.style.setProperty('--m3-carousel-ratio', ratioAttr);
        
        this.ticking = false;
        this.isDown = false;
        this.isAnimating = false;
        this.startX = 0;
        this.scrollLeft = 0;
        this.scrollerOffsetLeft = 0;
        this.autoInterval = null;
        this.direction = 1;
        
        this.init();
    }
    
    /**
     * Initializes the double-layer Compose Architecture and attaches event listeners.
     */
    init() {
        this.element.m3CarouselAPI = this;
        
        const arch = buildComposeArchitecture(this.element, this.isInfinite);
        this.scroller = arch.scroller;
        this.visualItems = arch.visualItems;
        this.totalItems = arch.totalItems;
        
        if (this.totalItems === 0) return;
        
        this.scroller.addEventListener('scroll', () => {
            // Prevent double-execution and teleportation while dragging/animating
            if (this.isDown || this.isAnimating) return;
            
            if (this.isInfinite && this.scroller.clientWidth > 0) {
                handleInfiniteScrollWrap(this.scroller, this.scroller.clientWidth, this.totalItems);
            }
            // Update synchronously for natural scrolling
            this.update();
        });
        
        if (this.isManual) {
            this.setupManual();
        } else {
            this.scroller.style.pointerEvents = 'none';
            this.scroller.style.cursor = 'default';
        }
        
        if (this.isAuto) {
            this.play();
        }
        
        // Wait for next frame to ensure clientWidth is calculated by browser
        requestAnimationFrame(() => {
            if (this.isInfinite && this.scroller.clientWidth > 0) {
                // Initialize scroll position to the middle of the massive buffer.
                // It MUST be an exact multiple of totalItems so visual index starts at 0.
                const middlePadding = Math.floor(25 / this.totalItems) * this.totalItems;
                this.scroller.scrollLeft = middlePadding * this.scroller.clientWidth;
            }
            this.lastClientWidth = this.scroller.clientWidth;
            this.update();
        });
        
        // Handle window/container resizing gracefully to maintain perfect alignment
        this.resizeObserver = new ResizeObserver(() => {
            if (this.scroller.clientWidth === 0 || this.isAnimating || this.isDown) return;
            
            if (this.lastClientWidth && this.lastClientWidth !== this.scroller.clientWidth) {
                // Restore the exact index we were at using the new clientWidth
                if (typeof this.currentIndex === 'number') {
                    this.scroller.scrollLeft = this.currentIndex * this.scroller.clientWidth;
                }
            }
            this.lastClientWidth = this.scroller.clientWidth;
            this.update();
        });
        this.resizeObserver.observe(this.element);
    }
    
    /**
     * Calculates and applies mathematical properties to visual elements based on exact scroll position.
     */
    update() {
        if (this.scroller.clientWidth === 0) return;
        
        const scrollPos = this.scroller.scrollLeft;
        const progress = scrollPos / this.scroller.clientWidth;
        
        // Track the exact resting index for resize handling
        this.currentIndex = Math.round(progress);
        
        // Dispatch event if the stable visual index changes
        // Since we have dummy items for infinite scrolling, we need to modulo against totalItems
        const logicalIndex = ((this.currentIndex % this.totalItems) + this.totalItems) % this.totalItems;
        if (this.lastEmittedIndex !== logicalIndex) {
            this.lastEmittedIndex = logicalIndex;
            this.element.dispatchEvent(new CustomEvent('m3-carousel-slide-change', { 
                detail: { index: logicalIndex, total: this.totalItems }
            }));
        }
        
        const isFinite = !this.isInfinite;
        
        const layouts = calculateVisuals(this.totalItems, progress, isFinite);
        
        this.visualItems.forEach((item, index) => {
            applyVisualStyles(item, layouts[index]);
        });
    }
    
    /**
     * Sets up pointer events for manual dragging and momentum snapping.
     */
    setupManual() {
        const stopDrag = () => {
            if (!this.isDown) return;
            this.isDown = false;
            
            if (this.isInfinite && this.scroller.clientWidth > 0) {
                handleInfiniteScrollWrap(this.scroller, this.scroller.clientWidth, this.totalItems);
            }
            
            const currentIndexFloat = this.scroller.scrollLeft / this.scroller.clientWidth;
            const snapIndex = Math.round(currentIndexFloat);
            
            if (Math.abs(snapIndex - currentIndexFloat) > 0.01) {
                this.smoothScrollToIndex(snapIndex, 400); 
            }
        };
        
        this.scroller.addEventListener('pointerdown', (e) => {
            this.isDown = true;
            this.scrollerOffsetLeft = this.scroller.offsetLeft;
            this.startX = e.pageX - this.scrollerOffsetLeft;
            this.scrollLeft = this.scroller.scrollLeft;
        });
        
        this.scroller.addEventListener('pointerleave', stopDrag);
        window.addEventListener('pointerup', stopDrag);
        
        this.scroller.addEventListener('pointermove', (e) => {
            if (!this.isDown) return;
            e.preventDefault();
            const x = e.pageX - this.scrollerOffsetLeft;
            const walk = (this.startX - x) * 1.5;
            this.scroller.scrollLeft = this.scrollLeft + walk;
            this.update(); 
        });
    }
    
    /**
     * Animates the scroller to a specific logical index using JS frame-by-frame interpolation.
     * @param {number} targetIndex - The target item index to scroll to.
     * @param {number} duration - Animation duration in ms.
     */
    smoothScrollToIndex(targetIndex, duration = 600) {
        const startTime = performance.now();
        const startIndex = this.scroller.scrollLeft / this.scroller.clientWidth;
        this.isAnimating = true;
        
        const animateScroll = (currentTime) => {
            if (this.scroller.clientWidth === 0) {
                this.isAnimating = false;
                return;
            }
            
            const elapsed = currentTime - startTime;
            let progress = Math.min(elapsed / duration, 1);
            
            const easeInOutCubic = progress < 0.5 
                ? 4 * progress * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                
            const currentIndexFloat = startIndex + (targetIndex - startIndex) * easeInOutCubic;
            this.scroller.scrollLeft = currentIndexFloat * this.scroller.clientWidth;
            this.update(); 
            
            if (progress < 1) {
                requestAnimationFrame(animateScroll);
            } else {
                this.isAnimating = false;
                if (this.isInfinite && this.scroller.clientWidth > 0) {
                    handleInfiniteScrollWrap(this.scroller, this.scroller.clientWidth, this.totalItems);
                    this.update();
                }
            }
        };
        
        requestAnimationFrame(animateScroll);
    }
    
    /**
     * Scrolls smoothly to the next item.
     */
    next() {
        if (this.scroller.clientWidth === 0) return;
        const currentIndexFloat = this.scroller.scrollLeft / this.scroller.clientWidth;
        this.smoothScrollToIndex(Math.round(currentIndexFloat) + 1, 600);
        this.direction = 1;
    }
    
    /**
     * Scrolls smoothly to the previous item.
     */
    prev() {
        if (this.scroller.clientWidth === 0) return;
        const currentIndexFloat = this.scroller.scrollLeft / this.scroller.clientWidth;
        this.smoothScrollToIndex(Math.round(currentIndexFloat) - 1, 600);
        this.direction = -1;
    }
    
    /**
     * Starts the auto-play loop.
     * @param {number} intervalMs - Time between scroll events.
     */
    play(intervalMs = 3000) {
        this.pause();
        this.autoInterval = setInterval(() => {
            if (!this.isInfinite) {
                const maxScroll = this.scroller.scrollWidth - this.scroller.clientWidth;
                if (this.scroller.scrollLeft >= maxScroll - 5) {
                    this.direction = -1;
                } else if (this.scroller.scrollLeft <= 5) {
                    this.direction = 1;
                }
            }
            
            if (this.direction === 1) {
                this.next();
            } else {
                this.prev();
            }
        }, intervalMs);
    }
    
    /**
     * Stops the auto-play loop.
     */
    pause() {
        if (this.autoInterval) {
            clearInterval(this.autoInterval);
            this.autoInterval = null;
        }
    }
    
    /**
     * Calculates the nearest matching dummy index for a given logical index and scrolls to it.
     */
    goToLogicalIndex(logicalIndex) {
        if (this.scroller.clientWidth === 0 || this.totalItems === 0) return;
        
        const currentLogicalIndex = ((this.currentIndex % this.totalItems) + this.totalItems) % this.totalItems;
        let diff = logicalIndex - currentLogicalIndex;
        
        // Find the shortest path in an infinite carousel
        if (this.isInfinite) {
            if (diff > this.totalItems / 2) diff -= this.totalItems;
            if (diff < -this.totalItems / 2) diff += this.totalItems;
        }
        
        const targetIndex = this.currentIndex + diff;
        this.smoothScrollToIndex(targetIndex, 600);
        
        if (this.isAuto) {
            this.play(); // Reset timer
        }
    }
}
