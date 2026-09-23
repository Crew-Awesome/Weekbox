import { t } from "../i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";

function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes < 1024) return `${Math.round(bytes)} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = bytes;
  let unit = -1;
  while (amount >= 1024 && unit < units.length - 1) {
    amount /= 1024;
    unit += 1;
  }
  return `${amount.toFixed(amount >= 100 ? 0 : 1)} ${units[unit]}`;
}

function formatEta(seconds) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value < 0) return "";
  if (value < 60) {
    return t("storage.migrationEtaSeconds", {
      seconds: Math.max(1, Math.round(value)),
    });
  }
  const minutes = Math.floor(value / 60);
  const remainder = Math.round(value % 60);
  return remainder
    ? t("storage.migrationEtaMinutesSeconds", {
        minutes,
        seconds: remainder,
      })
    : t("storage.migrationEtaMinutes", { minutes });
}

const MIGRATION_PHASE_LABELS = {
  PREPARING: "storage.preparingFiles",
  MOVING: "storage.movingFiles",
  VERIFYING: "storage.verifyingFiles",
  FINALIZING: "storage.finalizingFiles",
  COMPLETE: "storage.migrationCompleteTitle",
  CANCELLED: "storage.migrationCancelledTitle",
  FAILED: "storage.migrationFailedTitle",
};

const TERMINAL_PHASES = new Set(["COMPLETE", "CANCELLED", "FAILED"]);

function normalizedPhase(progress) {
  return String(progress?.phase || "PREPARING").toUpperCase();
}

function numericProgress(value) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return null;
  }
  return Math.max(0, Math.min(100, Number(value)));
}

function overallProgress(progress, phase) {
  if (phase === "PREPARING") return null;
  if (["VERIFYING", "FINALIZING", "COMPLETE"].includes(phase)) return 100;
  const totalBytes = Number(progress.totalBytes) || 0;
  if (!totalBytes) return phase === "MOVING" ? 100 : null;
  return numericProgress(
    ((Number(progress.bytesMoved) || 0) / totalBytes) * 100,
  );
}

export class StorageMoveFeedback {
  constructor() {
    this.overlay = null;
    this.mode = "";
    this.latestProgress = {};
    this.speedSamples = [];
    this.renderTimer = null;
    this.closeTimer = null;
    this.cancelRequested = false;
  }

  clearTimers() {
    if (this.renderTimer) clearTimeout(this.renderTimer);
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.renderTimer = null;
    this.closeTimer = null;
  }

  close() {
    this.clearTimers();
    if (this.overlay) {
      deactivateCheckoutDialog(this.overlay);
      this.overlay.remove();
    }
    this.overlay = null;
    this.mode = "";
  }

  replaceOverlay() {
    this.close();
    this.latestProgress = {};
    this.speedSamples = [];
    this.cancelRequested = false;
  }

  showMoveConfirmation({ destination }) {
    this.replaceOverlay();
    this.mode = "confirmation";
    const overlay = document.createElement("section");
    overlay.className = "storage-migration-confirmation-overlay error-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "storage-confirmation-title");
    overlay.innerHTML = `
      <div class="storage-migration-confirmation-content storage-migration-panel">
        <div class="storage-migration-main">
          <header class="storage-migration-header">
            <h2 id="storage-confirmation-title">${t("storage.moveLibraryTitle")}</h2>
          </header>
          <p class="storage-migration-summary">${t("storage.moveLibraryDescription")}</p>
          <div class="storage-migration-destination">
            <code class="storage-migration-confirmation-path"></code>
          </div>
          <p class="storage-migration-confirmation-safe">${t("storage.moveLibrarySafety")}</p>
          <p class="storage-migration-confirmation-duration">${t("storage.moveLibraryDuration")}</p>
          <footer class="storage-migration-actions">
            <button type="button" class="storage-migration-button storage-migration-button-secondary storage-migration-confirmation-cancel">
              ${t("common.cancel")}
            </button>
            <button type="button" class="storage-migration-button storage-migration-button-primary storage-migration-confirmation-confirm">
              <i class="fa-solid fa-arrow-right" aria-hidden="true"></i>
              <span>${t("storage.moveLibraryConfirm")}</span>
            </button>
          </footer>
        </div>
      </div>`;
    overlay.querySelector(".storage-migration-confirmation-path").textContent =
      destination;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    return new Promise((resolve) => {
      let settled = false;
      const finish = (confirmed) => {
        if (settled) return;
        settled = true;
        this.close();
        resolve(confirmed);
      };
      overlay.querySelector(".storage-migration-confirmation-cancel").onclick =
        () => finish(false);
      overlay.querySelector(".storage-migration-confirmation-confirm").onclick =
        () => finish(true);
      overlay.onclick = (event) => {
        if (event.target === overlay) finish(false);
      };
      requestAnimationFrame(() => {
        if (settled) return;
        overlay.classList.add("show");
        activateCheckoutDialog(
          overlay,
          overlay.querySelector(".storage-migration-confirmation-content"),
          overlay.querySelector(".storage-migration-confirmation-confirm"),
          () => finish(false),
        );
      });
    });
  }

  showNotice({ title, message }) {
    this.replaceOverlay();
    this.mode = "notice";
    const overlay = document.createElement("section");
    overlay.className = "storage-migration-notice-overlay error-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "storage-notice-title");
    overlay.innerHTML = `
      <div class="storage-migration-notice-content storage-migration-panel">
        <div class="storage-migration-main">
          <header class="storage-migration-header">
            <h2 id="storage-notice-title"></h2>
          </header>
          <p class="storage-migration-summary storage-migration-notice-message"></p>
          <footer class="storage-migration-actions">
            <button type="button" class="storage-migration-button storage-migration-button-primary storage-migration-notice-close">
              ${t("storage.migrationClose")}
            </button>
          </footer>
        </div>
      </div>`;
    overlay.querySelector("#storage-notice-title").textContent = title;
    overlay.querySelector(".storage-migration-notice-message").textContent =
      message;
    document.body.appendChild(overlay);
    this.overlay = overlay;

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        this.close();
        resolve();
      };
      overlay.querySelector(".storage-migration-notice-close").onclick = finish;
      overlay.onclick = (event) => {
        if (event.target === overlay) finish();
      };
      requestAnimationFrame(() => {
        if (settled) return;
        overlay.classList.add("show");
        activateCheckoutDialog(
          overlay,
          overlay.querySelector(".storage-migration-notice-content"),
          overlay.querySelector(".storage-migration-notice-close"),
          finish,
        );
      });
    });
  }

  show({ onCancel, destination = "" } = {}) {
    this.replaceOverlay();
    this.mode = "active";
    const overlay = document.createElement("section");
    overlay.id = "storage-migration-overlay";
    overlay.className = "storage-migration-overlay error-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "storage-migration-title");
    overlay.innerHTML = `
      <div class="storage-migration-content storage-migration-panel">
        <div class="storage-migration-main">
          <header class="storage-migration-header">
            <h2 id="storage-migration-title">${t("storage.migrationTitle")}</h2>
          </header>
          <div class="storage-migration-destination">
            <span>${t("storage.migrationDestinationShort")}:</span>
            <code class="storage-migration-destination-path"></code>
          </div>
          <div class="storage-migration-progress-heading">
            <span class="storage-migration-phase"></span>
            <strong class="storage-migration-percent"></strong>
          </div>
          <div
            class="storage-migration-progress-track"
            role="progressbar"
            aria-label="${t("storage.migrationProgressLabel")}"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="storage-migration-progress-fill"></div>
          </div>
          <p class="storage-migration-subphase" aria-live="polite"></p>
          <p class="storage-migration-transfer-summary"></p>
          <p class="storage-migration-speed-summary"></p>
          <div class="storage-migration-current">
            <span>${t("storage.migrationCurrentFileShort")}:</span>
            <code class="storage-migration-current-file" title=""></code>
          </div>
          <p class="storage-migration-message" role="status" aria-live="polite"></p>
          <p class="storage-migration-error" role="alert"></p>
          <footer class="storage-migration-actions">
            <button type="button" class="storage-migration-button storage-migration-button-secondary storage-migration-cancel">
              ${t("storage.migrationCancel")}
            </button>
          </footer>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    this.overlay = overlay;
    overlay.querySelector(".storage-migration-destination-path").textContent =
      destination;
    const cancelButton = overlay.querySelector(".storage-migration-cancel");
    cancelButton.onclick = async () => {
      if (this.cancelRequested) return;
      this.cancelRequested = true;
      cancelButton.disabled = true;
      cancelButton.textContent = t("storage.migrationCancelling");
      this.latestProgress.message = t("storage.migrationCancelling");
      this.renderProgress();
      await onCancel?.();
    };
    this.latestProgress = { phase: "PREPARING", progress: null };
    this.renderProgress();
    requestAnimationFrame(() => {
      if (!this.overlay) return;
      overlay.classList.add("show");
      activateCheckoutDialog(
        overlay,
        overlay.querySelector(".storage-migration-content"),
        cancelButton,
      );
    });
  }

  showResumePrompt({ source, destination }) {
    this.replaceOverlay();
    this.mode = "recovery";
    const overlay = document.createElement("section");
    overlay.className = "storage-migration-recovery-overlay error-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "storage-recovery-title");
    overlay.innerHTML = `
      <div class="storage-migration-recovery-content storage-migration-panel">
        <div class="storage-migration-main">
          <header class="storage-migration-header">
            <h2 id="storage-recovery-title">${t("storage.resumeMoveTitle")}</h2>
          </header>
          <p class="storage-migration-summary">${t("storage.resumeMoveDescription")}</p>
          <div class="storage-migration-recovery-paths">
            <code class="storage-migration-recovery-source"></code>
            <i class="fa-solid fa-arrow-down" aria-hidden="true"></i>
            <code class="storage-migration-recovery-destination"></code>
          </div>
          <p class="storage-migration-recovery-safe">${t("storage.resumeMoveSafe")}</p>
          <footer class="storage-migration-actions">
            <button type="button" class="storage-migration-button storage-migration-button-secondary storage-migration-recovery-cancel">
              ${t("storage.cancelMigration")}
            </button>
            <button type="button" class="storage-migration-button storage-migration-button-primary storage-migration-recovery-resume">
              <i class="fa-solid fa-play" aria-hidden="true"></i>
              <span>${t("storage.migrationResume")}</span>
            </button>
          </footer>
        </div>
      </div>`;
    overlay.querySelector(".storage-migration-recovery-source").textContent =
      source;
    overlay.querySelector(
      ".storage-migration-recovery-destination",
    ).textContent = destination;
    document.body.appendChild(overlay);
    this.overlay = overlay;
    return new Promise((resolve) => {
      let settled = false;
      const finish = (resume) => {
        if (settled) return;
        settled = true;
        this.close();
        resolve(resume);
      };
      overlay.querySelector(".storage-migration-recovery-cancel").onclick =
        () => finish(false);
      overlay.querySelector(".storage-migration-recovery-resume").onclick =
        () => finish(true);
      overlay.onclick = (event) => {
        if (event.target === overlay) finish(false);
      };
      requestAnimationFrame(() => {
        if (!settled) {
          overlay.classList.add("show");
          activateCheckoutDialog(
            overlay,
            overlay.querySelector(".storage-migration-recovery-content"),
            overlay.querySelector(".storage-migration-recovery-resume"),
            () => finish(false),
          );
        }
      });
    });
  }

  recordMovingSpeed(progress) {
    const now = performance.now();
    const bytesMoved = Math.max(0, Number(progress.bytesMoved) || 0);
    const last = this.speedSamples.at(-1);
    if (!last || last.bytes !== bytesMoved || now - last.time >= 250) {
      this.speedSamples.push({ time: now, bytes: bytesMoved });
    }
    this.speedSamples = this.speedSamples.filter(
      (sample) => now - sample.time <= 4000,
    );
    const first = this.speedSamples[0];
    const elapsed = first ? (now - first.time) / 1000 : 0;
    const speed =
      elapsed > 0 ? Math.max(0, (bytesMoved - first.bytes) / elapsed) : 0;
    const totalBytes = Math.max(0, Number(progress.totalBytes) || 0);
    return {
      speed,
      eta:
        speed > 0 && totalBytes > bytesMoved
          ? (totalBytes - bytesMoved) / speed
          : null,
    };
  }

  update(progress = {}) {
    if (!this.overlay || this.mode !== "active") return;
    const next = { ...this.latestProgress, ...progress };
    const previousPhase = normalizedPhase(this.latestProgress);
    const phase = normalizedPhase(next);
    if (phase === "MOVING") {
      if (previousPhase !== "MOVING") this.speedSamples = [];
      Object.assign(next, this.recordMovingSpeed(next));
    } else if (phase !== "PREPARING") {
      next.speed = 0;
      next.eta = null;
    }
    this.latestProgress = next;
    this.scheduleRender(TERMINAL_PHASES.has(phase));
  }

  scheduleRender(immediate = false) {
    if (immediate) {
      if (this.renderTimer) clearTimeout(this.renderTimer);
      this.renderTimer = null;
      this.renderProgress();
      return;
    }
    if (this.renderTimer) return;
    this.renderTimer = setTimeout(() => {
      this.renderTimer = null;
      this.renderProgress();
    }, 150);
  }

  renderProgress() {
    if (!this.overlay || this.mode !== "active") return;
    const progress = this.latestProgress;
    const phase = normalizedPhase(progress);
    const phaseKey = MIGRATION_PHASE_LABELS[phase] || "storage.movingFiles";
    this.overlay.querySelector(".storage-migration-phase").textContent =
      t(phaseKey);
    this.overlay.querySelector(".storage-migration-subphase").textContent =
      phase === "PREPARING" && progress.status === "SCANNING"
        ? t("storage.scanningFiles")
        : "";
    this.renderProgressBar(progress, phase, phaseKey);
    this.renderProgressSummary(progress, phase);
    this.renderProgressDetails(progress, phase);
  }

  renderProgressBar(progress, phase, phaseKey) {
    const value = overallProgress(progress, phase);
    const progressTrack = this.overlay.querySelector(
      ".storage-migration-progress-track",
    );
    const progressFill = this.overlay.querySelector(
      ".storage-migration-progress-fill",
    );
    const percentNode = this.overlay.querySelector(
      ".storage-migration-percent",
    );
    if (value === null) {
      progressTrack.classList.add("is-indeterminate");
      progressTrack.removeAttribute("aria-valuenow");
      progressTrack.setAttribute("aria-valuetext", t(phaseKey));
      progressFill.style.width = "38%";
      percentNode.textContent = "";
      return;
    }
    progressTrack.classList.remove("is-indeterminate");
    progressTrack.setAttribute("aria-valuenow", String(value));
    const visibleValue =
      value > 0 && Number(progress.bytesMoved) > 0
        ? Math.max(1, Math.round(value))
        : Math.round(value);
    progressTrack.setAttribute("aria-valuetext", `${visibleValue}%`);
    progressFill.style.width = `${value}%`;
    percentNode.textContent = `${visibleValue}%`;
  }

  renderProgressSummary(progress, phase) {
    const totalBytes = Math.max(0, Number(progress.totalBytes) || 0);
    const totalFiles = Math.max(0, Number(progress.totalFiles) || 0);
    const isScanning = phase === "PREPARING" && progress.status === "SCANNING";
    const summaryNode = this.overlay.querySelector(
      ".storage-migration-transfer-summary",
    );
    summaryNode.textContent =
      isScanning || (phase === "PREPARING" && (!totalBytes || !totalFiles))
        ? t("storage.migrationCalculating")
        : t("storage.migrationTransferSummary", {
            bytesMoved: formatBytes(progress.bytesMoved),
            totalBytes: formatBytes(totalBytes),
            movedFiles: Number(progress.copiedFiles) || 0,
            totalFiles,
          });
  }

  renderProgressDetails(progress, phase) {
    const speedNode = this.overlay.querySelector(
      ".storage-migration-speed-summary",
    );
    const speedText =
      phase === "MOVING" && Number(progress.speed) > 0
        ? `${formatBytes(progress.speed)}/s`
        : "";
    const eta = formatEta(progress.eta);
    const etaText =
      phase === "MOVING" && eta ? t("storage.migrationEta", { eta }) : "";
    speedNode.textContent = [speedText, etaText].filter(Boolean).join(" • ");
    const currentFile = String(progress.currentFile || "");
    const currentFileNode = this.overlay.querySelector(
      ".storage-migration-current-file",
    );
    currentFileNode.textContent =
      currentFile || t("storage.migrationNoCurrentFile");
    currentFileNode.title = currentFile;
    this.overlay.querySelector(".storage-migration-message").textContent =
      progress.message || "";
    this.overlay.querySelector(".storage-migration-error").textContent =
      progress.error || "";
  }

  setCloseButton() {
    const button = this.overlay?.querySelector(".storage-migration-cancel");
    if (!button) return;
    button.disabled = false;
    button.textContent = t("storage.migrationClose");
    button.onclick = () => this.close();
  }

  complete() {
    this.update({
      phase: "COMPLETE",
      progress: 100,
      message: t("storage.migrationComplete"),
    });
    this.setCloseButton();
    this.closeTimer = setTimeout(() => this.close(), 1800);
  }

  cancelled() {
    this.update({
      phase: "CANCELLED",
      message: t("storage.migrationCancelledMessage"),
    });
    this.setCloseButton();
  }

  fail(message) {
    this.update({
      phase: "FAILED",
      error: message,
    });
    this.setCloseButton();
  }
}

export const storageMoveFeedback = new StorageMoveFeedback();
