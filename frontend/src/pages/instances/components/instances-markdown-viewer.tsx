import React, { useMemo, useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { FileText, Calendar, Loader2, Languages } from "lucide-react";
import type { EngineReleaseItem } from "@core";
import { useTranslationToggle } from "../hooks/use-translation-toggle";
import { ModMediaCarousel } from "../../home/components/mod-details-modal/components/mod-media-carousel";

interface InstancesMarkdownViewerProps {
  release: EngineReleaseItem | null;
  isLoading?: boolean;
}

function parseMarkdownToHtml(markdown: string): string {
  if (!markdown) return "";

  let html = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/```([\s\S]*?)```/g, (_match, code) => {
    return `<pre class="bg-[var(--wb-surface-container-highest)] p-5 rounded-2xl my-5 overflow-x-auto text-sm sm:text-base font-mono border border-[var(--wb-outline-variant)]/30 text-[var(--wb-on-surface)]"><code>${code.trim()}</code></pre>`;
  });

  html = html.replace(/`([^`]+)`/g, '<code class="px-2 py-0.5 rounded-lg bg-[var(--wb-surface-container-highest)] text-sm sm:text-base font-mono text-[var(--wb-primary)]">$1</code>');

  html = html.replace(/^#### (.*$)/gim, '<h4 class="text-lg sm:text-xl font-bold text-[var(--wb-on-surface)] mt-5 mb-2">$1</h4>');
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl sm:text-2xl font-bold text-[var(--wb-on-surface)] mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl sm:text-3xl font-black text-[var(--wb-on-surface)] mt-8 mb-3 border-b border-[var(--wb-outline-variant)]/20 pb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl sm:text-4xl font-black text-[var(--wb-on-surface)] mt-8 mb-4 border-b border-[var(--wb-outline-variant)]/30 pb-3">$1</h1>');

  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-black text-[var(--wb-on-surface)]">$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>');

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-[var(--wb-primary)] hover:underline font-bold">$1</a>');

  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-[var(--wb-primary)] pl-5 py-2 my-4 bg-[var(--wb-surface-bright)]/40 rounded-r-2xl text-base sm:text-lg italic opacity-90">$1</blockquote>');

  html = html.replace(/^\s*[-*+]\s+(.*$)/gim, '<li class="ml-5 list-disc text-base sm:text-lg text-[var(--wb-on-surface-variant)] leading-relaxed my-1.5">$1</li>');

  html = html.replace(/\n\n+/g, '<div class="h-4"></div>');

  return DOMPurify.sanitize(html);
}

/**
 * Renders the markdown changelog / release notes for the selected engine version.
 * Formatted with enlarged typography, spacious padding, translation toggles, and high-readability headers.
 */
export const InstancesMarkdownViewer: React.FC<InstancesMarkdownViewerProps> = ({
  release,
  isLoading = false,
}) => {
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const mediaList = useMemo(() => {
    return Array.isArray(release?.previewMedia) ? release.previewMedia : [];
  }, [release?.previewMedia]);

  useEffect(() => {
    setActiveMediaIndex(0);
  }, [release?.id]);

  useEffect(() => {
    if (mediaList.length <= 1 || isHovered) return;
    const interval = setInterval(() => {
      setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
    }, 4500);
    return () => clearInterval(interval);
  }, [mediaList.length, isHovered]);

  const thumbnailsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (thumbnailsRef.current && mediaList.length > 0) {
      const container = thumbnailsRef.current;
      const activeButton = container.children[activeMediaIndex] as HTMLElement;
      if (activeButton) {
        const scrollLeft =
          activeButton.offsetLeft - container.clientWidth / 2 + activeButton.clientWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: "smooth" });
      }
    }
  }, [activeMediaIndex, mediaList.length]);

  const handleNextMedia = () => {
    if (!mediaList.length) return;
    setActiveMediaIndex((prev) => (prev + 1) % mediaList.length);
  };

  const handlePrevMedia = () => {
    if (!mediaList.length) return;
    setActiveMediaIndex((prev) => (prev - 1 + mediaList.length) % mediaList.length);
  };

  const {
    isTranslating,
    showTranslated,
    translatedText,
    targetLanguage,
    toggleTranslation,
    canTranslate,
  } = useTranslationToggle(release?.body);

  const activeContent = showTranslated && translatedText ? translatedText : release?.body || "";

  const renderedHtml = useMemo(() => {
    if (!activeContent) return "";
    return parseMarkdownToHtml(activeContent);
  }, [activeContent]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 gap-4 opacity-60">
        <Loader2 className="w-10 h-10 animate-spin text-[var(--wb-primary)]" />
        <span className="text-base font-bold text-[var(--wb-on-surface)]">
          Loading release notes...
        </span>
      </div>
    );
  }

  if (!release) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-16 text-center opacity-60">
        <FileText className="w-16 h-16 mb-4 text-[var(--wb-on-surface-variant)]" />
        <span className="text-xl font-black text-[var(--wb-on-surface)]">
          No Version Selected
        </span>
        <span className="text-sm text-[var(--wb-on-surface-variant)] mt-2">
          Select a version from the left panel to inspect its changelog and release notes.
        </span>
      </div>
    );
  }

  return (
    <div className="w-full p-4 sm:p-8 md:p-12 lg:p-16">
      {/** Media Carousel for releases with preview banners (e.g. mobile V-Slice / Play Store) */}
      {mediaList.length > 0 && (
        <div
          className="w-full mb-8"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <ModMediaCarousel
            media={mediaList}
            fallbackImage={mediaList[0]}
            title={release.name || `Version ${release.version}`}
            activeIndex={activeMediaIndex}
            onPrev={handlePrevMedia}
            onNext={handleNextMedia}
            aspectRatioClassName="aspect-[16/9]"
            roundedClassName="rounded-3xl"
          />

          {mediaList.length > 1 && (
            <div
              ref={thumbnailsRef}
              className="flex gap-3 mt-4 overflow-x-auto pb-2.5 scrollbar-thin scrollbar-thumb-[var(--wb-outline-variant)]/40"
            >
              {mediaList.map((src, i) => (
                <button
                  key={`thumb-${i}`}
                  type="button"
                  onClick={() => setActiveMediaIndex(i)}
                  className={`relative shrink-0 h-16 sm:h-20 aspect-[16/9] rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
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
      )}

      {/* Release Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 sm:pb-8 border-b border-[var(--wb-outline-variant)]/20 mb-4 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-[var(--wb-on-surface)] tracking-tight">
            {release.name || `Version ${release.version}`}
          </h1>
        </div>

        <div className="flex items-center flex-wrap gap-3 shrink-0">
          {canTranslate && (
            isTranslating ? (
              <div className="flex items-center gap-2 text-sm sm:text-base text-[var(--wb-primary)] shrink-0 bg-[var(--wb-surface-bright)] px-4 py-2.5 rounded-2xl border border-[var(--wb-outline-variant)]/20 animate-pulse">
                <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 animate-spin shrink-0" />
                <span>Translating...</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={toggleTranslation}
                className={`flex items-center gap-2 text-sm sm:text-base shrink-0 bg-[var(--wb-surface-bright)] hover:bg-[var(--wb-surface-container-highest)] px-4 py-2.5 rounded-2xl border transition-all cursor-pointer select-none ${
                  showTranslated
                    ? "text-[var(--wb-primary)] border-[var(--wb-primary)]/40 font-bold"
                    : "text-[var(--wb-on-surface-variant)] hover:text-[var(--wb-on-surface)] border-[var(--wb-outline-variant)]/20"
                }`}
                title={showTranslated ? "Click to show original notes" : `Click to translate to ${targetLanguage === "es" ? "Spanish" : "English"}`}
              >
                <Languages className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--wb-primary)] shrink-0" />
                <span>
                  {showTranslated
                    ? `Translated (${targetLanguage === "es" ? "ES" : "EN"})`
                    : `Translate to ${targetLanguage === "es" ? "Spanish" : "English"}`}
                </span>
              </button>
            )
          )}

          {release.releasedAt && (
            <div className="flex items-center gap-2 text-sm sm:text-base text-[var(--wb-on-surface-variant)] opacity-85 shrink-0 bg-[var(--wb-surface-bright)] px-4 py-2.5 rounded-2xl border border-[var(--wb-outline-variant)]/20">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--wb-primary)]" />
              <span>{new Date(release.releasedAt).toLocaleDateString(undefined, { dateStyle: "medium" })}</span>
            </div>
          )}
        </div>
      </div>

      {/** Markdown Body */}
      <div
        className="prose prose-invert max-w-none text-base sm:text-lg leading-relaxed text-[var(--wb-on-surface-variant)]"
        dangerouslySetInnerHTML={{ __html: renderedHtml }}
      />
    </div>
  );
};

