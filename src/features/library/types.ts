export type LibrarySortOption = 'recent' | 'name' | 'size' | 'engine'

export interface LibraryFilterState {
  searchQuery: string
  engineFilter: string | string[]
  sortBy: LibrarySortOption
  filterFavorites: boolean
  filterBookmarks: boolean
}

export interface LibraryEngineSummary {
  id: string
  name: string
  icon?: string
  count: number
}

export interface LibraryStats {
  totalMods: number
  totalSizeBytes: number
  favoritesCount: number
  bookmarksCount: number
}
