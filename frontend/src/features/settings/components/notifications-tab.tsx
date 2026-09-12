import React from "react";
import { Bell, Volume2, Sparkles, Monitor, Send } from "lucide-react";
import { Switch } from "./switch";
import Utils from "@utils";

export const NotificationsTab: React.FC = () => {
  const {
    osNotifyOnDownload,
    setOsNotifyOnDownload,
    toastNotifyOnDownload,
    setToastNotifyOnDownload,
    soundEffects,
    setSoundEffects,
    sendOSNotification,
  } = Utils.hooks.useNotifications();

  const handleTestNotification = async () => {
    try {
      await sendOSNotification(
        "WeekBox",
        "This is a test notification from WeekBox on your operating system."
      );
      Utils.toast.info("System notification sent", {
        title: "Test Notification",
      });
    } catch (e) {
      Utils.toast.error("Could not send system notification", {
        title: "Notification Error",
      });
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full pb-10">
      <section className="flex flex-col gap-4">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-[var(--wb-primary)]">
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Alerts & Feedback</span>
        </div>

        <div className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Monitor className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  OS Download Notifications
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Send a native system notification (Windows, macOS, Linux) when a download finishes and WeekBox does not have focus
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 pl-4">
              <button
                type="button"
                onClick={handleTestNotification}
                title="Test system notification"
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white/5 hover:bg-white/10 text-[var(--wb-on-surface)] transition-colors border border-white/5"
              >
                <Send className="w-3.5 h-3.5 text-[var(--wb-primary)]" />
                <span>Test</span>
              </button>
              <Switch
                checked={osNotifyOnDownload}
                onChange={setOsNotifyOnDownload}
                ariaLabel="Toggle OS Download Notifications"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Sparkles className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Download Completion Toast
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Show in-app notification banner when a mod has finished downloading and installing
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-4">
              <Switch
                checked={toastNotifyOnDownload}
                onChange={setToastNotifyOnDownload}
                ariaLabel="Toggle Download Completion Toast"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-5 sm:p-6 rounded-3xl bg-[var(--wb-surface-container-low)]/80 border border-white/5 transition-colors">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--wb-surface-container-highest)] text-[var(--wb-on-surface)] flex items-center justify-center shrink-0 shadow-sm">
                <Volume2 className="w-6 h-6 sm:w-7 sm:h-7 text-[var(--wb-primary)]" />
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-base sm:text-lg font-bold text-[var(--wb-on-surface)]">
                  Interface Audio Effects
                </span>
                <span className="text-xs sm:text-sm text-[var(--wb-on-surface-variant)] leading-relaxed">
                  Play acoustic confirmation cues for app interactions and downloads
                </span>
              </div>
            </div>
            <div className="shrink-0 pl-4">
              <Switch
                checked={soundEffects}
                onChange={setSoundEffects}
                ariaLabel="Toggle Interface Audio Effects"
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
