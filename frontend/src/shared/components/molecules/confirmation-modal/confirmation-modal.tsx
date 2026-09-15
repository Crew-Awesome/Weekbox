import React, { useState, useEffect } from "react";
import { Modal } from "../../atoms/modal/modal";
import {
  AlertTriangle,
  Clock,
  HardDrive,
  Layers,
  Check,
  Loader2,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";

export interface ConfirmationStats {
  count?: number;
  countLabel?: string;
  totalSize?: string;
  estimatedTime?: string;
}

export interface SelectableModalItem {
  id: string;
  folderName: string;
  name: string;
  description?: string;
  thumbnail?: string;
  sizeFormatted?: string;
  bytes?: number;
}

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (dontAskAgain: boolean) => void;
  title: string;
  description: React.ReactNode;
  stats?: ConfirmationStats;
  isLoadingStats?: boolean;
  selectableItems?: SelectableModalItem[];
  selectedItemIds?: Set<string>;
  onToggleItem?: (id: string) => void;
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  cancelLabel?: string;
  confirmLabel?: string;
  showDontAskAgain?: boolean;
  isDestructive?: boolean;
  isLoading?: boolean;
}

/**
 * Reusable Confirmation & Warning Modal.
 * Used for storage migrations, destructive uninstalls, and critical actions.
 */
