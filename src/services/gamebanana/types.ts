export interface ModCreditAuthor {
  name: string
  role?: string
  avatarUrl?: string
  id?: number
}

export interface ModCreditGroup {
  groupName: string
  authors: ModCreditAuthor[]
}

export interface GameBananaFile {
  _idRow: number
  _sFile: string
  _nFilesize: number
  _sDescription?: string
  _tsDateAdded?: number
  _tsDateModified?: number
  date?: number | string
  _nDownloadCount?: number
  _sAnalysisState?: string
  _sDownloadUrl?: string
  _sMd5Checksum?: string
}

export interface GameBananaCategoryNode {
  _idRow?: number
  _sName?: string
  _sProfileUrl?: string
}

export interface GameBananaImageNode {
  _sBaseUrl?: string
  _sFile?: string
  _sFile800?: string
  _sFile530?: string
  _sFile220?: string
}

export interface GameBananaRawRecord {
  _idRow: number
  _sName?: string
  _sDescription?: string
  _sText?: string
  _sVersion?: string
  _nLikeCount?: number
  _nViewCount?: number
  _nDownloadCount?: number
  _nUpdateCount?: number
  _tsDateAdded?: number
  _tsDateUpdated?: number
  _tsDateModified?: number
  _bIsNsfw?: boolean
  _bContainsNsfw?: boolean
  _aGame?: { _idRow?: number; _sName?: string }
  _aSubmitter?: {
    _idRow?: number
    _sName?: string
    _sAvatarUrl?: string
    _aAvatar?: { _sBaseUrl?: string; _sFile?: string }
  }
  _aCategory?: GameBananaCategoryNode
  _aSuperCategory?: GameBananaCategoryNode
  _aRootCategory?: GameBananaCategoryNode
  _aSubCategory?: GameBananaCategoryNode
  _aPreviewMedia?: { _aImages?: GameBananaImageNode[] }
  _aImages?: GameBananaImageNode[]
  _aCredits?: unknown
  _aFiles?: GameBananaFile[] | Record<string, GameBananaFile>
  _aUpdates?: unknown[]
  _aExternalLinks?: unknown[]
  _aAlternateFileSources?: unknown[]
  _aStudio?: { _sName?: string }
  engineId?: string
  engine?: { id?: string; name?: string }
  categoryName?: string
  previewMedia?: string[]
  __injectedCategoryId?: number
  __resolvedEngineId?: string
}

export interface GameBananaItem {
  id: number
  gameId: number
  title: string
  description: string
  htmlBody: string
  author: string
  userId: number
  userPfp: string
  authors: string[]
  likes: number
  views: number
  downloads: number
  submittedAt: number
  updatedAt?: number
  timeAgo: string
  thumbnail: string
  isNsfw: boolean
  previewMedia?: string[]
  files?: GameBananaFile[] | Record<string, GameBananaFile>
  credits?: ModCreditGroup[]
}

export interface GameBananaMod extends GameBananaItem {
  engineId?: string
  engineIcon?: string
  __featuredLabel?: string
  __featuredCategoryId?: number
  __isCommunityPick?: boolean
  version?: string
  updatesCount?: number
  updates?: unknown[]
  externalLinks?: unknown[]
  studio?: string
  categoryName?: string
}

export type GameBananaTool = GameBananaItem
