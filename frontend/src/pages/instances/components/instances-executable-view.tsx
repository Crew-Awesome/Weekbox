import React, { useState, useEffect } from "react";
import DOMPurify from "dompurify";
import { ModMediaCarousel } from "../../home/components/mod-details-modal/components/mod-media-carousel";
import { ModCreditsView } from "../../home/components/mod-details-modal/components/mod-credits-view";
import {
  HardDrive,
  Layers,
  Info,
  Users,
  Eye,
  Heart,
  Download,
  Calendar,
  RefreshCw,
  ExternalLink,
  Languages,
  Loader2,
} from "lucide-react";
import { formatFileSize } from "../../home/components/mod-details-modal/types";
import { useTranslationToggle } from "../hooks/use-translation-toggle";

interface InstancesExecutableViewProps {
  mod: any;
}

/**
 * Detailed view for an installed executable mod.
 * Displays:
 * 1. Large media carousel with automatic playback and pause on hover
 * 2. Dedicated clean thumbnail strip without glow effects
 * 3. Responsive full-width layout (split columns on wide viewports)
 * 4. Mod description with translation toggle and enlarged typography
 * 5. Collaborators / credits
 * 6. Rich mod details and statistics (views, likes, downloads, dates, size, rating)
 */
export const InstancesExecutableView: React.FC<InstancesExecutableViewProps> = ({ mod }) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const mediaList: string[] = Array.isArray(mod?.previewMedia) && mod.previewMedia.length > 0
    ? mod.previewMedia
    : mod?.img || mod?.thumbnail
      ? [mod.img || mod.thumbnail]
      : [];

  /** Auto-cycle through media carousel items unless user is hovering */
  useEffect(() => {
    if (mediaList.length <= 1 || isHovered) return;

    const interval = setInterval(() => {
      setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [mediaList.length, isHovered]);

  const rawDescription = mod?.htmlBody || mod?.description || "";
  const {
    isTranslating,
    showTranslated,
    translatedText,
    targetLanguage,
    toggleTranslation,
    canTranslate,
  } = useTranslationToggle(rawDescription);

  const activeDescription = showTranslated && translatedText ? translatedText : rawDescription;
  const sanitizedDescription = activeDescription
    ? DOMPurify.sanitize(activeDescription)
    : "No description provided.";

  if (!mod) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 text-center opacity-60">
        <HardDrive className="w-16 h-16 mb-4 text-[var(--wb-on-surface-variant)]" />
        <span className="text-xl font-black text-[var(--wb-on-surface)]">
          No Executable Mod Selected
        </span>
        <span className="text-sm text-[var(--wb-on-surface-variant)] mt-2">
          Select an installed executable mod from the left panel to view its media and details.
        </span>
      </div>
    );
  }

  const handleNextMedia = () => {
    if (!mediaList.length) return;
    setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  const handlePrevMedia = () => {
    if (!mediaList.length) return;
    setActiveMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  return (
    <div className="flex-1 flex flex-col w-full p-8 sm:p-10 lg:p-14 space-y-8">
      {/** Mod Title & Author Header (without 'Installed Executable Mod' badge) */}
      <div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[var(--wb-on-surface)] tracking-tight">
          {mod.name || mod.title}
        </h1>
        <span className="text-base sm:text-lg text-[var(--wb-on-surface-variant)] opacity-85 block mt-2">
          by <span className="font-bold text-[var(--wb-on-surface)]">{mod.author || "Unknown"}</span>
        </span>
      </div>

      {/** Full Width Responsive Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 w-full">
        {/** Left Column: Carousel, Thumbnails & Description */}
        <div className="xl:col-span-7 2xl:col-span-8 flex flex-col gap-8">
          <div
            className="w-full"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <ModMediaCarousel
              media={mediaList}
              fallbackImage={mod.img || mod.thumbnail}
              title={mod.name || mod.title}
              activeIndex={activeMediaIndex}
              onPrev={handlePrevMedia}
              onNext={handleNextMedia}
              aspectRatioClassName="aspect-[16/9]"
              roundedClassName="rounded-3xl"
            />

            {mediaList.length > 1 && (
              <div className="flex gap-3 mt-4 overflow-x-auto pb-2.5 scrollbar-thin scrollbar-thumb-[var(--wb-outline-variant)]/40">
                {mediaList.map((src, i) => (
                  <button
                    key={`thumb-${i}`}
                    type="button"
                    onClick={() => setActiveMediaIndex(i)}
                    className={`relative shrink-0 h-20 sm:h-24 aspect-[16/9] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                      activeMediaIndex === i
                        ? "border-[var(--wb-primary)] opacity-100 scale-[1.02]"
                        : "border-transparent opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={src}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-full bg-[var(--wb-surface-container-low)]/50 p-8 rounded-3xl border border-[var(--wb-outline-variant)]/20">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl sm:text-2xl font-black text-[var(--wb-on-surface)] flex items-center gap-3">
                <Layers className="w-5 h-5 text-[var(--wb-primary)]" />
                <span>Description</span>
              </h2>

              {canTranslate && (
                <button
                  type="button"
                  onClick={toggleTranslation}
                  disabled={isTranslating}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold transition-all bg-[var(--wb-surface-bright)] hover:bg-[var(--wb-surface-container-highest)] text-xs text-[var(--wb-primary)] border border-[var(--wb-outline-variant)]/30 hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  <Languages className="w-3.5 h-3.5" />
                  <span>
                    {isTranslating
                      ? "Translating..."
                      : showTranslated
                      ? "Show original"
                      : `Translate to ${targetLanguage === "es" ? "Spanish" : "English"}`}
                  </span>
                </button>
              )}
            </div>

            {isTranslating && (
              <div className="flex items-center gap-2 mb-4 px-3.5 py-1.5 rounded-xl bg-[var(--wb-primary)]/10 text-[var(--wb-primary)] text-xs font-semibold animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                <span>Translating description to {targetLanguage === "es" ? "Spanish" : "English"}...</span>
              </div>
            )}

            <div
              className="prose prose-invert max-w-none text-base sm:text-lg leading-relaxed text-[var(--wb-on-surface-variant)]"
              dangerouslySetInnerHTML={{ __html: sanitizedDescription }}
            />
          </div>
        </div>

        {/** Right Column: Mod Details & Credits */}
        <div className="xl:col-span-5 2xl:col-span-4 flex flex-col gap-8">
          <div className="w-full bg-[var(--wb-surface-container-low)]/50 p-8 rounded-3xl border border-[var(--wb-outline-variant)]/20">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--wb-on-surface)] mb-5 flex items-center gap-3">
              <Info className="w-5 h-5 text-[var(--wb-primary)]" />
              <span>Mod Details</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm sm:text-base">
              {mod.views !== undefined && (
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/10">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] opacity-70">
                    <Eye className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
                    <span>Views</span>
                  </div>
                  <span className="font-extrabold text-[var(--wb-on-surface)]">
                    {Intl.NumberFormat().format(mod.views)}
                  </span>
                </div>
              )}

              {mod.likes !== undefined && (
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/10">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] opacity-70">
                    <Heart className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
                    <span>Likes</span>
                  </div>
                  <span className="font-extrabold text-[var(--wb-on-surface)]">
                    {Intl.NumberFormat().format(mod.likes)}
                  </span>
                </div>
              )}

              {mod.downloads !== undefined && (
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/10">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] opacity-70">
                    <Download className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
                    <span>Downloads</span>
                  </div>
                  <span className="font-extrabold text-[var(--wb-on-surface)]">
                    {Intl.NumberFormat().format(mod.downloads)}
                  </span>
                </div>
              )}

              {mod.installedAt && (
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/10">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] opacity-70">
                    <HardDrive className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
                    <span>Installed Date</span>
                  </div>
                  <span className="font-extrabold text-[var(--wb-on-surface)]">
                    {new Date(mod.installedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                </div>
              )}

              {mod.submittedAt && (
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/10">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] opacity-70">
                    <Calendar className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
                    <span>Submitted</span>
                  </div>
                  <span className="font-extrabold text-[var(--wb-on-surface)]">
                    {new Date(mod.submittedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                </div>
              )}

              {mod.updatedAt && (
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/10">
                  <div className="flex items-center gap-1.5 text-xs text-[var(--wb-on-surface-variant)] opacity-70">
                    <RefreshCw className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
                    <span>Last Updated</span>
                  </div>
                  <span className="font-extrabold text-[var(--wb-on-surface)]">
                    {new Date(mod.updatedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}
                  </span>
                </div>
              )}

              {mod.size && (
                <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/10">
                  <span className="text-xs text-[var(--wb-on-surface-variant)] opacity-70">File Size</span>
                  <span className="font-extrabold text-[var(--wb-on-surface)]">
                    {formatFileSize(mod.size)}
                  </span>
                </div>
              )}

              <div className="flex flex-col gap-1 p-4 rounded-2xl bg-[var(--wb-surface-bright)]/40 border border-[var(--wb-outline-variant)]/10">
                <span className="text-xs text-[var(--wb-on-surface-variant)] opacity-70">Category</span>
                <span className="font-extrabold text-[var(--wb-on-surface)]">
                  Executable Mod
                </span>
              </div>

              {mod.id && (
                <a
                  href={`https://gamebanana.com/mods/${mod.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:col-span-2 flex items-center justify-between p-4 rounded-2xl bg-[var(--wb-surface-bright)]/40 hover:bg-[var(--wb-surface-bright)] border border-[var(--wb-outline-variant)]/10 transition-colors group"
                >
                  <div className="flex items-center gap-2">
                    <img
                      src="/assets/icons/app/gamebanana.webp"
                      alt="GameBanana"
                      className="w-4 h-4 object-contain opacity-80"
                    />
                    <span className="text-xs text-[var(--wb-on-surface-variant)] opacity-70">GameBanana ID</span>
                    <span className="font-mono font-bold text-[var(--wb-on-surface)] ml-1">#{mod.id}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-primary)] transition-colors" />
                </a>
              )}
            </div>
          </div>

          <div className="w-full bg-[var(--wb-surface-container-low)]/50 p-8 rounded-3xl border border-[var(--wb-outline-variant)]/20">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--wb-on-surface)] mb-5 flex items-center gap-3">
              <Users className="w-5 h-5 text-[var(--wb-primary)]" />
              <span>Collaborators & Credits</span>
            </h2>
            <ModCreditsView
              credits={mod.credits}
              authors={mod.authors}
              author={mod.author}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

