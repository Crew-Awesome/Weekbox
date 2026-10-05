import React from "react";
import {
  Heart,
  Languages,
  Loader2,
  Pencil,
  User,
} from "lucide-react";
import { ModNavPills, type ModModalTab } from "./mod-nav-pills";
import { ModCreditsView } from "./mod-credits-view";
import { ModDetailsTab } from "./mod-details-tab";

export interface ModDetailsInfoSectionProps {
  variant?: "mobile" | "desktop";
  displayCard: any;
  engineName: string;
  formatDate: (timestamp?: number) => string;
  formatFullDate: (timestamp?: number) => string;
  isInstalled: boolean;
  localInstalledAt?: number;
  authorAvatar?: string;
  avatarError: boolean;
  setAvatarError: React.Dispatch<React.SetStateAction<boolean>>;
  isEditingTitle: boolean;
  setIsEditingTitle: React.Dispatch<React.SetStateAction<boolean>>;
  titleInput: string;
  setTitleInput: React.Dispatch<React.SetStateAction<string>>;
  handleSaveTitle: () => void;
  isEditingDesc: boolean;
  setIsEditingDesc: React.Dispatch<React.SetStateAction<boolean>>;
  descInput: string;
  setDescInput: React.Dispatch<React.SetStateAction<string>>;
  handleSaveDesc: () => void;
  activeTab: ModModalTab;
  setActiveTab: React.Dispatch<React.SetStateAction<ModModalTab>>;
  validFilesCount: number;
  isFav: boolean;
  handleToggleFavorite: (e: React.MouseEvent) => void;
  isTranslating: boolean;
  translatedHtml: string | null;
  showTranslated: boolean;
  setShowTranslated: React.Dispatch<React.SetStateAction<boolean>>;
  targetLanguage: string;
  onManualTranslate?: () => void;
  handleDownload: (url: string, id: string) => void;
  handleManage: () => void;
}

