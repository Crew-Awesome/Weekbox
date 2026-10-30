import React, { useRef, useState, useEffect, useCallback } from 'react'

interface M3eVideoPlayerProps {
  sources: string[]
  poster?: string
  autoPlay?: boolean
  className?: string
  onClose?: () => void
}

function formatTime(seconds: number): string {
  if (Number.isNaN(seconds) || !Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s < 10 ? '0' : ''}${s}`
}

export const M3eVideoPlayer: React.FC<M3eVideoPlayerProps> = ({
  sources,
  poster,
  autoPlay = true,
  className = '',
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [currentSourceIndex, setCurrentSourceIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isBuffering, setIsBuffering] = useState(true)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showControls, setShowControls] = useState(true)

  const currentSrc = sources[currentSourceIndex] || sources[0] || ''

  const handleSourceError = useCallback(() => {
    if (currentSourceIndex + 1 < sources.length) {
      console.warn(
        `[WeekBox News] Video source failed: ${currentSrc}. Trying next source: ${sources[currentSourceIndex + 1]}`,
      )
      setCurrentSourceIndex((prev) => prev + 1)
    } else {
      setIsBuffering(false)
      console.error('[WeekBox News] All video sources failed.')
    }
  }, [currentSourceIndex, sources, currentSrc])

  const scheduleControlsHide = useCallback(() => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    setShowControls(true)
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false)
      }
    }, 2800)
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused) {
      void video.play().catch(() => {})
      setIsPlaying(true)
      scheduleControlsHide()
    } else {
      video.pause()
      setIsPlaying(false)
      setShowControls(true)
    }
  }, [scheduleControlsHide])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setIsMuted(video.muted)
  }, [])

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value)
    setVolume(val)
    if (videoRef.current) {
      videoRef.current.volume = val
      videoRef.current.muted = val === 0
      setIsMuted(val === 0)
    }
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value)
    setCurrentTime(time)
    if (videoRef.current) {
      videoRef.current.currentTime = time
    }
  }

  const toggleFullscreen = () => {
    const container = containerRef.current
    if (!container) return
    if (!document.fullscreenElement) {
      void container.requestFullscreen?.().catch(() => {})
    } else {
      void document.exitFullscreen?.().catch(() => {})
    }
  }

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
    document.addEventListener('fullscreenchange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      onMouseMove={scheduleControlsHide}
      onClick={scheduleControlsHide}
      className={`relative w-full overflow-hidden bg-black flex items-center justify-center select-none rounded-[28px] border border-[var(--md-sys-color-outline-variant)] shadow-2xl ${className}`}
      style={{
        aspectRatio: '16/9',
        maxHeight: '85vh',
      }}
    >
      <video
        ref={videoRef}
        src={currentSrc}
        poster={poster}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        onClick={togglePlay}
        onPlay={() => {
          setIsPlaying(true)
          scheduleControlsHide()
        }}
        onPause={() => {
          setIsPlaying(false)
          setShowControls(true)
        }}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime)
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration)
            setIsBuffering(false)
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onError={handleSourceError}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/40 pointer-events-none z-20">
          <m3e-circular-progress-indicator
            indeterminate
            style={
              {
                '--m3e-progress-indicator-color': 'var(--md-sys-color-primary)',
                width: '48px',
                height: '48px',
              } as React.CSSProperties
            }
          />
        </div>
      )}

      {/* Center Big Play Button when paused */}
      {!isPlaying && !isBuffering && (
        <button
          type="button"
          onClick={togglePlay}
          className="absolute inset-0 m-auto w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-transform hover:scale-110 active:scale-95 cursor-pointer z-20"
          style={{
            backgroundColor: 'var(--md-sys-color-primary-container)',
            color: 'var(--md-sys-color-on-primary-container)',
          }}
          aria-label="Play"
        >
          <span className="material-symbols-rounded text-3xl leading-none ml-1">
            play_arrow
          </span>
        </button>
      )}

      {/* Close button in top-right corner if modal */}
      {onClose && (
        <div
          className={`absolute top-4 right-4 z-30 transition-opacity duration-300 ${
            showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <m3e-icon-button
            onClick={onClose}
            title="Close"
            style={
              {
                cursor: 'pointer',
                '--m3e-icon-button-container-color': 'rgba(0, 0, 0, 0.65)',
                '--m3e-icon-button-icon-color': '#ffffff',
              } as React.CSSProperties
            }
          >
            <span className="material-symbols-rounded text-xl leading-none">
              close
            </span>
          </m3e-icon-button>
        </div>
      )}

      {/* Bottom M3E Controls Pill */}
      <div
        className={`absolute bottom-3 left-4 right-4 z-30 flex flex-col gap-1.5 px-4 py-2.5 rounded-[22px] transition-all duration-300 backdrop-blur-xl ${
          showControls || !isPlaying
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
        style={{
          backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface-container) 85%, transparent)',
          border: '1px solid color-mix(in srgb, var(--md-sys-color-outline-variant) 40%, transparent)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.36)',
        }}
      >
        {/* Progress Bar / Scrubber */}
        <div className="w-full flex items-center gap-2">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[var(--md-sys-color-primary)] bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_25%,transparent)] transition-all"
            style={{
              accentColor: 'var(--md-sys-color-primary)',
            }}
          />
        </div>

        {/* Action Controls Row */}
        <div className="w-full flex items-center justify-between text-xs text-[var(--md-sys-color-on-surface)]">
          <div className="flex items-center gap-2">
            <m3e-icon-button
              onClick={togglePlay}
              title={isPlaying ? 'Pause' : 'Play'}
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded text-xl leading-none">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </m3e-icon-button>

            <div className="flex items-center gap-1 font-mono text-[11px] text-[var(--md-sys-color-on-surface-variant)] select-none">
              <span>{formatTime(currentTime)}</span>
              <span>/</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <m3e-icon-button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded text-xl leading-none">
                {isMuted || volume === 0 ? 'volume_off' : 'volume_up'}
              </span>
            </m3e-icon-button>

            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="w-16 h-1 rounded-lg appearance-none cursor-pointer accent-[var(--md-sys-color-primary)] bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_25%,transparent)]"
              style={{
                accentColor: 'var(--md-sys-color-primary)',
              }}
            />

            <m3e-icon-button
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
              style={{ cursor: 'pointer' }}
            >
              <span className="material-symbols-rounded text-xl leading-none">
                {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
              </span>
            </m3e-icon-button>
          </div>
        </div>
      </div>
    </div>
  )
}

