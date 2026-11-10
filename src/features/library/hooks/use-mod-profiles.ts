import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  getModProfiles,
  getModProfilesSync,
  createModProfile,
  updateModProfile,
  deleteModProfile,
  addModToProfile,
  removeModFromProfile,
  PROFILES_CHANGED_EVENT,
  type ModProfile,
} from '@/core/mods'

export function useModProfiles() {
  const [profiles, setProfiles] = useState<ModProfile[]>(() =>
    getModProfilesSync(),
  )
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)

  const syncProfiles = useCallback(async () => {
    const list = await getModProfiles()
    setProfiles(list)
  }, [])

  useEffect(() => {
    void syncProfiles()

    const handleProfilesChanged = () => {
      setProfiles(getModProfilesSync())
    }

    window.addEventListener(PROFILES_CHANGED_EVENT, handleProfilesChanged)
    return () => {
      window.removeEventListener(PROFILES_CHANGED_EVENT, handleProfilesChanged)
    }
  }, [syncProfiles])

  const activeProfile = useMemo(() => {
    if (!activeProfileId) return null
    return profiles.find((p) => p.id === activeProfileId) ?? null
  }, [profiles, activeProfileId])

  const createProfile = useCallback(
    async (name: string, icon?: string, color?: string) => {
      const created = await createModProfile(name, icon, color)
      setActiveProfileId(created.id)
      return created
    },
    [],
  )

  const updateProfile = useCallback(
    async (
      id: string,
      updates: Partial<Pick<ModProfile, 'name' | 'icon' | 'color' | 'modIds'>>,
    ) => {
      return updateModProfile(id, updates)
    },
    [],
  )

  const deleteProfile = useCallback(
    async (id: string) => {
      if (activeProfileId === id) {
        setActiveProfileId(null)
      }
      return deleteModProfile(id)
    },
    [activeProfileId],
  )

  const addMod = useCallback(async (profileId: string, modId: string) => {
    return addModToProfile(profileId, modId)
  }, [])

  const removeMod = useCallback(async (profileId: string, modId: string) => {
    return removeModFromProfile(profileId, modId)
  }, [])

  const isModInProfile = useCallback(
    (profileId: string, modId: string) => {
      const p = profiles.find((item) => item.id === profileId)
      if (!p) return false
      return p.modIds.some((id) => String(id) === String(modId))
    },
    [profiles],
  )

  return {
    profiles,
    activeProfile,
    activeProfileId,
    setActiveProfileId,
    createProfile,
    updateProfile,
    deleteProfile,
    addMod,
    removeMod,
    isModInProfile,
    reloadProfiles: syncProfiles,
  }
}
