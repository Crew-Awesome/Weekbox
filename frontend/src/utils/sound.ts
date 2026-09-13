/**
 * Sound effects utility for playing interface audio cues.
 * Preloads audio assets for low-latency playback and respects user settings.
 */

const SOUND_EFFECTS_KEY = "wb_sound_effects";

export const SoundPaths = {
  MODAL_OPEN: "/assets/sounds/win/openWindow.ogg",
  MODAL_CLOSE: "/assets/sounds/win/exitWindow.ogg",
  FAVORITE_ADD: "/assets/sounds/fav/fav.ogg",
  FAVORITE_REMOVE: "/assets/sounds/fav/unfav.ogg",
} as const;

/**
 * Checks whether sound effects are currently enabled in the application settings.
 * Defaults to true if no preference is stored.
 */
export function isSoundEffectsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const item = localStorage.getItem(SOUND_EFFECTS_KEY);
    return item === null ? true : item === "true";
  } catch {
    return true;
  }
}

/**
 * Audio element pool to allow overlapping or rapid trigger sounds without latency.
 */
const audioPool: Map<string, HTMLAudioElement[]> = new Map();
const POOL_SIZE = 3;

function getPooledAudio(path: string): HTMLAudioElement | null {
  if (typeof Audio === "undefined") return null;

  let pool = audioPool.get(path);
  if (!pool) {
    pool = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      try {
        const audio = new Audio(path);
        audio.preload = "auto";
        pool.push(audio);
      } catch {
        /**
         * Environment does not support audio constructor.
         */
      }
    }
    audioPool.set(path, pool);
  }

  const available = pool.find((a) => a.paused || a.ended);
  if (available) {
    return available;
  }

  try {
    const fresh = new Audio(path);
    fresh.preload = "auto";
    pool.push(fresh);
    return fresh;
  } catch {
    return null;
  }
}

/**
 * Plays an audio sound cue at the specified volume if sound effects are enabled.
 */
export function playSound(path: string, volume: number = 0.25): void {
  if (!isSoundEffectsEnabled()) return;

  try {
    const audio = getPooledAudio(path);
    if (!audio) return;

    audio.currentTime = 0;
    audio.volume = Math.max(0, Math.min(1, volume));
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        /**
         * Autoplay prevention or window focus denial handled silently.
         */
      });
    }
  } catch {
    /**
     * General audio error handled silently.
     */
  }
}

export const SoundEffects = {
  playModalOpen: () => playSound(SoundPaths.MODAL_OPEN, 0.25),
  playModalClose: () => playSound(SoundPaths.MODAL_CLOSE, 0.25),
  playFavoriteAdd: () => playSound(SoundPaths.FAVORITE_ADD, 0.3),
  playFavoriteRemove: () => playSound(SoundPaths.FAVORITE_REMOVE, 0.3),
};

export default SoundEffects;
