import { useState, useCallback } from 'react'
import { updateInstalledModMetadata } from '@/core/mods'
import type { ModItem } from '../types'

interface UseModInlineEditParams {
  displayCard: ModItem
  isInstalled: boolean
  onUpdateMod?: (updates: Partial<ModItem>) => Promise<void>
}

/**
 * Manages inline editing for the mod title and description, persisting changes
 * to `WeekBoxLibrary/data/installedmods.json` and the mod's local `mod.json`.
 */
export function useModInlineEdit({
  displayCard,
  isInstalled,
  onUpdateMod,
}: UseModInlineEditParams) {
  const modId = displayCard?.id
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const currentTitle = displayCard?.name || displayCard?.title || ''
  const [prevTitle, setPrevTitle] = useState(currentTitle)
  const [titleInput, setTitleInput] = useState(currentTitle)

  if (currentTitle !== prevTitle) {
    setPrevTitle(currentTitle)
    setTitleInput(currentTitle)
  }

  const handleSaveTitle = useCallback(() => {
    setIsEditingTitle(false)
    const clean = titleInput.trim()
    if (!clean) return
    if (onUpdateMod) {
      void onUpdateMod({ title: clean, name: clean })
    }
    if (isInstalled && modId !== undefined) {
      void updateInstalledModMetadata(modId, {
        title: clean,
        name: clean,
      })
    }
  }, [titleInput, onUpdateMod, isInstalled, modId])

  const [isEditingDesc, setIsEditingDesc] = useState(false)
  const currentDesc = displayCard?.description || ''
  const [prevDesc, setPrevDesc] = useState(currentDesc)
  const [descInput, setDescInput] = useState(currentDesc)

  if (currentDesc !== prevDesc) {
    setPrevDesc(currentDesc)
    setDescInput(currentDesc)
  }

  const handleSaveDesc = useCallback(() => {
    setIsEditingDesc(false)
    const clean = descInput.trim()
    if (onUpdateMod) {
      void onUpdateMod({ description: clean })
    }
    if (isInstalled && modId !== undefined) {
      void updateInstalledModMetadata(modId, {
        description: clean,
      })
    }
  }, [descInput, onUpdateMod, isInstalled, modId])

  return {
    isEditingTitle,
    setIsEditingTitle,
    titleInput,
    setTitleInput,
    handleSaveTitle,
    isEditingDesc,
    setIsEditingDesc,
    descInput,
    setDescInput,
    handleSaveDesc,
  }
}
