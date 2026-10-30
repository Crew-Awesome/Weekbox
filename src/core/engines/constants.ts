import type {
  EngineDefinition,
  EngineId,
  GitHubRelease,
  GitHubReleaseAsset,
} from './types'

export const ENGINE_DEFINITIONS: Record<EngineId, EngineDefinition> = {
  psych: {
    id: 'psych',
    categoryId: 28367,
    name: 'Psych Engine',
    repo: 'ShadowMario/FNF-PsychEngine',
    icon: '/imgs/icons/categories/psych.png',
    banner: '/imgs/banners/psych.webp',
    description:
      "The premier modular engine for Friday Night Funkin' mods, featuring Lua script support, customizable weeks, and high performance.",
    accent: '#ff4d6d',
    defaultExeName: 'PsychEngine.exe',
  },
  codename: {
    id: 'codename',
    categoryId: 34764,
    name: 'Codename Engine',
    repo: 'CodenameCrew/CodenameEngine',
    icon: '/imgs/icons/categories/codename.png',
    description:
      "Next-generation FNF modding engine built from the ground up for extreme softcoding, Haxe scripting, modularity, and smooth gameplay.",
    accent: '#8b5cf6',
    defaultExeName: 'CodenameEngine.exe',
  },
  pslice: {
    id: 'pslice',
    categoryId: 43798,
    name: 'P-Slice Engine',
    repo: 'Psych-Slice/P-Slice',
    icon: '/imgs/icons/categories/pslice.png',
    description:
      'A community fork porting official V-Slice mechanics, state management, and visual polish to the Psych Engine base.',
    accent: '#fb7185',
    defaultExeName: 'P-Slice.exe',
  },
  vslice: {
    id: 'vslice',
    categoryId: 29202,
    name: 'V-Slice Engine',
    repo: 'FunkinCrew/Funkin',
    icon: '/imgs/icons/categories/vslice.png',
    banner: '/imgs/banners/vslice.webp',
    description:
      "The official Friday Night Funkin' base engine featuring polymod system, charts, and base game weeks.",
    accent: '#38bdf8',
    defaultExeName: 'Funkin.exe',
  },
  psychonline: {
    id: 'psychonline',
    categoryId: 43788,
    name: 'Psych Online',
    repo: 'Snirozu/Funkin-Psych-Online',
    icon: '/imgs/icons/categories/psychonline.png',
    banner: '/imgs/banners/psychonline.webp',
    description:
      "Online multiplayer modification for Friday Night Funkin' powered by Psych Engine with custom matchmaking.",
    accent: '#34d399',
    defaultExeName: 'PsychOnline.exe',
  },
  fpsplus: {
    id: 'fpsplus',
    categoryId: 43850,
    name: 'FPS Plus',
    repo: 'ThatRozebudDude/FPS-Plus-Public',
    icon: '/imgs/icons/categories/fpsplus.png',
    description:
      'The classic FPS Plus engine by Rozebud with improved input accuracy, custom keybinds, and uncapped framerate.',
    accent: '#fbbf24',
    defaultExeName: 'FPSPlus.exe',
  },
}

export const SUPPORTED_ENGINE_IDS = Object.keys(ENGINE_DEFINITIONS) as EngineId[]

export const EXCLUDED_ENGINE_IDS = ['executable'] as const

export type EnginePlatform =
  | 'windows'
  | 'linux'
  | 'macos'
  | 'android'
  | 'other'

export function detectPlatform(): EnginePlatform {
  if (typeof navigator === 'undefined') return 'windows'
  const ua = navigator.userAgent.toLowerCase()
  if (ua.includes('android')) return 'android'
  if (ua.includes('win')) return 'windows'
  if (ua.includes('mac') || ua.includes('darwin')) return 'macos'
  if (ua.includes('linux')) return 'linux'
  return 'windows'
}

const NATIVE_EXTENSION_PLATFORMS: Partial<Record<string, EnginePlatform>> = {
  '.exe': 'windows',
  '.msi': 'windows',
  '.dmg': 'macos',
  '.pkg': 'macos',
  '.appimage': 'linux',
  '.deb': 'linux',
  '.rpm': 'linux',
  '.apk': 'android',
}