export const ModDetailsInfoSection: React.FC<ModDetailsInfoSectionProps> = ({
  variant = "desktop",
  displayCard,
  engineName,
  formatDate,
  formatFullDate,
  isInstalled,
  localInstalledAt,
  authorAvatar,
  avatarError,
  setAvatarError,
  isEditingTitle,
  setIsEditingTitle,
  titleInput,
  setTitleInput,
  handleSaveTitle,
  isEditingDesc,
  setIsEditingDesc,
  descInput,
  setDescInput,
  handleSaveDesc,
  activeTab,
  setActiveTab,
  validFilesCount,
  isFav,
  handleToggleFavorite,
  isTranslating,
  translatedHtml,
  showTranslated,
  setShowTranslated,
  targetLanguage,
  onManualTranslate,
  handleDownload,
  handleManage,
}) => {
  const isDesktop = variant === "desktop";

  return (
    <>
      <div className="shrink-0 flex flex-col mb-1">
        <div className="flex items-start gap-3">
          {isEditingTitle ? (
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={titleInput}
                onChange={(e) => setTitleInput(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveTitle();
                  if (e.key === "Escape") {
                    setTitleInput(displayCard?.name || "");
                    setIsEditingTitle(false);
                  }
                }}
                autoFocus
                className={`w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-primary)]/60 focus:border-[var(--wb-primary)] rounded-lg ${
                  isDesktop ? "px-3 py-1.5 text-2xl md:text-3xl" : "px-2.5 py-1 text-xl"
                } font-bold text-[var(--wb-on-surface)] outline-none font-display shadow-inner`}
                placeholder="Mod title..."
              />
            </div>
          ) : (
            <div
              onClick={() => isInstalled && setIsEditingTitle(true)}
              className={`group flex-1 min-w-0 ${isInstalled ? "cursor-pointer" : ""}`}
              title={isInstalled ? "Click to edit title" : displayCard?.name}
            >
              <h1
                className={`${
                  isDesktop
                    ? "text-2xl md:text-3xl lg:text-4xl"
                    : "text-2xl"
                } font-bold text-[var(--wb-on-surface)] leading-tight font-display break-words line-clamp-2`}
                title={displayCard?.name}
              >
                <span>{displayCard?.name}</span>
                {isInstalled && (
                  <span className={`inline-flex items-center align-middle ${isDesktop ? "ml-2" : "ml-1.5"} opacity-60 group-hover:opacity-100 group-hover:text-[var(--wb-primary)] transition-all`}>
                    <Pencil className={`${isDesktop ? "w-4 h-4 md:w-5 md:h-5" : "w-4 h-4"} shrink-0`} />
                  </span>
                )}
              </h1>
            </div>
          )}
        </div>

        {displayCard?.description && (
          <p className={`text-[var(--wb-on-surface-variant)] ${isDesktop ? "text-xs md:text-sm mt-1.5" : "text-xs mt-1"} line-clamp-2 leading-relaxed opacity-85`}>
            {displayCard.description}
          </p>
        )}

        <div className={`flex items-center ${isDesktop ? "gap-2 mt-1.5 mb-0.5" : "gap-1.5 mt-1 mb-0.5"}`}>
          <span className={`text-[var(--wb-on-surface-variant)] ${isDesktop ? "text-xs md:text-sm" : "text-xs"}`}>
            by
          </span>
          <div className="flex items-center gap-1.5 min-w-0">
            {authorAvatar && !avatarError ? (
              <img
                src={authorAvatar}
                alt={displayCard?.author || "Author"}
                className={`${isDesktop ? "w-5 h-5 md:w-5.5 md:h-5.5" : "w-4.5 h-4.5"} rounded-full object-cover shrink-0 border border-white/10 shadow-sm`}
                onError={() => setAvatarError(true)}
              />
            ) : (
              <div className={`${isDesktop ? "w-5 h-5 md:w-5.5 md:h-5.5" : "w-4.5 h-4.5"} rounded-full bg-[var(--wb-surface-container-highest)] flex items-center justify-center shrink-0 border border-white/10`}>
                <User className={`${isDesktop ? "w-3 h-3 md:w-3.5 md:h-3.5" : "w-2.5 h-2.5"} text-[var(--wb-on-surface-variant)] opacity-70`} />
              </div>
            )}
            <span className={`text-[var(--wb-on-surface)] ${isDesktop ? "text-xs md:text-sm" : "text-xs"} font-semibold truncate`}>
              {displayCard?.author || "Unknown"}
            </span>
          </div>
        </div>

        <ModNavPills
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          contributorsCount={displayCard.credits?.reduce((acc: number, g: any) => acc + g.authors.length, 0) || displayCard.authors?.length}
          filesCount={validFilesCount}
          extraActions={
            <button
              type="button"
              onClick={handleToggleFavorite}
              title={isFav ? "Remove from favorites" : "Add to favorites"}
              aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
              className={`${
                isDesktop ? "w-7 h-7 md:w-8 md:h-8" : "w-7 h-7"
              } rounded-full flex items-center justify-center shrink-0 border transition-colors duration-100 cursor-pointer ml-0.5 ${
                isFav
                  ? "bg-red-500/15 border-red-500/30 text-red-500 hover:bg-red-500/25"
                  : "bg-[var(--wb-surface-bright)]/60 border-transparent hover:border-[var(--wb-outline-variant)]/60 text-[var(--wb-on-surface-variant)] hover:text-red-400 hover:bg-red-500/10"
              }`}
            >
              <Heart
                className={`${
                  isDesktop ? "w-3.5 h-3.5 md:w-4 md:h-4" : "w-3.5 h-3.5"
                } transition-transform duration-100 active:scale-125 ${
                  isFav ? "fill-red-500 text-red-500" : "fill-transparent"
                }`}
              />
            </button>
          }
        />
        <hr className={`border-[var(--wb-outline-variant)]/30 ${isDesktop ? "my-3 md:my-4" : "mb-4"}`} />
      </div>

      <div className={isDesktop ? "flex-1 overflow-y-auto custom-scrollbar flex flex-col min-h-0 pr-1" : "flex flex-col"}>
        {activeTab === "description" && (
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {isInstalled && !isEditingDesc && (
                <button
                  type="button"
                  onClick={() => setIsEditingDesc(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-container-low)] hover:bg-[var(--wb-surface-container-high)] text-xs font-semibold text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-primary)] transition-colors cursor-pointer border border-white/5 shrink-0"
                  title="Edit description"
                >
                  <Pencil className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                  <span>Edit description</span>
                </button>
              )}

              {isTranslating ? (
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-primary)]/10 text-[var(--wb-primary)] text-xs font-semibold border border-[var(--wb-primary)]/20 shrink-0 animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                  <span>Translating...</span>
                </div>
              ) : translatedHtml ? (
                <button
                  type="button"
                  onClick={() => setShowTranslated(!showTranslated)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-primary)]/15 hover:bg-[var(--wb-primary)]/25 text-[var(--wb-primary)] text-xs font-semibold border border-[var(--wb-primary)]/30 transition-all cursor-pointer shrink-0"
                  title={showTranslated ? "Click to show original description" : "Click to show translated description"}
                >
                  <Languages className="w-3.5 h-3.5 shrink-0" />
                  <span>{showTranslated ? `Translated (${targetLanguage === "es" ? "ES" : "EN"})` : "Show Translation"}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onManualTranslate}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--wb-surface-container-low)] hover:bg-[var(--wb-surface-container-high)] text-xs font-semibold text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] transition-colors cursor-pointer border border-white/5 shrink-0"
                  title={`Translate description to ${targetLanguage === "es" ? "Spanish" : "English"}`}
                >
                  <Languages className="w-3.5 h-3.5 text-[var(--wb-primary)] shrink-0" />
                  <span>Translate to {targetLanguage === "es" ? "Spanish" : "English"}</span>
                </button>
              )}
            </div>

            {isEditingDesc ? (
              <div className={`flex flex-col gap-2 ${isDesktop ? "pb-4" : "pb-6"}`}>
                <textarea
                  value={descInput}
                  onChange={(e) => setDescInput(e.target.value)}
                  onBlur={handleSaveDesc}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setDescInput(displayCard.description || "");
                      setIsEditingDesc(false);
                    }
                  }}
                  autoFocus
                  rows={isDesktop ? 7 : 6}
                  className={`w-full bg-[var(--wb-surface-container-high)] border border-[var(--wb-primary)]/60 focus:border-[var(--wb-primary)] rounded-lg p-3 ${
                    isDesktop ? "text-sm md:text-base" : "text-sm"
                  } text-[var(--wb-on-surface)] outline-none custom-scrollbar resize-y shadow-inner font-sans`}
                  placeholder="Enter custom mod description..."
                />
                <div className="flex items-center justify-between text-[11px] text-[var(--wb-on-surface-variant)] px-1">
                  <span>Click outside or press Escape to finish</span>
                  <button
                    type="button"
                    onClick={handleSaveDesc}
                    className="px-2.5 py-1 rounded-md bg-[var(--wb-primary)]/20 hover:bg-[var(--wb-primary)]/30 text-[var(--wb-primary)] font-semibold text-xs cursor-pointer transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : displayCard.htmlBody ? (
              <div
                onClick={() => isInstalled && setIsEditingDesc(true)}
                className={`text-[var(--wb-on-surface-variant)] prose prose-invert ${
                  isDesktop ? "prose-sm md:prose-base pb-4" : "prose-sm pb-6"
                } max-w-full overflow-x-hidden break-words [&_*]:max-w-full [&_pre]:whitespace-pre-wrap [&_pre]:break-words [&_table]:block [&_table]:overflow-x-auto ${
                  isInstalled ? "cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1" : ""
                }`}
                title={isInstalled ? "Click to edit description" : undefined}
                dangerouslySetInnerHTML={{
                  __html: showTranslated && translatedHtml ? translatedHtml : displayCard.htmlBody,
                }}
              />
            ) : (
              <p
                onClick={() => isInstalled && setIsEditingDesc(true)}
                className={`text-[var(--wb-on-surface-variant)] ${
                  isDesktop ? "text-sm md:text-base pb-4" : "text-sm pb-6"
                } break-words ${
                  isInstalled ? "cursor-pointer hover:bg-white/[0.02] rounded-lg transition-colors p-1" : ""
                }`}
                title={isInstalled ? "Click to edit description" : undefined}
              >
                {showTranslated && translatedHtml ? translatedHtml : displayCard.description}
              </p>
            )}
          </div>
        )}

        {activeTab === "contributors" && (
          <ModCreditsView
            credits={displayCard.credits}
            authors={displayCard.authors}
            author={displayCard.author}
          />
        )}

        {activeTab === "details" && (
          <ModDetailsTab
            displayCard={{
              ...displayCard,
              installedAt: localInstalledAt || displayCard.installedAt,
            }}
            engineName={engineName}
            formatDate={formatDate}
            formatFullDate={formatFullDate}
            onDownloadFile={handleDownload}
            onManageFile={handleManage}
            isInstalled={isInstalled}
          />
        )}
      </div>
    </>
  );
};
