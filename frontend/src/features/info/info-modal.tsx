import React, { useState, useEffect } from "react";
import Shared from "@shared";
import Core from "@core";
import { Heart, ExternalLink, Sparkles } from "lucide-react";
import launcherIcon from "/assets/icons/app/launcher-icon.png";

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  const [version, setVersion] = useState<string>("0.1.0");

  useEffect(() => {
    if (isOpen) {
      Core.platform.getVersion()
        .then((v) => {
          if (v) setVersion(String(v));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  return (
    <Shared.atoms.Modal
      isOpen={isOpen}
      onClose={onClose}
      widthClass="w-[92vw] sm:w-[520px]"
      heightClass="h-auto max-h-[85vh]"
    >
      <div className="flex flex-col p-6 sm:p-8 text-[var(--wb-on-surface)]">
        <div className="flex flex-col items-center text-center pb-6 border-b border-[var(--wb-outline-variant)]/40">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-3xl bg-[var(--wb-surface-container)] flex items-center justify-center p-3 border border-white/10 shadow-xl">
              <img
                src={launcherIcon}
                alt="Weekbox Logo"
                className="w-full h-full object-contain drop-shadow-md"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 px-2.5 py-0.5 rounded-full bg-[var(--wb-primary-container)] border border-[var(--wb-primary)]/40 text-[var(--wb-on-primary-container)] text-[11px] font-black uppercase tracking-wider">
              v{version}
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-[var(--wb-on-surface)]">
            Weekbox
          </h2>
          <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] mt-1 max-w-sm">
            Modern Friday Night Funkin' mod manager and launcher
          </span>
        </div>

        <div className="flex flex-col gap-4 py-5 overflow-y-auto">
          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--wb-surface-container-low)]/70 border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[var(--wb-primary)]/20 text-[var(--wb-primary)] flex items-center justify-center shrink-0">
                <Heart className="w-4 h-4 fill-current" />
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-[var(--wb-on-surface-variant)]">
                  Developed by
                </span>
                <span className="text-sm font-bold text-[var(--wb-on-surface)]">
                  Crew Awesome
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 text-xs text-[var(--wb-on-surface-variant)] px-2.5 py-1 rounded-full bg-[var(--wb-surface-container-highest)]/50">
              <Sparkles className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
              <span>Open Source</span>
            </div>
          </div>

          <div className="flex flex-col gap-2 mt-1">
            <a
              href="https://github.com/Crew-Awesome"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--wb-surface-container-high)]/40 hover:bg-[var(--wb-surface-container-high)] border border-white/5 text-[var(--wb-on-surface)] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <svg
                  className="w-5 h-5 text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-on-surface)] transition-colors fill-current"
                  viewBox="0 0 24 24"
                >
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                <span className="text-sm font-semibold">GitHub Organization</span>
              </div>
              <ExternalLink className="w-4 h-4 text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-primary)] transition-colors" />
            </a>

            <a
              href="https://gamebanana.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between p-3.5 rounded-2xl bg-[var(--wb-surface-container-high)]/40 hover:bg-[var(--wb-surface-container-high)] border border-white/5 text-[var(--wb-on-surface)] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center justify-center font-black text-[10px]">
                  GB
                </div>
                <span className="text-sm font-semibold">GameBanana</span>
              </div>
              <ExternalLink className="w-4 h-4 text-[var(--wb-on-surface-variant)] group-hover:text-[var(--wb-primary)] transition-colors" />
            </a>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-[var(--wb-outline-variant)]/40">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-[var(--wb-surface-container-high)] hover:bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] text-sm font-semibold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </Shared.atoms.Modal>
  );
};
