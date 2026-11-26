import React from 'react'
import { EngineSelectorControl } from '../EngineSelectorControl'
import type { EngineCategory } from '../../constants'
import type { ModItem } from '../../types'

interface DesktopEngineSelectorProps {
  displayCard: ModItem
  engineName: string
  isInstalled: boolean
  engineDropdownRef?: React.RefObject<HTMLDivElement | null>
  engineMenuId: string
  selectedVersion?: string
  handleSelectEngine: (cat: EngineCategory, version?: string) => void
}

export const DesktopEngineSelector: React.FC<DesktopEngineSelectorProps> = (
  props,
) => <EngineSelectorControl variant="desktop" {...props} />
