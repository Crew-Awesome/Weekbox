import type { ModCreditAuthor, ModCreditGroup } from './types'

export function extractAuthors(metaCredits: unknown): string[] {
  const authors: string[] = []
  if (metaCredits && typeof metaCredits === 'object') {
    for (const group of Object.values(metaCredits)) {
      if (Array.isArray(group)) {
        for (const credit of group) {
          if (Array.isArray(credit) && typeof credit[0] === 'string') {
            authors.push(credit[0])
          }
        }
      }
    }
  }
  return Array.from(new Set(authors))
}

function parseCreditAuthor(item: unknown): ModCreditAuthor | null {
  if (!item) return null
  if (typeof item === 'string') {
    const trimmed = item.trim()
    return trimmed ? { name: trimmed } : null
  }
  if (Array.isArray(item)) {
    const name = item[0] ? String(item[0]).trim() : ''
    if (!name) return null
    return {
      name,
      role: item[1] ? String(item[1]).trim() : undefined,
      id: typeof item[2] === 'number' ? item[2] : undefined,
    }
  }
  if (typeof item === 'object') {
    const obj = item as Record<string, unknown>
    const name = obj._sName || obj.name || obj._sMemberName
    if (!name) return null
    const roleVal = obj._sRole || obj.role
    const avatarVal = obj._sAvatarUrl || obj.avatarUrl || obj._sMemberAvatarUrl
    const idVal = obj._idRow || obj.id || obj._nMemberId
    return {
      name: String(name).trim(),
      role: roleVal ? String(roleVal).trim() : undefined,
      avatarUrl: typeof avatarVal === 'string' ? avatarVal : undefined,
      id: typeof idVal === 'number' ? idVal : undefined,
    }
  }
  return null
}

export function extractCreditGroups(rawCredits: unknown): ModCreditGroup[] {
  if (!rawCredits) return []
  const groups: ModCreditGroup[] = []

  const appendToDefaultGroup = (author: ModCreditAuthor) => {
    let defaultGroup = groups.find((g) => g.groupName === 'Contributors')
    if (!defaultGroup) {
      defaultGroup = { groupName: 'Contributors', authors: [] }
      groups.push(defaultGroup)
    }
    defaultGroup.authors.push(author)
  }

  if (Array.isArray(rawCredits)) {
    for (const group of rawCredits) {
      if (!group || typeof group !== 'object') {
        const parsed = parseCreditAuthor(group)
        if (parsed) appendToDefaultGroup(parsed)
        continue
      }

      const grp = group as Record<string, unknown>
      if (grp._sGroupName || grp.groupName || grp._aAuthors || grp.authors) {
        const groupName = String(grp._sGroupName || grp.groupName || 'Contributors')
        const rawAuthors = grp._aAuthors || grp.authors || []
        const authors: ModCreditAuthor[] = []
        if (Array.isArray(rawAuthors)) {
          for (const a of rawAuthors) {
            const parsed = parseCreditAuthor(a)
            if (parsed) authors.push(parsed)
          }
        }
        if (authors.length > 0) {
          groups.push({ groupName, authors })
        }
      } else {
        const parsed = parseCreditAuthor(group)
        if (parsed) appendToDefaultGroup(parsed)
      }
    }
  } else if (typeof rawCredits === 'object') {
    for (const [key, val] of Object.entries(rawCredits)) {
      if (!val) continue
      const authors: ModCreditAuthor[] = []
      if (Array.isArray(val)) {
        for (const a of val) {
          const parsed = parseCreditAuthor(a)
          if (parsed) authors.push(parsed)
        }
      } else {
        const parsed = parseCreditAuthor(val)
        if (parsed) authors.push(parsed)
      }
      if (authors.length > 0) {
        groups.push({ groupName: key, authors })
      }
    }
  }

  return groups
}