const ARCHIVE_EXTENSIONS = new Set([
  '.zip',
  '.7z',
  '.rar',
  '.tar',
  '.tar.gz',
  '.tar.xz',
  '.tgz',
])

const INSTALLABLE_ARCHIVE_EXTENSIONS = new Set(['.zip', '.7z', '.tar.gz'])

function getAssetExtension(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith('.tar.gz')) return '.tar.gz'
  if (lower.endsWith('.tar.xz')) return '.tar.xz'
  const dot = lower.lastIndexOf('.')
  return dot >= 0 ? lower.slice(dot) : ''
}

function isArchiveAsset(name: string): boolean {
  return ARCHIVE_EXTENSIONS.has(getAssetExtension(name))
}

function isInstallableArchiveAsset(name: string): boolean {
  return INSTALLABLE_ARCHIVE_EXTENSIONS.has(getAssetExtension(name))
}

function getAssetPlatforms(name: string): Set<EnginePlatform> {
  const platforms = new Set<EnginePlatform>()
  const tokens = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)

  for (const token of tokens) {
    if (
      token === 'win' ||
      token === 'win32' ||
      token === 'win64' ||
      token.startsWith('windows')
    ) {
      platforms.add('windows')
    }
    if (token.startsWith('linux')) {
      platforms.add('linux')
    }
    if (
      token === 'mac' ||
      token === 'osx' ||
      token === 'darwin' ||
      token.startsWith('macos')
    ) {
      platforms.add('macos')
    }
    if (token.startsWith('android')) {
      platforms.add('android')
    }
  }

  const nativePlatform = NATIVE_EXTENSION_PLATFORMS[getAssetExtension(name)]
  if (nativePlatform) {
    platforms.add(nativePlatform)
  }

  return platforms
}

function is64BitAsset(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    /\b(x64|x86[_-]?64|amd64|win64|windows64|64bit)\b/i.test(lower) ||
    /[-_.]64\b/i.test(lower) ||
    /64bit/i.test(lower) ||
    lower.includes('windows64') ||
    lower.includes('win64')
  )
}

function is32BitAsset(name: string): boolean {
  const lower = name.toLowerCase()
  return (
    /\b(x86|ia32|i386|i686|win32|windows32|32bit)\b/i.test(lower) ||
    /[-_.]32\b/i.test(lower) ||
    /32bit/i.test(lower) ||
    lower.includes('windows32') ||
    lower.includes('win32')
  )
}

function getAssetArchitectureRank(name: string): number {
  if (is64BitAsset(name)) return 3
  if (is32BitAsset(name)) return 1
  return 2
}

export function getCompatibleAsset(
  assets: GitHubReleaseAsset[],
  platformOverride?: EnginePlatform,
): GitHubReleaseAsset | undefined {
  if (!assets || assets.length === 0) return undefined

  const platform = platformOverride || detectPlatform()
  const archives = assets.filter((asset) => isArchiveAsset(asset.name))
  if (archives.length === 0) return undefined

  if (platform === 'other') {
    return (
      archives.find((asset) => isInstallableArchiveAsset(asset.name)) ??
      archives[0]
    )
  }

  const platformArchives = archives.filter((asset) =>
    getAssetPlatforms(asset.name).has(platform),
  )

  if (platformArchives.length > 0) {
    const sorted = [...platformArchives].sort((a, b) => {
      const rankDiff =
        getAssetArchitectureRank(b.name) - getAssetArchitectureRank(a.name)
      if (rankDiff !== 0) return rankDiff

      const installableA = isInstallableArchiveAsset(a.name) ? 1 : 0
      const installableB = isInstallableArchiveAsset(b.name) ? 1 : 0
      return installableB - installableA
    })
    return sorted[0]
  }

  return undefined
}

export function releaseHasCompatibleAsset(
  release: GitHubRelease,
  platformOverride?: EnginePlatform,
): boolean {
  return Boolean(getCompatibleAsset(release.assets, platformOverride))
}

export function getRecommendedAsset(
  assets: GitHubReleaseAsset[],
  platformOverride?: EnginePlatform,
): GitHubReleaseAsset | undefined {
  return getCompatibleAsset(assets, platformOverride)
}
