import React from 'react'
import type { CalloutToastItem } from '../types'
import { CalloutToastDownload } from './CalloutToastDownload'

export interface CalloutDragTrackProps {
  trackRef: React.RefObject<HTMLDivElement | null>
  statusIconRef: React.RefObject<HTMLSpanElement | null>
  statusTextRef: React.RefObject<HTMLSpanElement | null>
  progressBarRef: React.RefObject<HTMLDivElement | null>
  isPastThreshold: boolean
}

export const CalloutDragTrack: React.FC<CalloutDragTrackProps> = ({
  trackRef,
  statusIconRef,
  statusTextRef,
  progressBarRef,
  isPastThreshold,
}) => (
  <div
    ref={trackRef}
    className={`absolute inset-0 rounded-xl flex items-center justify-between px-3 z-0 pointer-events-none transition-colors duration-200 border border-dashed ${
      isPastThreshold
        ? 'bg-red-500/20 dark:bg-red-950/40 border-red-500/60 text-red-600 dark:text-red-300'
        : 'bg-black/5 dark:bg-white/5 border-black/20 dark:border-white/20 text-black/60 dark:text-white/60'
    }`}
    style={{ opacity: 0 }}
  >
    <div className="flex items-center gap-1.5 font-medium text-[11px] tracking-wide uppercase">
      <span
        ref={statusIconRef}
        className={`material-symbols-rounded text-[18px] transition-transform duration-200 ${
          isPastThreshold ? 'scale-110' : 'scale-100'
        }`}
      >
        arrow_forward
      </span>
      <span ref={statusTextRef}>Drag to cancel</span>
    </div>

    <div className="w-12 h-1 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
      <div
        ref={progressBarRef}
        className={`h-full transition-[width] duration-75 rounded-full ${
          isPastThreshold ? 'bg-red-500' : 'bg-current opacity-60'
        }`}
        style={{ width: '0%' }}
      />
    </div>
  </div>
)

export interface CalloutToastInnerContentProps {
  toast: CalloutToastItem
  isMinimized?: boolean
  currentShape: string
  downloadProgress: number
}

export const CalloutToastInnerContent: React.FC<CalloutToastInnerContentProps> = ({
  toast,
  isMinimized,
  currentShape,
  downloadProgress,
}) => (
  <>
    {toast.download ? (
      <div
        slot="icon"
        className="shrink-0 flex items-center justify-center -my-0.5"
      >
        <m3e-shape
          name={currentShape}
          style={
            {
              '--m3e-shape-size': isMinimized ? '22px' : '28px',
              '--m3e-shape-container-color':
                toast.download.status === 'completed'
                  ? 'var(--md-sys-color-tertiary, #388e3c)'
                  : 'var(--md-sys-color-primary)',
              '--m3e-shape-transition':
                'clip-path 0.85s cubic-bezier(0.4, 0, 0.2, 1)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'width 200ms ease, height 200ms ease',
            } as React.CSSProperties
          }
        >
          <span
            className="font-mono font-bold select-none tracking-tighter flex items-center justify-center w-full h-full text-center drop-shadow-sm"
            style={{
              position: 'absolute',
              inset: 0,
              fontSize: isMinimized ? '8.5px' : '9.5px',
              color:
                toast.download.status === 'completed'
                  ? 'var(--md-sys-color-on-tertiary, #ffffff)'
                  : 'var(--md-sys-color-on-primary, #ffffff)',
            }}
          >
            {toast.download.status === 'completed' ? (
              <span className="material-symbols-rounded text-[15px]">
                check
              </span>
            ) : (
              `${Math.round(downloadProgress)}%`
            )}
          </span>
        </m3e-shape>
      </div>
    ) : toast.icon ? (
      <span
        slot="icon"
        className="material-symbols-rounded select-none"
        style={{
          fontSize: isMinimized ? '17px' : '20px',
          verticalAlign: 'middle',
          transition: 'font-size 200ms ease',
        }}
      >
        {toast.icon}
      </span>
    ) : null}

    {toast.title && (
      <span
        slot="label"
        className="font-semibold text-xs sm:text-[13px] tracking-tight select-none flex items-center gap-1.5"
      >
        <span className="truncate max-w-[250px]">{toast.title}</span>
        {isMinimized && (
          <span className="text-[9.5px] font-normal uppercase tracking-wider px-1 py-0.2 rounded opacity-70 border border-current select-none shrink-0">
            {toast.download ? `${Math.round(downloadProgress)}%` : 'min'}
          </span>
        )}
      </span>
    )}

    <div
      className="grid transition-[grid-template-rows,opacity,margin] duration-250 ease-[cubic-bezier(0.2,0,0,1)]"
      style={{
        gridTemplateRows: isMinimized ? '0fr' : '1fr',
        opacity: isMinimized ? 0 : 1,
        marginTop: isMinimized ? 0 : '3px',
      }}
    >
      <div className="overflow-hidden">
        <div className="flex flex-col gap-1.5 text-xs sm:text-[12.5px] leading-snug pb-0.5">
          {(toast.message || toast.action) && (
            <div className="flex items-center justify-between gap-2">
              {toast.message && (
                <div className="flex-1 min-w-0 pr-1 select-text opacity-90 truncate">
                  {typeof toast.message === 'string' ? (
                    <span>{toast.message}</span>
                  ) : (
                    toast.message
                  )}
                </div>
              )}

              {toast.action && (
                <div className="shrink-0 -mr-1" data-interactive="true">
                  <m3e-button
                    variant="text"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation()
                      toast.action?.onClick(toast)
                    }}
                    style={
                      {
                        '--m3e-button-container-height': '24px',
                        '--m3e-button-leading-space': '8px',
                        '--m3e-button-trailing-space': '8px',
                        fontSize: '11.5px',
                        fontWeight: '600',
                      } as React.CSSProperties
                    }
                  >
                    {toast.action.label}
                  </m3e-button>
                </div>
              )}
            </div>
          )}

          {toast.download && (
            <CalloutToastDownload
              download={toast.download}
              downloadProgress={downloadProgress}
            />
          )}
        </div>
      </div>
    </div>
  </>
)
