import { initHost } from '@/core/host'
import { ensureWeekBoxLibrary } from '@/core/storage/weekbox-library'

export interface ModProfile {
  id: string
  name: string
  icon?: string
  color?: string
  modIds: string[]
  createdAt: number
  updatedAt: number
}

export const PROFILES_CHANGED_EVENT = 'wbr:profiles_changed'
const PROFILES_STORAGE_KEY = 'wbr:mod_profiles'

export function getModProfilesSync(): ModProfile[] {
  try {
    if (typeof window !== 'undefined') {
      const raw = localStorage.getItem(PROFILES_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) return parsed
      }
    }
  } catch {
  }
  return []
}

export async function getModProfiles(): Promise<ModProfile[]> {
  const host = initHost()
  const cached = getModProfilesSync()
  try {
    const { paths } = await ensureWeekBoxLibrary()
    const filePath = `${paths.dataDir}/profiles.json`.replace(/\\/g, '/')
    const exists = await host.fs.exists(filePath)
    if (!exists) {
      if (cached.length > 0) {
        await host.fs.writeTextFile(filePath, JSON.stringify(cached, null, 2))
      }
      return cached
    }
    const raw = await host.fs.readTextFile(filePath)
    if (!raw || !raw.trim()) return cached
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      if (typeof window !== 'undefined') {
        localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(parsed))
      }
      return parsed
    }
  } catch {
  }
  return cached
}

export async function saveModProfiles(profiles: ModProfile[]): Promise<void> {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROFILES_STORAGE_KEY, JSON.stringify(profiles))
      window.dispatchEvent(
        new CustomEvent(PROFILES_CHANGED_EVENT, { detail: profiles }),
      )
    }
  } catch {
  }
  try {
    const host = initHost()
    const { paths } = await ensureWeekBoxLibrary()
    const filePath = `${paths.dataDir}/profiles.json`.replace(/\\/g, '/')
    await host.fs.writeTextFile(filePath, JSON.stringify(profiles, null, 2))
  } catch {
  }
}

export async function createModProfile(
  name: string,
  icon = 'folder',
  color?: string,
): Promise<ModProfile> {
  const current = await getModProfiles()
  const newProfile: ModProfile = {
    id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: name.trim() || 'New Folder',
    icon,
    color,
    modIds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const next = [...current, newProfile]
  await saveModProfiles(next)
  return newProfile
}

export async function updateModProfile(
  id: string,
  updates: Partial<Pick<ModProfile, 'name' | 'icon' | 'color' | 'modIds'>>,
): Promise<ModProfile | null> {
  const current = await getModProfiles()
  const profile = current.find((p) => p.id === id)
  if (!profile) return null
  if (updates.name !== undefined) profile.name = updates.name.trim() || profile.name
  if (updates.icon !== undefined) profile.icon = updates.icon
  if (updates.color !== undefined) profile.color = updates.color
  if (updates.modIds !== undefined) profile.modIds = updates.modIds
  profile.updatedAt = Date.now()
  await saveModProfiles([...current])
  return profile
}

export async function deleteModProfile(profileId: string): Promise<boolean> {
  const current = await getModProfiles()
  const next = current.filter((p) => p.id !== profileId)
  if (next.length === current.length) return false
  await saveModProfiles(next)
  return true
}

export async function addModToProfile(
  profileId: string,
  modId: string,
): Promise<boolean> {
  const current = await getModProfiles()
  const profile = current.find((p) => p.id === profileId)
  if (!profile) return false
  const targetId = String(modId)
  if (profile.modIds.some((id) => String(id) === targetId)) return false
  profile.modIds.push(targetId)
  profile.updatedAt = Date.now()
  await saveModProfiles([...current])
  return true
}

export async function removeModFromProfile(
  profileId: string,
  modId: string,
): Promise<boolean> {
  const current = await getModProfiles()
  const profile = current.find((p) => p.id === profileId)
  if (!profile) return false
  const targetId = String(modId)
  const prevLen = profile.modIds.length
  profile.modIds = profile.modIds.filter((id) => String(id) !== targetId)
  if (profile.modIds.length === prevLen) return false
  profile.updatedAt = Date.now()
  await saveModProfiles([...current])
  return true
}
