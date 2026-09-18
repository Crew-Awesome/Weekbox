import React, { useState, useEffect } from "react";
import { Modal } from "../../atoms/modal/modal";
import Core from "@core";
import launcherIcon from "/assets/icons/app/launcher-icon.png";
import {
  Palette,
  Languages,
  Wrench,
  HardDrive,
  Share2,
  Bell,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { AppearanceTab } from "./components/appearance-tab";
import { LanguageTab } from "./components/language-tab";
import { AdvancedTab } from "./components/advanced-tab";
import { StorageTab } from "./components/storage-tab";
import { IntegrationsTab } from "./components/integrations-tab";
import { NotificationsTab } from "./components/notifications-tab";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab =
  | "appearance"
  | "language"
  | "advanced"
  | "storage"
  | "integrations"
  | "notifications";

interface TabItem {
  id: SettingsTab;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const TABS: TabItem[] = [
  {
    id: "appearance",
    label: "Appearance",
    description: "Theme, colors, and visual appearance",
    icon: Palette,
  },
  {
    id: "language",
    label: "Language",
    description: "Language selection and automatic mod translation",
    icon: Languages,
  },
  {
    id: "advanced",
    label: "Advanced",
    description: "Automation, updates, and advanced options",
    icon: Wrench,
  },
  {
    id: "storage",
    label: "Storage & Downloads",
    description: "File paths, cache maintenance, and download limits",
    icon: HardDrive,
  },
  {
    id: "integrations",
    label: "Integrations",
    description: "External protocols, GameBanana 1-Click, and Discord",
    icon: Share2,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "System alerts, completion toasts, and audio cues",
    icon: Bell,
  },
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("appearance");
  const [mobileView, setMobileView] = useState<"list" | "detail">("list");
  const [appVersion, setAppVersion] = useState<string>("...");

  useEffect(() => {
    Core.platform.getVersion().then((v) => {
      setAppVersion(v);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setMobileView("list");
    }
  }, [isOpen]);

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      edgeSpacing={{
        isStaticSize: true,
        mobile: ["95vw", "88vh"],
        desktop: ["min(1280px, 92vw)", "min(860px, 88vh)"],
      }}
      contentClassName="p-0 flex-1 overflow-hidden"
      modalClassName="w-full h-full max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl rounded-3xl bg-[var(--wb-surface-container)]"
    >
      {/* Sliding track for mobile; side-by-side flex for desktop */}
      <div
        className={`flex flex-row w-[200%] md:w-full h-full transition-transform duration-300 ease-out ${
          mobileView === "detail"
            ? "-translate-x-1/2 md:translate-x-0"
            : "translate-x-0"
        }`}
      >
        {/* Slide 1 on mobile: Categories List / Desktop: Left Aside Navigation */}
        <aside className="w-1/2 md:w-68 lg:w-76 shrink-0 bg-[var(--wb-surface-container-low)] border-r border-white/5 flex flex-col justify-between h-full overflow-hidden">
          <div className="flex flex-col p-5 sm:p-7 h-full overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3.5 pb-5 mb-3 border-b border-white/5 pr-12 md:pr-0 shrink-0">
              <img
                src={launcherIcon}
                alt="WeekBox"
                className="w-11 h-11 sm:w-12 sm:h-12 object-contain shrink-0 drop-shadow-md"
              />
              <div className="flex flex-col min-w-0">
                <h2 className="text-xl font-extrabold text-[var(--wb-on-surface)] leading-tight tracking-tight">
                  WB Settings
                </h2>
                <span className="md:hidden text-xs text-[var(--wb-on-surface-variant)] mt-0.5">
                  Select a category
                </span>
              </div>
            </div>

            {/* Mobile Category Cards List (hidden on desktop) */}
            <nav className="md:hidden flex-1 overflow-y-auto flex flex-col gap-2.5 py-1 mobile-no-scrollbar">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileView("detail");
                    }}
                    className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-[var(--wb-surface-container-high)]/60 hover:bg-[var(--wb-surface-container-high)] border border-[var(--wb-outline-variant)]/30 active:scale-[0.98] transition-all text-left cursor-pointer outline-none group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-[var(--wb-primary)]/15 text-[var(--wb-primary)] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-sm font-bold text-[var(--wb-on-surface)] leading-snug">
                        {tab.label}
                      </span>
                      <span className="text-xs text-[var(--wb-on-surface-variant)] line-clamp-1 opacity-80">
                        {tab.description}
                      </span>
                    </div>
                    <ChevronRight className="w-5 h-5 text-[var(--wb-on-surface-variant)] opacity-60 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                );
              })}
            </nav>

            {/* Desktop Tabs List (hidden on mobile) */}
            <nav className="hidden md:flex flex-col gap-2 overflow-y-auto flex-1">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3.5 px-4 py-3 sm:py-3.5 rounded-2xl text-sm sm:text-base font-semibold transition-all duration-200 text-left shrink-0 cursor-pointer outline-none ${
                      isActive
                        ? "bg-[var(--wb-primary-container)] text-[var(--wb-on-primary-container)] shadow-sm font-bold"
                        : "text-[var(--wb-on-surface-variant)] hover:bg-[var(--wb-surface-container-high)] hover:text-[var(--wb-on-surface)]"
                    }`}
                  >
                    <Icon
                      className={`w-5 h-5 shrink-0 ${
                        isActive ? "text-[var(--wb-primary)]" : "text-inherit"
                      }`}
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-4 sm:p-6 border-t border-white/5 text-xs text-[var(--wb-on-surface-variant)] opacity-60 font-mono shrink-0">
            v{appVersion}
          </div>
        </aside>

        {/* Slide 2 on mobile: Selected Tab Detail / Desktop: Main Content Area */}
        <main className="w-1/2 md:w-auto md:flex-1 shrink-0 md:shrink flex flex-col overflow-hidden bg-[var(--wb-surface-container)] h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-5 sm:px-10 py-4 sm:py-7 pr-16 sm:pr-20 border-b border-white/5 shrink-0 bg-[var(--wb-surface-container)]">
            <div className="flex flex-col">
              {/* Mobile Back Button */}
              <button
                type="button"
                onClick={() => setMobileView("list")}
                className="md:hidden flex items-center gap-1.5 text-xs font-bold text-[var(--wb-primary)] hover:opacity-80 active:scale-95 transition-all cursor-pointer mb-1.5 -ml-1 w-fit"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Categories</span>
              </button>

              <h1 className="text-xl sm:text-3xl font-extrabold text-[var(--wb-on-surface)] tracking-tight">
                {currentTab.label}
              </h1>
              <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] mt-0.5 sm:mt-1">
                {currentTab.description}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-5 sm:px-10 py-5 sm:py-9 mobile-no-scrollbar">
            {activeTab === "appearance" && <AppearanceTab />}
            {activeTab === "language" && <LanguageTab />}
            {activeTab === "advanced" && <AdvancedTab />}
            {activeTab === "storage" && <StorageTab />}
            {activeTab === "integrations" && <IntegrationsTab />}
            {activeTab === "notifications" && <NotificationsTab />}
          </div>
        </main>
      </div>
    </Modal>
  );
};