export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  stats,
  isLoadingStats = false,
  selectableItems,
  selectedItemIds,
  onToggleItem,
  onSelectAll,
  onDeselectAll,
  cancelLabel = "Nevermind!",
  confirmLabel = "LET'S GO!",
  showDontAskAgain = true,
  isDestructive = false,
  isLoading = false,
}) => {
  const [dontAskAgain, setDontAskAgain] = useState(false);
  const [isModSelectionOpen, setIsModSelectionOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsModSelectionOpen(false);
    }
  }, [isOpen]);

  const handleConfirm = () => {
    onConfirm(dontAskAgain);
  };

  const hasSelectable = Boolean(selectableItems && selectableItems.length > 0);
  const selectedCount = selectedItemIds ? selectedItemIds.size : (selectableItems?.length ?? 0);

  return (
    <>
      {/* Primary Confirmation Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        zIndex={100}
        edgeSpacing={{
          isStaticSize: true,
          mobile: ["92vw", "auto"],
          desktop: ["min(560px, 92vw)", "auto"],
        }}
        modalClassName="w-full max-w-lg z-[100] border border-white/10 shadow-2xl rounded-3xl bg-[var(--wb-surface-container)] overflow-hidden"
      >
        <div className="flex flex-col p-6 sm:p-8 gap-6 w-full text-left">
          {/* Header with Icon */}
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                isDestructive
                  ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/20"
              }`}
            >
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h3 className="text-xl sm:text-2xl font-black text-[var(--wb-on-surface)] tracking-tight">
                {title}
              </h3>
              <span className="text-xs uppercase tracking-wider font-bold text-[var(--wb-on-surface-variant)] opacity-70">
                Confirmation Required
              </span>
            </div>
          </div>

          {/* Description Body */}
          <div className="text-sm sm:text-base text-[var(--wb-on-surface-variant)] leading-relaxed">
            {description}
          </div>

          {/* Optional Stats Card or Calculating Loader */}
          {isLoadingStats ? (
            <div className="flex flex-col items-center justify-center gap-2 p-5 rounded-2xl bg-[var(--wb-surface-container-low)] border border-white/5 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--wb-primary)]" />
              <span className="text-xs sm:text-sm font-semibold text-[var(--wb-on-surface-variant)] animate-pulse">
                Calculating size, items and estimated time...
              </span>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-3 gap-2 p-3 sm:p-4 rounded-2xl bg-[var(--wb-surface-container-low)] border border-white/5 text-center">
              {stats.count !== undefined && (
                <div className="flex flex-col items-center justify-center gap-1 p-2">
                  <Layers className="w-4 h-4 text-[var(--wb-primary)] mb-0.5" />
                  <span className="text-sm sm:text-base font-black text-[var(--wb-on-surface)]">
                    {stats.count}
                  </span>
                  <span className="text-[11px] text-[var(--wb-on-surface-variant)] truncate max-w-full">
                    {stats.countLabel || "Items"}
                  </span>
                </div>
              )}

              {stats.totalSize && (
                <div className="flex flex-col items-center justify-center gap-1 p-2 border-l border-white/5">
                  <HardDrive className="w-4 h-4 text-[var(--wb-primary)] mb-0.5" />
                  <span className="text-sm sm:text-base font-black text-[var(--wb-on-surface)]">
                    {stats.totalSize}
                  </span>
                  <span className="text-[11px] text-[var(--wb-on-surface-variant)] truncate max-w-full">
                    Approx. Size
                  </span>
                </div>
              )}

              {stats.estimatedTime && (
                <div className="flex flex-col items-center justify-center gap-1 p-2 border-l border-white/5">
                  <Clock className="w-4 h-4 text-[var(--wb-primary)] mb-0.5" />
                  <span className="text-sm sm:text-base font-black text-[var(--wb-on-surface)]">
                    {stats.estimatedTime}
                  </span>
                  <span className="text-[11px] text-[var(--wb-on-surface-variant)] truncate max-w-full">
                    Est. Time
                  </span>
                </div>
              )}
            </div>
          ) : null}

          {/* Button to Open Dedicated Mod Selection Modal */}
          {hasSelectable && (
            <button
              type="button"
              onClick={() => setIsModSelectionOpen(true)}
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--wb-surface-container-low)] hover:bg-[var(--wb-surface-container-high)] border border-white/5 hover:border-white/10 transition-all cursor-pointer text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-[var(--wb-primary)]/10 text-[var(--wb-primary)] flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-xs sm:text-sm font-bold text-[var(--wb-on-surface)] group-hover:text-[var(--wb-primary)] transition-colors truncate">
                    Select Specific Mods to Relocate
                  </span>
                  <span className="text-[11px] text-[var(--wb-on-surface-variant)]">
                    Choose which mods to keep or delete
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--wb-primary)]/15 text-[var(--wb-primary)]">
                  {selectedCount} of {selectableItems?.length}
                </span>
                <ChevronRight className="w-4 h-4 text-[var(--wb-on-surface-variant)] group-hover:translate-x-0.5 transition-transform" />
              </div>
            </button>
          )}

          {/* Don't ask again Checkbox */}
          {showDontAskAgain && (
            <label className="flex items-center gap-3 cursor-pointer select-none group w-fit">
              <div
                className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
                  dontAskAgain
                    ? "bg-[var(--wb-primary)] border-[var(--wb-primary)] text-[var(--wb-on-primary)]"
                    : "border-white/20 bg-white/5 group-hover:border-white/40"
                }`}
                onClick={() => setDontAskAgain(!dontAskAgain)}
              >
                {dontAskAgain && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <span
                className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-on-surface)] transition-colors"
                onClick={() => setDontAskAgain(!dontAskAgain)}
              >
                Don't ask me again
              </span>
            </label>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-5 sm:px-6 py-3 rounded-2xl bg-[var(--wb-surface-container-highest)] hover:bg-white/10 text-[var(--wb-on-surface)] font-bold text-sm sm:text-base transition-all cursor-pointer border border-white/5 disabled:opacity-50"
            >
              {cancelLabel}
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={
                isLoading ||
                isLoadingStats ||
                Boolean(hasSelectable && selectedItemIds && selectedItemIds.size === 0)
              }
              className={`px-6 sm:px-8 py-3 rounded-2xl font-black text-sm sm:text-base transition-all shadow-lg disabled:opacity-50 ${
                isLoading || isLoadingStats
                  ? "cursor-wait"
                  : "cursor-pointer hover:scale-105 active:scale-95"
              } ${
                isDestructive
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30"
                  : "bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] shadow-black/40"
              }`}
            >
              {isLoading
                ? "Processing..."
                : isLoadingStats
                ? "Calculating..."
                : hasSelectable && selectedItemIds && selectedItemIds.size === 0
                ? "Select at least 1 mod"
                : confirmLabel}
            </button>
          </div>
        </div>
      </Modal>

      {/* Secondary Separate Modal for Mod Selection */}
      {hasSelectable && (
        <Modal
          isOpen={isModSelectionOpen}
          onClose={() => setIsModSelectionOpen(false)}
          zIndex={110}
          edgeSpacing={{
            isStaticSize: true,
            mobile: ["94vw", "auto"],
            desktop: ["min(660px, 92vw)", "auto"],
          }}
          modalClassName="w-full max-w-2xl z-[110] border border-white/10 shadow-2xl rounded-3xl bg-[var(--wb-surface-container)] overflow-hidden"
        >
          <div className="flex flex-col p-6 sm:p-7 gap-4 w-full max-h-[85vh] text-left overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[var(--wb-primary)]/10 text-[var(--wb-primary)] flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div className="flex flex-col min-w-0">
                  <h4 className="text-lg font-black text-[var(--wb-on-surface)] truncate">
                    Select Specific Mods to Relocate
                  </h4>
                  <span className="text-xs text-[var(--wb-on-surface-variant)]">
                    Only selected mods will be moved to the new location
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[var(--wb-primary)]/15 text-[var(--wb-primary)]">
                  {selectedCount} of {selectableItems?.length}
                </span>
                <button
                  type="button"
                  onClick={() => setIsModSelectionOpen(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] transition-colors cursor-pointer"
                  title="Close mod selection"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Warning Alert: Placed prominently at the top */}
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-300 shrink-0">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-amber-400" />
              <div className="flex flex-col text-xs sm:text-sm leading-relaxed">
                <span className="font-bold text-amber-200">
                  Unselected mods will be permanently deleted!
                </span>
                <span className="text-amber-300/80">
                  Any mod unchecked below will not be migrated and will be permanently removed from your disk to free up space.
                </span>
              </div>
            </div>

            {/* Quick Filters */}
            <div className="flex items-center justify-between px-1 shrink-0">
              <span className="text-xs font-semibold text-[var(--wb-on-surface-variant)]">
                Filter Selection
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onSelectAll}
                  className="text-xs font-bold text-[var(--wb-primary)] hover:underline cursor-pointer"
                >
                  Select All
                </button>
                <span className="text-white/20 text-xs">|</span>
                <button
                  type="button"
                  onClick={onDeselectAll}
                  className="text-xs font-bold text-rose-400 hover:underline cursor-pointer"
                >
                  Deselect All
                </button>
              </div>
            </div>

            {/* Mod Cards List */}
            <div className="flex flex-col gap-2 overflow-y-auto flex-1 pr-1 max-h-[46vh] custom-scrollbar">
              {selectableItems?.map((item) => {
                const isSelected = selectedItemIds ? selectedItemIds.has(item.id) : true;
                return (
                  <div
                    key={item.id}
                    onClick={() => onToggleItem?.(item.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer gap-3 ${
                      isSelected
                        ? "bg-[var(--wb-surface-container-low)] border-white/10 hover:border-white/20"
                        : "bg-transparent border-white/5 opacity-40 hover:opacity-75"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded-lg border flex items-center justify-center shrink-0 transition-all ${
                          isSelected
                            ? "bg-[var(--wb-primary)] border-[var(--wb-primary)] text-[var(--wb-on-primary)]"
                            : "border-white/30 bg-white/5"
                        }`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                      </div>

                      {/* Thumbnail / Icon */}
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={item.name}
                          className="w-11 h-11 rounded-xl object-cover bg-black/20 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-[var(--wb-surface-container-highest)] flex items-center justify-center shrink-0 text-[var(--wb-primary)]">
                          <HardDrive className="w-5 h-5" />
                        </div>
                      )}

                      {/* Title & Description */}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-[var(--wb-on-surface)] truncate">
                          {item.name}
                        </span>
                        {item.description && (
                          <span className="text-xs text-[var(--wb-on-surface-variant)] line-clamp-1 truncate">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Size badge */}
                    {item.sizeFormatted && (
                      <span className="text-xs font-mono px-2.5 py-1 rounded-lg bg-white/5 text-[var(--wb-on-surface-variant)] shrink-0 border border-white/5">
                        {item.sizeFormatted}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer / Apply Button */}
            <div className="pt-2 border-t border-white/10 shrink-0 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsModSelectionOpen(false)}
                className="w-full sm:w-auto px-7 py-3 rounded-2xl bg-[var(--wb-primary)] hover:opacity-90 text-[var(--wb-on-primary)] font-black text-sm transition-all shadow-lg cursor-pointer"
              >
                Done ({selectedCount} Selected)
              </button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
};
