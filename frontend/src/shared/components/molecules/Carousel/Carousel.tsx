import React, { useRef, useEffect, Children, useCallback } from 'react';
import type { PointerEvent } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { calculateVisuals } from './carouselMath';

gsap.registerPlugin(useGSAP);

/**
 * Interface for Carousel properties.
 */

export interface CarouselProps {
    /** The child elements to display within the carousel. Recommended to use Material Design 3 cards for styling. */
    children: React.ReactNode;
    /** If true, the carousel loops infinitely, duplicating nodes implicitly. Recommended to have at least 5 nodes visually. */
    isInfinite?: boolean;
    /** If true, the carousel scrolls automatically based on the autoInterval. */
    isAuto?: boolean;
    /** The interval in milliseconds between auto-scrolls. Default is 3000. */
    autoInterval?: number;
    /** Optional custom CSS classes for the container. */
    className?: string;
    /** Optional CSS aspect ratio for the container items (for container queries). */
    aspectRatio?: string;
}

/**
 * Material Design 3 Carousel component ported to React and GSAP.
 * This component manages state, native scroll events, manual dragging, and auto-play loops,
 * adopting the MD3 Compose Architecture and calculating layouts visually via absolute scroll.
 * 
 * @param {CarouselProps} props - The properties for the Carousel component.
 * @returns {React.ReactElement} The rendered Carousel component.
 */
