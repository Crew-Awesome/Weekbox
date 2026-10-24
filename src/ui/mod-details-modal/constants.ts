export interface EngineCategory {
  id: string
  name: string
  icon: string
  description?: string
}

export const ENGINE_CATEGORIES: Record<string, EngineCategory> = {
  vslice: {
    id: 'vslice',
    name: 'V-Slice Native',
    icon: '/imgs/icons/categories/vslice.png',
    description: 'The definitive rhythm gaming experience featuring official weeks and high-fidelity audio.',
  },
  psych: {
    id: 'psych',
    name: 'Psych Engine',
    icon: '/imgs/icons/categories/psych.png',
    description: 'High-performance extensible framework with real-time Lua/HScript modding support.',
  },
  codename: {
    id: 'codename',
    name: 'Codename Engine',
    icon: '/imgs/icons/categories/codename.png',
    description: 'Next-generation modding architecture designed for hot-reloading code and dynamic skins.',
  },
  fpsplus: {
    id: 'fpsplus',
    name: 'FPS Plus',
    icon: '/imgs/icons/categories/fpsplus.png',
    description: 'Classic high FPS rhythm fork optimized for ultra-smooth rendering.',
  },
  exe: {
    id: 'exe',
    name: 'Standalone Game / EXE',
    icon: '/imgs/icons/categories/exe.png',
    description: 'Independent executable or compiled game distribution.',
  },
}

export const getSupportedEngineCategories = (): EngineCategory[] =>
  Object.values(ENGINE_CATEGORIES)
