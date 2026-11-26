import React from 'react'
import { EngineSelectorControl } from '../EngineSelectorControl'
import type { EngineCategory } from '../../constants'
import type { ModItem } from '../../types'

interface MobileEngineSelectorProps {
  displayCard: ModItem
  engineName: string
  isInstalled: boolean
  engineDropdownRef?: React.RefObject<HTMLDivElement | null>
  mobileEngineMenuId: string
  selectedVersion?: string
  handleSelectEngine: (cat: EngineCategory, version?: string) => void
}

export const MobileEngineSelector: React.FC<MobileEngineSelectorProps> = ({
  mobileEngineMenuId,
  ...rest
}) => (
  <EngineSelectorControl
    variant="mobile"
    engineMenuId={mobileEngineMenuId}
    {...rest}
  />
)
