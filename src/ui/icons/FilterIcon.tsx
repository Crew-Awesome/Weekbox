import React from 'react'
import { SidebarIcon } from '@/ui/sidebar/components/SidebarIcon'

export interface FilterIconProps {
  isActive?: boolean
  isOpen?: boolean
  size?: number
  className?: string
  slot?: string
}

export const FilterIcon: React.FC<FilterIconProps> = ({
  isActive = false,
  isOpen = false,
  size = 22,
  className = '',
  slot,
}) => {
  return (
    <span
      slot={slot}
      className={`inline-flex items-center justify-center pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
        isOpen ? 'scale-95 -rotate-6' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <SidebarIcon
        name="filter"
        isActive={isActive}
        size={size}
      />
    </span>
  )
}

