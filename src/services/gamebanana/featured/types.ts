export interface GameBananaFeaturingEntry {
  _sFeatureGroup?: string
  _sTitle?: string
  _tsDate?: number
}

export interface GameBananaFeaturedRecord {
  _idRow: number
  _sModelName?: string
  _sName?: string
  _sProfileUrl?: string
  _tsDateAdded?: number
  _tsDateUpdated?: number
  _tsDateModified?: number
  _nLikeCount?: number
  _nViewCount?: number
  _nDownloadCount?: number
  _aFeaturings?: GameBananaFeaturingEntry[]
}

export interface StoredFeaturedCache {
  version: number
  signature: string
  updatedAt: number
  mods: import('../types').GameBananaMod[]
}
