import React from 'react'
import type { EngineDefinition } from '@/core/engines'

export interface InstancesEngineBannerProps {
  engine: EngineDefinition
  bannerProgress: number
  sectionRef?: React.Ref<HTMLElement>
}

export const InstancesEngineBanner: React.FC<InstancesEngineBannerProps> = ({
  engine,
  bannerProgress,
  sectionRef,
}) => {
  return (
    <section
      ref={sectionRef}
      aria-label={`${engine.name} banner`}
      className="relative w-full aspect-[21/9] rounded-t-3xl rounded-b-none overflow-hidden select-none pointer-events-none"
      style={{
        opacity: 1 - bannerProgress * 0.65,
        transform: `translateY(${-bannerProgress * 8}px)`,
        WebkitMaskImage:
          'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.75) 15%, rgba(0, 0, 0, 0.25) 45%, rgba(0, 0, 0, 0) 80%)',
        maskImage:
          'linear-gradient(to bottom, rgba(0, 0, 0, 1) 0%, rgba(0, 0, 0, 0.75) 15%, rgba(0, 0, 0, 0.25) 45%, rgba(0, 0, 0, 0) 80%)',
      }}
    >
      {engine.banner ? (
        <img
          src={engine.banner}
          alt={`${engine.name} banner`}
          className="w-full h-full object-cover object-center select-none pointer-events-none"
        />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center relative overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${engine.accent}40 0%, var(--md-sys-color-surface-container-high) 100%)`,
          }}
        >
          <img
            src={engine.icon}
            alt=""
            className="w-24 h-24 opacity-25 object-contain drop-shadow"
          />
        </div>
      )}
    </section>
  )
}
