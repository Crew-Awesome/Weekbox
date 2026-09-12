import React, { useState } from "react";
import { Share2, Globe, MessageSquare } from "lucide-react";
import { Switch } from "./switch";

export const IntegrationsTab: React.FC = () => {
  const [oneClick, setOneClick] = useState(true);
  const [discordRpc, setDiscordRpc] = useState(true);

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>External Services & Protocols</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Globe className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  GameBanana 1-Click Protocol
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Register system protocol to catch 1-Click download buttons from browser
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-4">
              <Switch
                checked={oneClick}
                onChange={setOneClick}
                ariaLabel="Toggle GameBanana 1-Click Protocol"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <MessageSquare className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Discord Rich Presence
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Broadcast current playing mod and active engine status on Discord
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-4">
              <Switch
                checked={discordRpc}
                onChange={setDiscordRpc}
                ariaLabel="Toggle Discord Rich Presence"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
