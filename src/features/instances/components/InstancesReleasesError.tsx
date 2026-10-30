import React from 'react'

export interface InstancesReleasesErrorProps {
  error: string
  isLoading: boolean
  onRetry: () => void
}

export const InstancesReleasesError: React.FC<InstancesReleasesErrorProps> = ({
  error,
  isLoading,
  onRetry,
}) => {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border p-4"
      style={{
        backgroundColor:
          'color-mix(in srgb, var(--md-sys-color-error-container) 55%, transparent)',
        borderColor:
          'color-mix(in srgb, var(--md-sys-color-error) 42%, transparent)',
        color: 'var(--md-sys-color-on-error-container)',
      }}
    >
      <span className="material-symbols-rounded text-[20px] shrink-0">
        error
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">Could not load releases</p>
        <p className="text-xs opacity-80 break-words">{error}</p>
      </div>
      <button
        type="button"
        onClick={onRetry}
        disabled={isLoading}
        className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer hover:opacity-85 disabled:opacity-50 disabled:cursor-default"
        style={{
          borderColor:
            'color-mix(in srgb, var(--md-sys-color-error) 45%, transparent)',
        }}
      >
        Retry
      </button>
    </div>
  )
}