export const Carousel: React.FC<CarouselProps> = ({
    children,
    isInfinite = false,
    isAuto = false,
    autoInterval = 3000,
    className = '',
    aspectRatio = '16 / 9'
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const scrollerRef = useRef<HTMLDivElement>(null);
    const visualRefs = useRef<(HTMLDivElement | null)[]>([]);
    
    const dragState = useRef({
        isDown: false,
        startX: 0,
        scrollLeft: 0,
        isAnimating: false,
        direction: 1
    });

    const childrenArray = Children.toArray(children);
    let visualChildren = [...childrenArray];
    
    if (isInfinite && visualChildren.length > 0 && visualChildren.length < 5) {
        const setsNeeded = Math.ceil(5 / childrenArray.length);
        for (let s = 1; s < setsNeeded; s++) {
            visualChildren = [...visualChildren, ...childrenArray];
        }
    }
    const totalItems = visualChildren.length;
    const dummyCount = isInfinite ? 50 : totalItems;

    const handleInfiniteScrollWrap = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller || !isInfinite || scroller.clientWidth === 0) return;
        
        const shiftDist = scroller.clientWidth;
        const p = scroller.scrollLeft / shiftDist;
        
        if (p > 40) {
            scroller.scrollLeft -= totalItems * shiftDist;
        } else if (p < 10) {
            scroller.scrollLeft += totalItems * shiftDist;
        }
    }, [isInfinite, totalItems]);

    const updateVisuals = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller || scroller.clientWidth === 0 || totalItems === 0) return;
        
        const scrollPos = scroller.scrollLeft;
        const progress = scrollPos / scroller.clientWidth;
        
        const layouts = calculateVisuals(totalItems, progress, !isInfinite);
        
        layouts.forEach((layout, index) => {
            const item = visualRefs.current[index];
            if (!item) return;
            
            item.style.width = `${layout.w.toFixed(2)}cqw`;
            item.style.transform = `translateX(${layout.x.toFixed(2)}cqw)`;
            item.style.left = '0';
            
            if (layout.display === 'none') {
                item.style.visibility = 'hidden';
            } else {
                item.style.visibility = 'visible';
                const content = item.querySelector('.m3-card-content') as HTMLElement;
                const badge = item.querySelector('.m3-card-badge') as HTMLElement;
                const opacity = Math.max(0, (layout.w - 15) / 65).toFixed(2);
                if (content) content.style.opacity = opacity;
                if (badge) badge.style.opacity = opacity;
            }
        });
    }, [isInfinite, totalItems]);

    useGSAP(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;

        let lastClientWidth = scroller.clientWidth;

        if (isInfinite && lastClientWidth > 0) {
            const middlePadding = Math.floor(25 / totalItems) * totalItems;
            scroller.scrollLeft = middlePadding * lastClientWidth;
        }
        updateVisuals();

        const observer = new ResizeObserver(() => {
            if (scroller.clientWidth === 0 || dragState.current.isAnimating || dragState.current.isDown) return;
            lastClientWidth = scroller.clientWidth;
            updateVisuals();
        });
        
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        
        return () => observer.disconnect();
    }, { scope: containerRef, dependencies: [isInfinite, totalItems, updateVisuals] });

    const smoothScrollToIndex = useCallback((targetIndex: number, duration: number = 0.6) => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        
        dragState.current.isAnimating = true;
        const targetScrollLeft = targetIndex * scroller.clientWidth;
        
        const proxy = { x: scroller.scrollLeft };
        gsap.to(proxy, {
            x: targetScrollLeft,
            duration: duration,
            ease: "power3.inOut",
            onUpdate: () => {
                scroller.scrollLeft = proxy.x;
                updateVisuals();
            },
            onComplete: () => {
                dragState.current.isAnimating = false;
                if (isInfinite) {
                    handleInfiniteScrollWrap();
                    updateVisuals();
                }
            }
        });
    }, [isInfinite, updateVisuals, handleInfiniteScrollWrap]);

    useEffect(() => {
        if (!isAuto) return;
        
        const interval = setInterval(() => {
            const scroller = scrollerRef.current;
            if (!scroller) return;
            
            if (!isInfinite) {
                const maxScroll = scroller.scrollWidth - scroller.clientWidth;
                if (scroller.scrollLeft >= maxScroll - 5) {
                    dragState.current.direction = -1;
                } else if (scroller.scrollLeft <= 5) {
                    dragState.current.direction = 1;
                }
            }
            
            const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth;
            const targetIndex = Math.round(currentIndexFloat) + dragState.current.direction;
            smoothScrollToIndex(targetIndex);
            
        }, autoInterval);
        
        return () => clearInterval(interval);
    }, [isAuto, isInfinite, autoInterval, smoothScrollToIndex]);

    const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
        const scroller = scrollerRef.current;
        if (!scroller || isAuto) return;
        
        dragState.current.isDown = true;
        if(dragState.current.isAnimating) {
            dragState.current.isAnimating = false;
        }
        
        dragState.current.startX = e.pageX - scroller.offsetLeft;
        dragState.current.scrollLeft = scroller.scrollLeft;
        
        const onPointerMove = (moveEvent: globalThis.PointerEvent) => {
            if (!dragState.current.isDown) return;
            moveEvent.preventDefault();
            const x = moveEvent.pageX - scroller.offsetLeft;
            const walk = (dragState.current.startX - x) * 1.5;
            scroller.scrollLeft = dragState.current.scrollLeft + walk;
            updateVisuals();
        };
        
        const onPointerUp = () => {
            if (!dragState.current.isDown) return;
            dragState.current.isDown = false;
            
            window.removeEventListener('pointermove', onPointerMove);
            window.removeEventListener('pointerup', onPointerUp);
            window.removeEventListener('pointercancel', onPointerUp);
            
            if (isInfinite) {
                handleInfiniteScrollWrap();
            }
            
            const currentIndexFloat = scroller.scrollLeft / scroller.clientWidth;
            const snapIndex = Math.round(currentIndexFloat);
            
            if (Math.abs(snapIndex - currentIndexFloat) > 0.01) {
                smoothScrollToIndex(snapIndex, 0.4);
            }
        };

        window.addEventListener('pointermove', onPointerMove, { passive: false });
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerUp);
    };

    const onScroll = () => {
        if (dragState.current.isDown || dragState.current.isAnimating) return;
        
        if (isInfinite && scrollerRef.current && scrollerRef.current.clientWidth > 0) {
            handleInfiniteScrollWrap();
        }
        updateVisuals();
    };

    return (
        <div 
            ref={containerRef} 
            className={`relative overflow-hidden w-full ${className}`}
            style={{ 
                containerType: 'inline-size', 
                aspectRatio: aspectRatio,
                ['--m3-carousel-ratio' as string]: aspectRatio 
            }}
        >
            <div 
                ref={scrollerRef}
                className="flex overflow-x-auto w-full h-full touch-pan-x"
                style={{ 
                    scrollbarWidth: 'none', 
                    cursor: isAuto ? 'default' : 'grab',
                    pointerEvents: isAuto ? 'none' : 'auto'
                }}
                onPointerDown={isAuto ? undefined : onPointerDown}
                onScroll={onScroll}
            >
                <div className="absolute inset-0 pointer-events-none">
                    {visualChildren.map((child, idx) => (
                        <div 
                            key={`visual-${idx}`}
                            ref={el => { visualRefs.current[idx] = el; }}
                            className="absolute h-full pointer-events-auto"
                            style={{ width: '0cqw', transform: 'translateX(100cqw)', left: '0', visibility: 'hidden' }}
                        >
                            {child}
                        </div>
                    ))}
                </div>

                {Array.from({ length: dummyCount }).map((_, idx) => (
                    <div 
                        key={`dummy-${idx}`}
                        className="shrink-0"
                        style={{ width: '100cqw', height: '100%' }}
                    />
                ))}
            </div>
        </div>
    );
};
