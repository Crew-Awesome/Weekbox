import React from 'react'

interface CalloutToastActionsProps {
  canMinimize?: boolean
  allowClose?: boolean
  isMinimized?: boolean
  onToggleMinimize: (e: React.MouseEvent) => void
  onDismiss: () => void
}

export const CalloutToastActions: React.FC<CalloutToastActionsProps> = ({
  canMinimize,
  allowClose,
  isMinimized,
  onToggleMinimize,
  onDismiss,
}) => {
  return (
    <div
      className="absolute top-2 right-2 z-20 flex items-center gap-0.5"
      data-interactive="true"
      onClick={(e) => e.stopPropagation()}
    >
      {canMinimize && (
        <button
          type="button"
          onClick={onToggleMinimize}
          className="p-1 rounded-full opacity-60 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          title={isMinimized ? 'Expand notification' : 'Minimize notification'}
          aria-label={
            isMinimized ? 'Expand notification' : 'Minimize notification'
          }
        >
          <span
            className={`material-symbols-rounded text-[17px] transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)] ${
              isMinimized ? 'rotate-180' : 'rotate-0'
            }`}
          >
            keyboard_arrow_up
          </span>
        </button>
      )}

      {allowClose && (
        <button
          type="button"
          onClick={onDismiss}
          className="p-1 rounded-full opacity-50 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
          title="Close notification"
          aria-label="Close notification"
        >
          <span className="material-symbols-rounded text-[17px]">close</span>
        </button>
      )}
    </div>
  )
}

