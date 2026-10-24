import React from 'react'
import { Topbar } from '@/ui/topbar'

export const InstancesView: React.FC = () => {
  return (
    <div className="w-full min-h-full flex flex-col">
      <Topbar
        title="Instances"
        subtitle="Management of independent execution environments"
      />

      <div className="flex-1 flex flex-col gap-6 p-4 sm:p-8">
        <div
          className="flex-1 flex flex-col items-center justify-center p-8 rounded-[24px] border border-dashed text-center min-h-[240px]"
          style={{
            borderColor: 'var(--md-sys-color-outline-variant)',
            color: 'var(--md-sys-color-on-surface-variant)',
          }}
        >
          <span className="material-symbols-rounded text-4xl mb-2 opacity-60">
            construction
          </span>
          <h2
            className="text-lg font-medium"
            style={{ color: 'var(--md-sys-color-on-surface)' }}
          >
            Work In Progress
          </h2>
          <p className="text-sm mt-1">
            This section is currently under development.
          </p>
        </div>
      </div>
    </div>
  )
}
