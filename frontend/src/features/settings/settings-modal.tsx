import React, { useState } from "react";
import Shared from "@shared";
import {
  Settings as SettingsIcon,
  Palette,
  Wrench,
  HardDrive,
  Share2,
  Bell,
} from "lucide-react";
import { AppearanceTab } from "./components/appearance-tab";
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

  const currentTab = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <Shared.atoms.Modal
      isOpen={isOpen}
      onClose={onClose}
      edgeSpacing={{
        isStaticSize: true,
        mobile: ["95vw", "88vh"],
        desktop: ["min(1280px, 92vw)", "min(860px, 88vh)"],
      }}
      contentClassName="p-0 flex-1 flex flex-col md:flex-row overflow-hidden"
      modalClassName="w-full h-full max-h-[90vh] overflow-hidden border border-white/10 shadow-2xl rounded-3xl bg-[var(--wb-surface-container)]"
    >
      <aside className="w-full md:w-68 lg:w-76 shrink-0 bg-[var(--wb-surface-container-low)] border-b md:border-b-0 md:border-r border-white/5 flex flex-col justify-between">
        <div className="flex flex-col p-5 sm:p-7">
          <div className="flex items-center gap-3.5 pb-6 mb-4 border-b border-white/5">
            <div className="w-12 h-12 rounded-2xl bg-[var(--wb-primary-container)] flex items-center justify-center text-[var(--wb-on-primary-container)] shrink-0 shadow-md">
              <SettingsIcon className="w-6 h-6" />
            </div>
            <div className="flex flex-col">
              <h2 className="text-xl font-extrabold text-[var(--wb-on-surface)] leading-tight tracking-tight">
                Settings
              </h2>
              <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)]">
                Preferences
              </span>
            </div>
          </div>

          <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0 mobile-no-scrollbar">
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

        <div className="hidden md:flex p-6 border-t border-white/5 text-xs text-[var(--wb-on-surface-variant)] opacity-60">
          Weekbox Settings
        </div>
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--wb-surface-container)]">
        <div className="flex items-center justify-between px-7 sm:px-10 py-6 sm:py-7 pr-16 sm:pr-20 border-b border-white/5 shrink-0 bg-[var(--wb-surface-container)]">
          <div className="flex flex-col">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--wb-on-surface)] tracking-tight">
              {currentTab.label}
            </h1>
            <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] mt-1">
              {currentTab.description}
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-7 sm:px-10 py-7 sm:py-9 mobile-no-scrollbar">
          {activeTab === "appearance" && <AppearanceTab />}
          {activeTab === "advanced" && <AdvancedTab />}
          {activeTab === "storage" && <StorageTab />}
          {activeTab === "integrations" && <IntegrationsTab />}
          {activeTab === "notifications" && <NotificationsTab />}
        </div>
      </main>
    </Shared.atoms.Modal>
  );
};
