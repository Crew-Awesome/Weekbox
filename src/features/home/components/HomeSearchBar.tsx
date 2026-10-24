import React, { useCallback } from 'react'
import type { ModItem } from '@/ui/mod-details-modal'
import { useAnimatedPlaceholder } from '@/utils'
import {
  useRecentSearches,
  useGameBananaSearch,
  useM3eSearchView,
} from '../hooks'
import {
  SEARCH_PHRASES,
  SearchLoadingState,
  SearchResultsList,
  RecentSearchesList,
} from './SearchBar'

export interface HomeSearchBarProps {
  initialQuery?: string
  onSelectMod: (mod: ModItem) => void
  onSearch?: (query: string) => void
}

/**
 * Material Design 3 docked search view with animated typewriter placeholder,
 * persistent recent searches, M3E vertical overflow, and direct GameBanana search.
 */
export const HomeSearchBar: React.FC<HomeSearchBarProps> = ({
  initialQuery = '',
  onSelectMod,
  onSearch,
}) => {
  const {
    recentSearches,
    addRecentSearch,
    removeRecentSearch,
    clearAllRecentSearches,
  } = useRecentSearches()

  const {
    query,
    setQuery,
    cleanQuery,
    searchResults,
    isSearching,
    hasSearched,
    cancelDebounce,
    resetSearchState,
    executeSearch,
    handleQueryChange,
  } = useGameBananaSearch({
    initialQuery,
    onOpenDropdown: () => {
      if (searchViewRef.current) {
        searchViewRef.current.open = true
      }
    },
  })

  const handleClear = useCallback(() => {
    resetSearchState()
    onSearch?.('')
  }, [resetSearchState, onSearch])

  const {
    inputRef,
    searchViewRef,
    openSearch,
    closeSearch,
    handleInputBlur,
  } = useM3eSearchView({
    onClear: handleClear,
  })

  const animatedPlaceholder = useAnimatedPlaceholder({
    phrases: SEARCH_PHRASES,
    typingSpeed: 60,
    deletingSpeed: 30,
    pauseTime: 2400,
    emptyPauseTime: 400,
    enabled: query.length === 0,
  })

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const searchTerm = (inputRef.current?.value ?? query).trim()
      if (searchTerm) {
        addRecentSearch(searchTerm)
      }
      cancelDebounce()
      closeSearch()
      onSearch?.(searchTerm)
    } else if (e.key === 'Escape') {
      closeSearch()
    }
  }

  const handleSelectMod = (mod: ModItem) => {
    if (cleanQuery) {
      addRecentSearch(cleanQuery)
    }
    closeSearch()
    onSelectMod(mod)
  }

  const handleSelectRecentSearch = (term: string) => {
    setQuery(term)
    addRecentSearch(term)
    void executeSearch(term)
    onSearch?.(term)
    inputRef.current?.focus()
  }

  return (
    <div className="w-full max-w-2xl mx-auto relative flex justify-center h-[46px]">
      <m3e-search-view
        ref={searchViewRef}
        mode="docked"
        contained
        className="w-full h-[46px]"
        style={
          {
            width: '100%',
            height: '46px',
            '--m3e-search-bar-container-color':
              'var(--md-sys-color-surface-container-high)',
            '--m3e-search-bar-leading-icon-color':
              'var(--md-sys-color-on-surface-variant)',
            '--m3e-search-bar-trailing-icon-color':
              'var(--md-sys-color-on-surface-variant)',
            '--m3e-search-view-container-color':
              'var(--md-sys-color-surface-container-high)',
            '--m3e-search-view-contained-container-color':
              'var(--md-sys-color-surface-container-high)',
            '--m3e-search-view-divider-color':
              'var(--md-sys-color-outline-variant)',
            '--m3e-search-bar-container-height': '46px',
            '--m3e-search-view-docked-header-container-height': '46px',
            '--m3e-search-view-docked-container-shape': '24px',
            '--m3e-search-view-contained-docked-bar-shape': '24px',
            borderRadius: '24px',
            border: '1px solid var(--md-sys-color-outline-variant)',
            boxShadow:
              '0 1px 3px color-mix(in srgb, var(--md-sys-color-scrim) 12%, transparent)',
          } as React.CSSProperties
        }
      >
        <input
          ref={inputRef}
          slot="input"
          type="text"
          value={query}
          onChange={handleQueryChange}
          onKeyDown={handleKeyDown}
          onFocus={openSearch}
          onClick={openSearch}
          onBlur={handleInputBlur}
          placeholder={animatedPlaceholder}
          className="w-full bg-transparent border-none outline-none text-sm font-medium tracking-tight"
          style={{
            color: 'var(--md-sys-color-on-surface)',
          }}
        />

        <m3e-overflow
          direction="vertical"
          className="w-full max-h-[380px] select-none"
          style={
            {
              maxHeight: '380px',
              '--m3e-overflow-inset': '4px',
            } as React.CSSProperties
          }
        >
          <div className="flex flex-col p-2 gap-2 w-full pr-3">
            {isSearching ? (
              <SearchLoadingState query={cleanQuery} />
            ) : searchResults.length > 0 ? (
              <SearchResultsList
                results={searchResults}
                onSelectMod={handleSelectMod}
              />
            ) : hasSearched && cleanQuery ? (
              <div className="py-8 text-center text-xs text-[var(--md-sys-color-on-surface-variant)]">
                No GameBanana mods found matching &quot;{cleanQuery}&quot;. Try
                another title or mod ID.
              </div>
            ) : cleanQuery ? (
              <SearchLoadingState query={cleanQuery} />
            ) : (
              <RecentSearchesList
                recentSearches={recentSearches}
                onSelectRecent={handleSelectRecentSearch}
                onRemoveRecent={removeRecentSearch}
                onClearAll={clearAllRecentSearches}
              />
            )}
          </div>
        </m3e-overflow>
      </m3e-search-view>
    </div>
  )
}
