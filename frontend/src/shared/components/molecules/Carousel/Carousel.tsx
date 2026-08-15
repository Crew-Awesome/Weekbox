import React from 'react';
import { useGSAP } from '@gsap/react';
import type { CarouselProps } from './types';
import { useCarousel } from './useCarousel';

/**
 * Material Design 3 Carousel component ported to React and GSAP.
 * This component manages state, native scroll events, manual dragging, and auto-play loops,
 * adopting the MD3 Compose Architecture and calculating layouts visually via absolute scroll.
 * 
 * @param {CarouselProps} props - The properties for the Carousel component.
 * @returns {React.ReactElement} The rendered Carousel component.
 */
export const Carousel: React.FC<CarouselProps> = (props) => {
    const {
        className = '',
        aspectRatio,
        renderIndicators,
        isAuto = false,
        isInfinite = false
    } = props;

    const {
        containerRef,
        scrollerRef,
        visualRefs,
        visualChildren,
        childrenArray,
        dummyCount,
        api,
        onPointerDown,
        onScroll,
        onTouchEnd,
        updateVisuals,
        dragState,
        totalItems,
        exactIndexRef
    } = useCarousel(props);

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
            
            if (lastClientWidth && lastClientWidth !== scroller.clientWidth) {
                scroller.scrollLeft = exactIndexRef.current * scroller.clientWidth;
            }
            
            lastClientWidth = scroller.clientWidth;
            updateVisuals();
        });
        
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        
        return () => observer.disconnect();
    }, { scope: containerRef, dependencies: [isInfinite, totalItems, updateVisuals, exactIndexRef, dragState] });

    return (
        <div className={`flex flex-col w-full ${className}`}>
            <div 
                ref={containerRef} 
                className="relative overflow-hidden w-full h-full flex-1"
                style={{ 
                    containerType: 'inline-size', 
                    ...(aspectRatio ? { aspectRatio, ['--m3-carousel-ratio' as string]: aspectRatio } : {})
                }}
            >
                <div 
                    ref={scrollerRef}
                    className="flex overflow-x-auto w-full h-full touch-pan-y"
                    style={{ 
                        scrollbarWidth: 'none', 
                        cursor: isAuto ? 'default' : 'grab'
                    }}
                    onPointerDown={onPointerDown}
                    onScroll={onScroll}
                    onTouchEnd={onTouchEnd}
                >
                    <div className="absolute inset-0 pointer-events-none">
                        {visualChildren.map((child, idx) => (
                            <div 
                                key={`visual-${idx}`}
                                ref={el => { visualRefs.current[idx] = el; }}
                                className="absolute h-full pointer-events-auto cursor-pointer select-none"
                                style={{ width: '0cqw', transform: 'translateX(100cqw)', left: '0', visibility: 'hidden' }}
                                onClick={() => api.goToLogicalIndex(idx % childrenArray.length)}
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
            
            {renderIndicators && renderIndicators(api)}
        </div>
    );
};
