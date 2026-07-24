
function __renderTemplate(id, data = {}) {
    const tpl = document.getElementById(id);
    if (!tpl) return '';
    let html = tpl.innerHTML;
    for (const key in data) {
        html = html.replace(new RegExp('{{' + key + '}}', 'g'), data[key]);
    }
    return html;
}

const __modManagerTemplates = {
    mainModal: () => __renderTemplate('tpl-mainModal'),
    unassignedBadge: () => __renderTemplate('tpl-unassignedBadge'),
    executableBadge: () => __renderTemplate('tpl-executableBadge'),
    engineBadge: (name, icon) => __renderTemplate('tpl-engineBadge', {name, icon}),
    engineCompatibilityPicker: (modId, engineId, engineVersion, selectedEngineIcon, selectedEngineName, engineOptionsHtml, selectedVersion, versionOptionsHtml) => 
        __renderTemplate('tpl-engineCompatibilityPicker', {modId, engineId, engineVersion, selectedEngineIconHtml: selectedEngineIcon ? `<img src="assets/icons/${selectedEngineIcon}" alt=""/>` : `<i class="fa-solid fa-question-circle" aria-hidden="true"></i>`, selectedEngineName, unassignedSelectedClass: !engineId ? 'selected' : '', engineOptionsHtml, selectedVersion, versionOptionsHtml}),
    engineOption: (id, name, icon, isSelected) => __renderTemplate('tpl-engineOption', {id, name, icon, selectedClass: isSelected ? 'selected' : ''}),
    versionOption: (version, isSelected) => __renderTemplate('tpl-versionOption', {versionValue: version === "Any version" ? "" : version, version, selectedClass: isSelected ? 'selected' : ''}),
    cardContent: (launchKind, modId, engineId, engineVersion, launchLabel, modName, isHidden, isUnassigned, eyeIcon, engineBadgeHtml) => __renderTemplate('tpl-cardContent', {launchKind, modId, engineId, engineVersion, launchLabel, modName, eyeIcon, engineBadgeHtml, disabledAttr: isHidden || isUnassigned ? 'disabled' : ''}),
    launchButtonRunning: () => __renderTemplate('tpl-launchButtonRunning'),
    launchButtonSwitch: () => __renderTemplate('tpl-launchButtonSwitch'),
    launchButtonDefault: (launchLabel) => __renderTemplate('tpl-launchButtonDefault', {launchLabel}),
    emptyState: (message) => __renderTemplate('tpl-emptyState', {message}),
    addLocalModCard: () => __renderTemplate('tpl-addLocalModCard'),
    deleteSpinner: () => __renderTemplate('tpl-deleteSpinner'),
    deleteIcon: () => __renderTemplate('tpl-deleteIcon'),
    unassignedQuestionIcon: () => __renderTemplate('tpl-unassignedQuestionIcon'),
    openDirectoryIcon: () => __renderTemplate('tpl-openDirectoryIcon')
};

var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// app/src/ui/js/config/appUpdateController.js
var _AppUpdateController = class _AppUpdateController {
  constructor(appUpdater3) {
    this.appUpdater = appUpdater3;
    this.pendingUpdate = null;
  }
  async updateVersionLabel() {
    const label = document.getElementById("weekbox-app-version");
    if (!label) return;
    try {
      label.textContent = `WeekBox ${await this.appUpdater.getCurrentVersion()}`;
    } catch {
      label.textContent = "WeekBox version unavailable";
    }
  }
  showAvailable(update) {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status || !update?.latestVersion) return;
    this.pendingUpdate = update;
    status.textContent = `WeekBox ${update.latestVersion} is ready to install.`;
    button.textContent = "Install and restart";
    button.disabled = false;
  }
  async check() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status) return;
    button.disabled = true;
    this.pendingUpdate = null;
    status.textContent = "Checking for updates\u2026";
    try {
      const update = await this.appUpdater.check();
      if (update.status === "current") {
        sessionStorage.removeItem("weekbox_available_app_update");
        status.textContent = `WeekBox ${update.currentVersion} is up to date.`;
        button.textContent = "Up to date";
        button.disabled = false;
        return;
      }
      if (update.status === "unsupported") {
        status.textContent = update.message;
        button.textContent = "Unavailable";
        button.disabled = false;
        return;
      }
      this.showAvailable(update);
    } catch (error) {
      status.textContent = error.message || "Could not check for updates.";
      button.textContent = "Try again";
      button.disabled = false;
    }
  }
  async install() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button || !status || !this.pendingUpdate) return;
    button.disabled = true;
    try {
      await this.appUpdater.install(this.pendingUpdate, (message) => {
        status.textContent = message;
      });
    } catch (error) {
      status.textContent = error.message || "Could not install the update.";
      button.textContent = "Try again";
      this.pendingUpdate = null;
      button.disabled = false;
    }
  }
};
__name(_AppUpdateController, "AppUpdateController");
var AppUpdateController = _AppUpdateController;

// app/src/ui/js/config/index.js
import { appSettings as appSettings2 } from "../../backend/core/index-core.js";
import { FS as FS4 } from "../utils/index-utils.js";

// app/src/ui/js/engines/downloadEngine.js
import { FS } from "../utils/index-utils.js";
import {
  downloadArchive,
  extractArchive
} from "../utils/index-utils.js";

// app/src/ui/js/errors/errorHandler.js
import { appSettings } from "../../backend/core/index-core.js";

// app/src/ui/js/errors/wineModal.js
var wineModal = {
  close() {
    const modal = document.getElementById("wine-missing-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 220);
  },
  show() {
    if (document.getElementById("wine-missing-modal")) return;
    const modal = document.createElement("section");
    modal.id = "wine-missing-modal";
    modal.className = "app-update-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="app-update-content" style="max-width: 400px; padding: 24px; text-align: center;">
        <div class="app-update-icon" style="color: #ff9800; font-size: 2.5rem; margin-bottom: 16px;">
          <i class="fa-solid fa-wine-glass" aria-hidden="true"></i>
        </div>
        <div class="app-update-main">
          <h2 id="app-update-title" style="margin: 0 0 12px 0;">Wine is missing</h2>
          <p class="app-update-copy" style="margin: 0 0 20px 0; color: #a1a1aa; line-height: 1.5;">
            To play Windows (.exe) mods on Linux, you need to install <strong>Wine</strong>.<br><br>
            Please install it using your distribution's package manager, for example:<br>
            <code style="background: #27272a; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">sudo apt install wine</code>
          </p>
          <div class="app-update-actions" style="justify-content: center;">
            <button class="app-update-install" type="button" style="width: 100%;">Got it</button>
          </div>
        </div>
      </div>`;
    const close = /* @__PURE__ */ __name(() => this.close(), "close");
    modal.querySelector(".app-update-install").addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));
    modal.querySelector(".app-update-install").focus();
  }
};
window.addEventListener("wine-missing", () => {
  wineModal.show();
});

// app/src/ui/js/errors/errorHandler.js
var DIAGNOSTIC_REPORT_ENDPOINT = "https://fnfweekbox.vercel.app/api/diagnostic-report";
function nonEmptyString(value, fallback = "Unknown") {
  const text = String(value ?? "").trim();
  return text || fallback;
}
__name(nonEmptyString, "nonEmptyString");
function sanitizeDiagnosticText(value) {
  return nonEmptyString(value, "No details available").replace(
    /https?:\/\/(?:canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[^\s"']+/gi,
    "[REDACTED DISCORD WEBHOOK]"
  ).replace(
    /\b(?:authorization|cookie|set-cookie|token|api[_-]?key|secret|password)\s*[:=]\s*(?:bearer\s+)?[^\s,;]+/gi,
    "[REDACTED SECRET]"
  ).replace(/\bbearer\s+[a-z0-9._~-]+/gi, "[REDACTED SECRET]").replace(/[a-z]:\\users\\[^\\\r\n]+/gi, "[REDACTED WINDOWS PATH]").replace(/\/(?:users|home)\/[^\s\r\n:)}\]]+/gi, "[REDACTED USER PATH]").replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED EMAIL]").slice(0, 12e3);
}
__name(sanitizeDiagnosticText, "sanitizeDiagnosticText");
async function getOperatingSystem() {
  try {
    const info = await Neutralino.computer.getOSInfo();
    return nonEmptyString(info.description || info.name, window.NL_OS);
  } catch {
    return nonEmptyString(window.NL_OS);
  }
}
__name(getOperatingSystem, "getOperatingSystem");
async function getArchitecture() {
  try {
    return nonEmptyString(await Neutralino.computer.getArch(), window.NL_ARCH);
  } catch {
    return nonEmptyString(window.NL_ARCH);
  }
}
__name(getArchitecture, "getArchitecture");
function getMessage(error) {
  if (error instanceof Error) return error.stack || error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return error.message || "An unexpected error occurred";
    }
  }
  return String(error || "An unexpected error occurred");
}
__name(getMessage, "getMessage");
function getDiagnosticErrorMessage(error) {
  if (error instanceof Error) return error.message || "An unexpected error";
  if (error && typeof error === "object" && error.message) {
    return String(error.message);
  }
  return getMessage(error);
}
__name(getDiagnosticErrorMessage, "getDiagnosticErrorMessage");
function getDiagnosticStackTrace(error) {
  if (error instanceof Error && error.stack) return error.stack;
  if (error && typeof error === "object" && typeof error.stack === "string") {
    return error.stack;
  }
  let nativeDetails = "No extra native error details were provided.";
  if (error && typeof error === "object") {
    try {
      nativeDetails = JSON.stringify(error, null, 2);
    } catch {
    }
  }
  return `No JavaScript stack trace was provided by Neutralino.
Native error details:
${nativeDetails}`;
}
__name(getDiagnosticStackTrace, "getDiagnosticStackTrace");
function describeIssue(error) {
  const message = getMessage(error);
  const lower = message.toLowerCase();
  if (lower.includes("crypt_e_no_revocation_check") || lower.includes("schannel") && lower.includes("exit code 35")) {
    return {
      title: "Windows could not verify the download certificate",
      summary: "WeekBox was blocked by Windows before the download started. Check your date and time, then try another network. A VPN, proxy, or antivirus HTTPS scanning can also block the certificate check.",
      tag: "Windows certificate check",
      reportable: false
    };
  }
  if (lower.includes("onedrive") || lower.includes("exit code 23")) {
    return {
      title: "Choose a local storage folder",
      summary: "WeekBox cannot safely download engines into OneDrive. Use a local folder such as C:\\WeekBoxData instead.",
      actionLabel: "Open storage settings",
      action: "storage",
      tag: "Storage location"
    };
  }
  if (lower.includes("access is denied") || lower.includes("permission")) {
    return {
      title: "WeekBox cannot write to this folder",
      summary: "Check that your storage folder is local, writable, and not being used by another program.",
      actionLabel: "Open storage settings",
      action: "storage",
      tag: "Folder access"
    };
  }
  if (lower.includes("could not access the engine folder") || lower.includes("filesystem error")) {
    return {
      title: "WeekBox cannot access the storage drive",
      summary: "The folder containing this engine is unavailable or cannot be read. Check that the selected drive is connected and writable.",
      actionLabel: "Open storage settings",
      action: "storage",
      tag: "Storage drive unavailable"
    };
  }
  if (lower.includes("exit code 22") || /\b(?:403|404)\b/.test(lower)) {
    return {
      title: "This download is no longer available",
      summary: "The selected engine file could not be downloaded. Try another version or try again later.",
      tag: "Download unavailable"
    };
  }
  if (lower.includes("download link is missing") || lower.includes("download link is invalid") || lower.includes("download does not have a valid link") || lower.includes("could not find the google drive file id") || lower.includes("does not point to a downloadable file")) {
    return {
      title: "This download link is not usable",
      summary: "The mod page does not provide a direct file link. Choose another download or ask the mod author to replace the link.",
      tag: "Invalid external download",
      reportable: false
    };
  }
  if (!lower.includes("end-of-central-directory signature not found") && !lower.includes("cannot find zipfile directory") && (lower.includes("extraction failed") || lower.includes("invalid archive") || lower.includes("archive file"))) {
    return {
      title: "WeekBox could not unpack the download",
      summary: "The downloaded file may be incomplete or invalid. Retry the download with a local storage folder.",
      tag: "Archive problem"
    };
  }
  if (lower.includes("downloaded archive is empty") || lower.includes("downloaded archive did not contain any files")) {
    return {
      title: "This download has no files to install",
      summary: "The download source provided an empty package. Nothing was installed. Try another download option or come back later; if it keeps happening, the upload needs to be fixed by its author.",
      tag: "Empty download",
      // This is a bad or empty upload, not an application failure. Do not send
      // a stack trace to diagnostics (or its webhook) for it.
      reportable: false
    };
  }
  if (lower.includes("disk image does not contain a macos application")) {
    return {
      title: "The macOS installer contains no app",
      summary: "WeekBox mounted the downloaded disk image but could not find an application inside it. Try another version or report this release to the engine author.",
      tag: "Invalid macOS installer"
    };
  }
  if (lower.includes("end-of-central-directory signature not found") || lower.includes("cannot find zipfile directory")) {
    return {
      title: "The download was not a ZIP file",
      summary: "The download source returned something other than the expected archive, often an expired link or a server error page. WeekBox kept it from being installed. Try again later or choose another version.",
      tag: "Invalid download file"
    };
  }
  if (lower.includes("does not contain a runnable engine")) {
    return {
      title: "This engine build is not supported",
      summary: `The download finished, but WeekBox could not find a runnable ${window.NL_OS === "Darwin" ? "macOS" : window.NL_OS === "Linux" ? "Linux" : "Windows"} app file. Copy the report so we can investigate this version.`,
      tag: "Unsupported build"
    };
  }
  return {
    title: "Something went wrong",
    summary: "WeekBox could not finish this action. Copy the error report if you need help.",
    tag: "Unexpected error"
  };
}
__name(describeIssue, "describeIssue");
function createReport({ error, action, item, version, storagePath, issue }) {
  return [
    "WeekBox support report",
    `Time: ${(/* @__PURE__ */ new Date()).toLocaleString()}`,
    `OS: ${window.NL_OS || "Unknown"}`,
    `Action: ${action || "Unknown"}`,
    item ? `Item: ${item}` : null,
    version ? `Version: ${version}` : null,
    storagePath ? `Storage path: ${sanitizeDiagnosticText(storagePath)}` : null,
    `Issue: ${issue.tag}`,
    `What happened: ${issue.summary}`
  ].filter(Boolean).join("\n");
}
__name(createReport, "createReport");
async function submitDiagnosticReport(context, issue) {
  if (!appSettings.get("diagnosticReportingConsentAnswered") || !appSettings.get("diagnosticReportingEnabled")) {
    return;
  }
  const errorMessage = getDiagnosticErrorMessage(context.error);
  const stackTrace = getDiagnosticStackTrace(context.error);
  const [operatingSystem, architecture] = await Promise.all([
    getOperatingSystem(),
    getArchitecture()
  ]);
  const response = await fetch(DIAGNOSTIC_REPORT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appVersion: nonEmptyString(window.NL_APPVERSION),
      operatingSystem: sanitizeDiagnosticText(operatingSystem),
      architecture: sanitizeDiagnosticText(architecture),
      action: sanitizeDiagnosticText(context.action || issue.tag),
      errorMessage: sanitizeDiagnosticText(errorMessage),
      stackTrace: sanitizeDiagnosticText(stackTrace)
    })
  });
  if (response.status !== 202) {
    console.warn(`Diagnostic reporting failed with status ${response.status}`);
  }
}
__name(submitDiagnosticReport, "submitDiagnosticReport");
async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}
__name(copyText, "copyText");
var errorHandler = {
  ensureModal() {
    let modal = document.getElementById("weekbox-error-modal");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "weekbox-error-modal";
    modal.className = "error-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "weekbox-error-title");
    modal.innerHTML = `
      <div class="error-content" role="document">
        <div class="error-rail" aria-hidden="true"><i class="fa-solid fa-triangle-exclamation"></i></div>
        <div class="error-main">
          <header class="error-header">
            <div><h2 id="weekbox-error-title"></h2></div>
            <button type="button" class="error-close" aria-label="Close error message"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <p class="error-summary"></p>
          <details class="error-details"><summary>Technical details</summary><pre></pre></details>
          <footer class="error-actions">
            <button type="button" class="error-action error-settings" hidden><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span></span></button>
            <button type="button" class="error-action error-copy"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>Copy error report</span></button>
          </footer>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal.querySelector(".error-close").addEventListener("click", () => this.close());
    modal.addEventListener("click", (event) => {
      if (event.target === modal) this.close();
    });
    return modal;
  },
  show(context) {
    const issue = describeIssue(context.error);
    const report = createReport({ ...context, issue });
    const modal = this.ensureModal();
    modal.querySelector("h2").textContent = issue.title;
    modal.querySelector(".error-summary").textContent = issue.summary;
    modal.querySelector("pre").textContent = report;
    if (issue.reportable !== false) {
      submitDiagnosticReport(context, issue).catch((error) => {
        console.warn("Could not send diagnostic report:", error);
      });
    }
    const settingsButton = modal.querySelector(".error-settings");
    settingsButton.hidden = issue.action !== "storage";
    settingsButton.querySelector("span").textContent = issue.actionLabel || "";
    settingsButton.onclick = () => {
      this.close();
      document.getElementById("config-btn")?.click();
    };
    const copyButton = modal.querySelector(".error-copy");
    copyButton.onclick = async () => {
      const copied = await copyText(report);
      copyButton.querySelector("span").textContent = copied ? "Report copied" : "Copy failed";
      setTimeout(() => {
        copyButton.querySelector("span").textContent = "Copy error report";
      }, 1600);
    };
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
  },
  close() {
    const modal = document.getElementById("weekbox-error-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
};

// app/src/ui/js/engines/engineInstallFiles.js
function throwIfCancelled(isCancelled) {
  if (isCancelled()) throw new Error("Cancelled");
}
__name(throwIfCancelled, "throwIfCancelled");
async function flattenEngineDirectory({
  engineDir,
  findExecutable,
  isCancelled = /* @__PURE__ */ __name(() => false, "isCancelled"),
  platform = window.NL_OS,
  filesystem = Neutralino.filesystem,
  os = Neutralino.os
}) {
  if (platform === "Darwin") return;
  throwIfCancelled(isCancelled);
  const executablePath = await findExecutable(engineDir);
  throwIfCancelled(isCancelled);
  if (!executablePath) return;
  const executableDir = executablePath.slice(
    0,
    Math.max(
      executablePath.lastIndexOf("/"),
      executablePath.lastIndexOf("\\")
    )
  ).replace(/\\/g, "/");
  const normalizedEngineDir = engineDir.replace(/\\/g, "/");
  if (executableDir === normalizedEngineDir || !executableDir.startsWith(normalizedEngineDir))
    return;
  try {
    const files = await filesystem.readDirectory(executableDir);
    for (const file of files) {
      throwIfCancelled(isCancelled);
      if (file.entry === "." || file.entry === "..") continue;
      await filesystem.move(
        `${executableDir}/${file.entry}`,
        `${normalizedEngineDir}/${file.entry}`
      );
    }
    throwIfCancelled(isCancelled);
    const relativePart = executableDir.substring(
      normalizedEngineDir.length + 1
    );
    const directoryToRemove = `${normalizedEngineDir}/${relativePart.split("/")[0]}`;
    if (platform === "Windows") {
      await os.execCommand(
        `rmdir /S /Q "${directoryToRemove.replace(/\//g, "\\")}"`,
        {
          background: true
        }
      ).catch(() => {
      });
    } else {
      await os.execCommand(`rm -rf "${directoryToRemove}"`, { background: true }).catch(() => {
      });
    }
  } catch (error) {
    console.warn("Could not organize engine folder:", error);
  }
}
__name(flattenEngineDirectory, "flattenEngineDirectory");
async function describeExtractedFiles({
  directory,
  limit = 24,
  filesystem = Neutralino.filesystem
}) {
  const files = [];
  const directories = [directory];
  const root = directory.replace(/\\/g, "/");
  while (directories.length && files.length < limit) {
    const currentDirectory = directories.shift();
    let entries;
    try {
      entries = await filesystem.readDirectory(currentDirectory);
    } catch (error) {
      return `Could not list extracted files: ${error?.message || String(error)}`;
    }
    for (const entry of entries) {
      if (entry.entry === "." || entry.entry === "..") continue;
      const fullPath = `${currentDirectory}/${entry.entry}`;
      if (String(entry.type).toUpperCase() === "DIRECTORY") {
        directories.push(fullPath);
      } else {
        files.push(fullPath.slice(root.length + 1));
        if (files.length >= limit) break;
      }
    }
  }
  return files.length ? files.join(", ") + (directories.length ? ", \u2026" : "") : "No files were found after extraction";
}
__name(describeExtractedFiles, "describeExtractedFiles");

// app/src/ui/js/engines/downloadEngine.js
var downloadEngine = {
  activeTasks: /* @__PURE__ */ new Map(),
  getTaskKey(engineId, version) {
    return `${engineId}:${version}`;
  },
  getActiveTask(engineId, version) {
    return this.activeTasks.get(this.getTaskKey(engineId, version)) || null;
  },
  async stopProcess(task) {
    if (!task?.pid) return;
    const command = window.NL_OS === "Windows" ? `taskkill /T /F /PID ${task.pid}` : `kill -TERM ${task.pid}`;
    try {
      await Neutralino.os.execCommand(command, { background: false });
    } catch (error) {
      console.warn("Could not stop engine install process:", error);
    }
  },
  notifyState(task, state) {
    task.state = state;
    task.onStateChange?.(state);
  },
  throwIfCancelled(task) {
    if (task?.cancelled) throw new Error("Cancelled");
  },
  async cleanupTask(task) {
    await this.stopProcess(task);
    await FS.api.remove(task.tempFilePath).catch(() => {
    });
    const vPath = task.engineDir;
    try {
      if (window.NL_OS === "Windows") {
        await Neutralino.os.execCommand(`rmdir /S /Q "${vPath.replace(/\//g, "\\")}"`, {
          background: true
        }).catch(() => {
        });
      } else {
        await Neutralino.os.execCommand(`rm -rf "${vPath}"`, { background: true }).catch(() => {
        });
      }
    } catch (e) {
    }
  },
  async cancel(engineId, version) {
    const key = this.getTaskKey(engineId, version);
    const task = this.activeTasks.get(key);
    if (!task) return;
    task.cancelled = true;
    this.notifyState(task, "cancelled");
    await this.cleanupTask(task);
  },
  async cleanupAll() {
    await Promise.all(
      [...this.activeTasks.entries()].map(async ([key, task]) => {
        task.cancelled = true;
        await this.cleanupTask(task);
      })
    );
  },
  async copyEngineDirectory(source, destination) {
    await Neutralino.filesystem.copy(source, destination, {
      recursive: true,
      overwrite: true
    });
  },
  async flattenEngineDir(engineDir, isCancelled = () => false) {
    return flattenEngineDirectory({
      engineDir,
      findExecutable: FS.findExecutable.bind(FS),
      isCancelled
    });
  },
  async describeExtractedFiles(directory, limit = 24) {
    return describeExtractedFiles({ directory, limit });
  },
  async install(engineId, version, downloadUrl, onProgress, onStateChange) {
    if (!FS.isInitialized) await FS.init();
    FS.assertStorageUnlocked();
    if (FS.isOneDriveStorage()) {
      throw new Error(
        "WeekBox storage is inside OneDrive. Choose a local folder outside OneDrive, such as C:\\WeekBoxData, before downloading engines."
      );
    }
    const enginesBasePath = FS.enginesPath;
    const engineDir = `${enginesBasePath}/${engineId}/${version}`;
    const archiveExtension = window.NL_OS === "Darwin" && /\.dmg(?:$|[?#])/i.test(downloadUrl) ? ".dmg" : ".zip";
    const tempFilePath = `${enginesBasePath}/temp_${engineId}_${version}${archiveExtension}`;
    const taskKey = this.getTaskKey(engineId, version);
    if (this.activeTasks.has(taskKey)) return false;
    const task = {
      cancelled: false,
      pid: null,
      tempFilePath,
      engineDir,
      phase: "downloading",
      progressInfo: { status: "Preparing environment...", progress: 0 },
      onStateChange
    };
    this.activeTasks.set(taskKey, task);
    const updateProgress = /* @__PURE__ */ __name((status, progress) => {
      task.progressInfo = { status, progress };
      if (typeof onProgress === "function") {
        onProgress({ status, progress });
      }
    }, "updateProgress");
    try {
      this.notifyState(task, "downloading");
      updateProgress("Preparing environment...", 0);
      await FS.api.ensureDir(enginesBasePath);
      await FS.api.ensureDir(`${enginesBasePath}/${engineId}`);
      await FS.api.ensureDir(engineDir);
      await FS.api.write(`${engineDir}/.downloading`, "1");
      this.throwIfCancelled(task);
      updateProgress("Connecting...", 2);
      await downloadArchive({
        url: downloadUrl,
        outPath: tempFilePath,
        getTask: /* @__PURE__ */ __name(() => this.activeTasks.get(taskKey), "getTask"),
        onProgress: updateProgress
      });
      this.throwIfCancelled(task);
      const archiveStats = await Neutralino.filesystem.getStats(tempFilePath);
      if (!archiveStats.size) {
        throw new Error("Download finished without creating an archive file");
      }
      task.phase = "extracting";
      this.notifyState(task, "installing");
      updateProgress("Download complete. Extracting archive...", 98);
      await extractArchive({
        archivePath: tempFilePath,
        destinationPath: engineDir,
        getTask: /* @__PURE__ */ __name(() => this.activeTasks.get(taskKey), "getTask"),
        onEntry: /* @__PURE__ */ __name((file) => updateProgress(`Extracting: ${file}`, 98), "onEntry"),
        extractNested: true
      });
      this.throwIfCancelled(task);
      updateProgress("Extracted. Organizing engine files...", 99);
      await this.flattenEngineDir(engineDir, () => task.cancelled);
      this.throwIfCancelled(task);
      updateProgress("Checking for a runnable engine...", 99);
      const executablePath = await FS.findExecutable(engineDir);
      if (!executablePath) {
        const searchError = FS.getExecutableSearchError();
        if (searchError) {
          throw new Error(
            `WeekBox could not access the engine folder after extraction: ${searchError}`
          );
        }
        const extractedFiles = await this.describeExtractedFiles(engineDir);
        throw new Error(
          `The downloaded archive does not contain a runnable engine. Extracted files: ${extractedFiles}`
        );
      }
      if (window.NL_OS !== "Windows") {
        await Neutralino.os.execCommand(`chmod 755 "${executablePath}"`, { background: true }).catch(() => {
        });
      }
      this.throwIfCancelled(task);
      updateProgress("Cleaning temporary files...", 99);
      await FS.api.remove(tempFilePath).catch(() => {
      });
      await FS.api.remove(`${engineDir}/.downloading`).catch(() => {
      });
      this.throwIfCancelled(task);
      updateProgress("Setting up installed mods...", 99);
      const injectionResults = await FS.injectModsIntoEngine(engineId, version);
      this.throwIfCancelled(task);
      injectionResults.filter((result) => result.status === "rejected").forEach(
        (result) => console.warn("Could not inject installed mod:", result.reason)
      );
      updateProgress("Completed", 100);
      this.notifyState(task, "completed");
      this.activeTasks.delete(taskKey);
      return true;
    } catch (error) {
      if (!task.cancelled) {
        console.error(`Error installing engine ${engineId}:`, error);
        errorHandler.show({
          error,
          action: "Install engine",
          item: engineId,
          version,
          storagePath: FS.weekboxPath
        });
      }
      await FS.api.remove(tempFilePath).catch(() => {
      });
      try {
        if (window.NL_OS === "Windows") {
          await Neutralino.os.execCommand(
            `rmdir /S /Q "${engineDir.replace(/\//g, "\\")}"`,
            { background: true }
          );
        } else {
          await Neutralino.os.execCommand(`rm -rf "${engineDir}"`, {
            background: true
          });
        }
      } catch (e) {
      }
      if (!task.cancelled) {
        this.notifyState(task, "error");
      }
      this.activeTasks.delete(taskKey);
      return false;
    }
  },
  async update(engineId, version, downloadUrl, onProgress, onStateChange) {
    const updateVersion = `.update-${Date.now()}`;
    const engineRoot = `${FS.enginesPath}/${engineId}`;
    const currentDir = `${engineRoot}/${version}`;
    const backupDir = `${engineRoot}/.previous-${Date.now()}`;
    const installed = await this.install(
      engineId,
      updateVersion,
      downloadUrl,
      onProgress,
      onStateChange
    );
    if (!installed) return false;
    let backupReady = false;
    try {
      if (!await FS.findExecutable(`${engineRoot}/${updateVersion}`)) {
        await FS.api.remove(`${engineRoot}/${updateVersion}`).catch(() => {
        });
        return false;
      }
      await FS.cleanupEngineMods(engineId, version);
      await FS.cleanupEngineMods(engineId, updateVersion);
      await FS.api.remove(backupDir).catch(() => {
      });
      if (await FS.api.exists(currentDir)) {
        await this.copyEngineDirectory(currentDir, backupDir);
        backupReady = true;
        await FS.api.remove(currentDir);
      }
      await this.copyEngineDirectory(
        `${engineRoot}/${updateVersion}`,
        currentDir
      );
      await FS.api.remove(`${engineRoot}/${updateVersion}`);
      await FS.api.remove(backupDir).catch(() => {
      });
      await FS.injectModsIntoEngine(engineId, version);
      return true;
    } catch (error) {
      await FS.api.remove(`${engineRoot}/${updateVersion}`).catch(() => {
      });
      if (backupReady && await FS.api.exists(backupDir)) {
        await FS.api.remove(currentDir).catch(() => {
        });
        await this.copyEngineDirectory(backupDir, currentDir).catch(() => {
        });
      }
      if (await FS.api.exists(currentDir)) {
        await FS.injectModsIntoEngine(engineId, version).catch(() => {
        });
      }
      console.error("Could not replace engine update:", error);
      return false;
    }
  }
};

// app/src/ui/js/home/modal/downloadMod.js
import { FS as FS3 } from "../utils/index-utils.js";
import {
  sanitizeModFolderName,
  sanitizePathSegment
} from "../utils/index-utils.js";
import { gameBananaApi } from "../../backend/providers/gamebanana/gamebanana.provider.js";

// app/src/ui/js/mod-manager/modImageLoader.js
import { FS as FS2 } from "../utils/index-utils.js";
var modCoverCache = /* @__PURE__ */ new Map();
function primeModCover(modId, coverUrl) {
  if (coverUrl) modCoverCache.set(String(modId), coverUrl);
}
__name(primeModCover, "primeModCover");
async function getModCover(modId, fetchDetails) {
  const cacheKey = String(modId);
  const localCover = await FS2.getModCover(modId);
  if (localCover) {
    primeModCover(modId, localCover);
    return localCover;
  }
  if (modCoverCache.has(cacheKey)) return modCoverCache.get(cacheKey);
  const cover = await FS2.ensureModCover(modId, async () => {
    const details = await fetchDetails(modId, {
      includeRequirements: false
    });
    const imageUrl = details?.images?.[0];
    return imageUrl === "assets/icons/launcher-icon.png" ? null : imageUrl;
  });
  primeModCover(modId, cover);
  return cover;
}
__name(getModCover, "getModCover");
function loadModCardImage({
  mod,
  card,
  fetchDetails,
  applyDominantColor: applyDominantColor4
}) {
  const image = card.querySelector(".mod-manager-cover");
  const finishLoading = /* @__PURE__ */ __name((hasCover) => {
    if (!card.isConnected) return;
    card.classList.remove("is-cover-loading");
    card.classList.toggle("has-cover", hasCover);
    card.classList.toggle("has-no-cover", !hasCover);
  }, "finishLoading");
  Promise.resolve().then(() => getModCover(mod.id, fetchDetails)).then((localCover) => {
    if (!localCover || !image) {
      finishLoading(false);
      return;
    }
    const preload = new Image();
    preload.addEventListener("load", () => {
      if (!card.isConnected) return;
      image.src = localCover;
      image.hidden = false;
      applyDominantColor4(image, card);
      requestAnimationFrame(() => finishLoading(true));
    });
    preload.addEventListener("error", () => finishLoading(false));
    preload.src = localCover;
  }).catch(() => finishLoading(false));
}
__name(loadModCardImage, "loadModCardImage");

// app/src/ui/js/home/modal/downloadMod.js
import {
  downloadArchive as downloadArchive2,
  extractArchive as extractArchive2
} from "../utils/index-utils.js";

// app/src/ui/js/toasts/toastSystem.js
var TOAST_STATES = ["complete", "error", "offer", "missing-engine"];
var toastSystem = {
  toasts: /* @__PURE__ */ new Map(),
  ensureContainer() {
    let container = document.getElementById("toast-system-container");
    if (container) return container;
    container = document.createElement("div");
    container.id = "toast-system-container";
    container.className = "toast-system-container";
    document.body.appendChild(container);
    return container;
  },
  show(id, {
    title,
    message,
    mediaHtml,
    badgeHtml = '<i class="fa-solid fa-download"></i>',
    showProgress = true,
    showPercent = false,
    onSelect,
    onCancel
  }) {
    this.remove(id);
    const toast = document.createElement("aside");
    toast.id = id;
    toast.className = "engine-update-toast toast-system-item";
    toast.classList.toggle("has-progress", showProgress);
    toast.setAttribute("role", onSelect ? "button" : "status");
    if (onSelect) toast.tabIndex = 0;
    toast.innerHTML = `
      <div class="engine-update-toast-icon"><span class="toast-system-media">${mediaHtml}</span><span class="toast-system-status-badge">${badgeHtml}</span></div>
      <div class="engine-update-toast-body">
        <div class="toast-system-heading">
          <strong>${title}</strong>${showPercent ? '<em class="toast-system-percent">0%</em>' : ""}
          ${onCancel ? '<span class="toast-system-controls"><button type="button" class="toast-system-control toast-system-cancel" aria-label="Cancel download" title="Cancel download"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button><button type="button" class="toast-system-control toast-system-collapse" aria-label="Show only progress" title="Show only progress"><i class="fa-solid fa-compress" aria-hidden="true"></i></button></span>' : ""}
        </div>
        <span>${message}</span>
        <div class="engine-update-toast-track" ${showProgress ? "" : "hidden"}><i></i></div>
      </div>
    `;
    const entry = {
      toast,
      title: toast.querySelector("strong"),
      message: toast.querySelector(".engine-update-toast-body > span"),
      icon: toast.querySelector(".engine-update-toast-icon"),
      badge: toast.querySelector(".toast-system-status-badge"),
      track: toast.querySelector(".engine-update-toast-track"),
      progress: toast.querySelector(".engine-update-toast-track i"),
      percent: toast.querySelector(".toast-system-percent")
    };
    this.toasts.set(id, entry);
    this.ensureContainer().appendChild(toast);
    toast.querySelector(".toast-system-cancel")?.addEventListener("click", (event) => {
      event.stopPropagation();
      onCancel(id);
    });
    toast.querySelector(".toast-system-collapse")?.addEventListener("click", (event) => {
      event.stopPropagation();
      const compact = toast.classList.toggle("compact");
      if (compact) {
        toast.setAttribute("aria-label", "Show full download toast");
        toast.tabIndex = 0;
      } else {
        toast.removeAttribute("aria-label");
        toast.removeAttribute("tabindex");
      }
    });
    toast.addEventListener("click", () => {
      if (!toast.classList.contains("compact")) return;
      toast.classList.remove("compact");
      toast.removeAttribute("aria-label");
      toast.removeAttribute("tabindex");
    });
    toast.addEventListener("keydown", (event) => {
      if (toast.classList.contains("compact") && (event.key === "Enter" || event.key === " ")) {
        event.preventDefault();
        toast.click();
      }
    });
    if (onSelect) {
      const select = /* @__PURE__ */ __name(() => onSelect(), "select");
      toast.addEventListener("click", select, { once: true });
      toast.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          select();
        }
      });
    }
    requestAnimationFrame(() => toast.classList.add("show"));
    return entry;
  },
  update(id, { message, progress }) {
    const entry = this.toasts.get(id);
    if (!entry) return;
    if (message !== void 0) entry.message.textContent = message;
    if (progress !== void 0) {
      const value = Math.max(0, Math.min(100, progress));
      entry.progress.style.width = `${value}%`;
      if (entry.percent) entry.percent.textContent = `${Math.floor(value)}%`;
    }
  },
  setState(id, state, { badgeHtml, showProgress } = {}) {
    const entry = this.toasts.get(id);
    if (!entry) return;
    entry.toast.classList.remove(...TOAST_STATES);
    if (state) entry.toast.classList.add(state);
    if (badgeHtml) entry.badge.innerHTML = badgeHtml;
    if (showProgress !== void 0) entry.track.hidden = !showProgress;
  },
  hide(id) {
    const entry = this.toasts.get(id);
    if (!entry) return;
    entry.toast.classList.remove("show");
    setTimeout(() => this.remove(id), 220);
  },
  remove(id) {
    const entry = this.toasts.get(id);
    if (!entry) return;
    entry.toast.remove();
    this.toasts.delete(id);
    if (this.toasts.size === 0) {
      document.getElementById("toast-system-container")?.remove();
    }
  }
};

// app/src/ui/js/home/modal/toastDownloadMod.js
var toastDownloadMod = {
  toasts: toastSystem.toasts,
  show(downloadId, name, onCancel, { iconHtml } = {}) {
    toastSystem.show(downloadId, {
      title: name,
      message: "Connecting",
      mediaHtml: iconHtml || '<i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i>',
      showPercent: true,
      onCancel
    });
  },
  update(downloadId, percent, status) {
    toastSystem.update(downloadId, {
      message: status,
      progress: percent
    });
  },
  success(downloadId) {
    toastSystem.setState(downloadId, "complete", {
      badgeHtml: '<i class="fa-solid fa-check"></i>'
    });
    toastSystem.update(downloadId, { message: "Installed", progress: 100 });
    setTimeout(() => this.hide(downloadId), 4e3);
  },
  cancelAnim(downloadId) {
    toastSystem.setState(downloadId, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark"></i>',
      showProgress: true
    });
    toastSystem.update(downloadId, { message: "Cancelling\u2026", progress: 100 });
  },
  error(downloadId, message) {
    toastSystem.setState(downloadId, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark"></i>',
      showProgress: true
    });
    toastSystem.update(downloadId, {
      message: `Error: ${message}`,
      progress: 100
    });
    setTimeout(() => this.hide(downloadId), 5e3);
  },
  hide(downloadId) {
    toastSystem.hide(downloadId);
  },
  remove(downloadId) {
    toastSystem.remove(downloadId);
  }
};

// app/src/ui/js/home/modal/downloadMod.js
var downloadMod = {
  activeTasks: /* @__PURE__ */ new Map(),
  reportInstallProgress(modId, modName, status, progress, coverUrl = null) {
    document.dispatchEvent(
      new CustomEvent("mod-install-progress", {
        detail: { modId, modName, status, progress, coverUrl }
      })
    );
  },
  async fetchModCoverUrl(modId, sourceType, fallbackCoverUrl = null) {
    const source = String(modId).match(/^(mod|tool):(\d+)$/);
    const type = sourceType === "tool" || source?.[1] === "tool" ? "tool" : "mod";
    const sourceId = source?.[2] || modId;
    const details = type === "tool" ? await gameBananaApi.getToolDetails(sourceId).catch(() => null) : await gameBananaApi.getModDetails(sourceId, { includeRequirements: false }).catch(() => null);
    const imageUrl = (type === "tool" ? details?.thumbnail : details?.images?.[0]) || fallbackCoverUrl;
    if (!imageUrl || imageUrl === "assets/icons/launcher-icon.png") return null;
    const preload = new Image();
    preload.src = imageUrl;
    return imageUrl;
  },
  async cacheModCover(modId, coverUrl) {
    return FS3.ensureModCover(modId, async () => coverUrl);
  },
  async moveEntries(entries, sourceDir, destinationDir, concurrency = 8) {
    const queue = entries.filter(
      (entry) => entry.entry !== "." && entry.entry !== ".."
    );
    let nextIndex = 0;
    const worker = /* @__PURE__ */ __name(async () => {
      while (nextIndex < queue.length) {
        const entry = queue[nextIndex];
        nextIndex += 1;
        await Neutralino.filesystem.move(
          `${sourceDir}/${entry.entry}`,
          `${destinationDir}/${entry.entry}`
        );
      }
    }, "worker");
    await Promise.all(
      Array.from({ length: Math.min(concurrency, queue.length) }, worker)
    );
  },
  async hasExtractedFiles(path) {
    const entries = await Neutralino.filesystem.readDirectory(path);
    for (const entry of entries) {
      if (entry.entry === "." || entry.entry === ".." || entry.entry === ".downloading") {
        continue;
      }
      if (entry.type === "FILE") return true;
      if (entry.type === "DIRECTORY" && await this.hasExtractedFiles(`${path}/${entry.entry}`)) {
        return true;
      }
    }
    return false;
  },
  cancel(modId) {
    const task = this.activeTasks.get(modId);
    if (task) {
      task.cancelled = true;
      this.reportInstallProgress(modId, task.modName, "cancelled", 0);
      if (task.pid) {
        const os = window.NL_OS;
        if (os === "Windows") {
          Neutralino.os.execCommand(`taskkill /T /F /PID ${task.pid}`, {
            background: true
          }).catch(() => {
          });
        } else {
          Neutralino.os.execCommand(`kill -9 ${task.pid}`, { background: true }).catch(() => {
          });
        }
      }
      toastDownloadMod.cancelAnim(modId);
      setTimeout(() => {
        this.cleanupData(modId, task.tempFilePath, task.targetModFolder);
        this.activeTasks.delete(modId);
        toastDownloadMod.hide(modId);
        const modalBtn = document.getElementById("modal-download-btn");
        if (modalBtn && document.getElementById("mod-modal").classList.contains("show")) {
          modalBtn.disabled = false;
          modalBtn.innerHTML = '<i class="fa-solid fa-download"></i> Download';
        }
      }, 600);
    }
  },
  async cleanupData(modId, tempFilePath, targetModFolder) {
    try {
      if (tempFilePath) await FS3.api.remove(tempFilePath);
    } catch (error) {
    }
    try {
      if (targetModFolder) await FS3.api.remove(targetModFolder);
    } catch (error) {
    }
    try {
      await FS3.removeInstalledMod(modId);
    } catch (error) {
    }
  },
  async install(modId, modName, downloadUrl, engineId = null, metadata = {}) {
    if (!FS3.isInitialized) await FS3.init();
    FS3.assertStorageUnlocked();
    const modsBasePath = FS3.modsPath;
    const taskKey = String(modId).replace(/[^a-z0-9_-]/gi, "_");
    const fallbackFolderName = sanitizeModFolderName(modName, `Mod-${taskKey}`);
    let storageFolderName = `${fallbackFolderName}--${taskKey}`;
    let engineFolderName = fallbackFolderName;
    let targetModFolder = `${modsBasePath}/.extract_${taskKey}`;
    const tempFilePath = `${modsBasePath}/temp_${taskKey}.zip`;
    let downloadMarkerPath = `${targetModFolder}/.downloading`;
    this.activeTasks.set(modId, {
      cancelled: false,
      pid: null,
      modName,
      tempFilePath,
      targetModFolder
    });
    const { toastThumbnail, sourceType, ...installMetadata } = metadata;
    const coverUrlPromise = this.fetchModCoverUrl(
      modId,
      sourceType,
      toastThumbnail
    );
    this.reportInstallProgress(modId, modName, "Downloading...", 2);
    toastDownloadMod.show(modId, modName, () => this.cancel(modId), {
      iconHtml: toastThumbnail ? `<img class="toast-system-thumbnail" src="${toastThumbnail}" alt="" />` : void 0
    });
    try {
      await FS3.api.ensureDir(modsBasePath);
      await FS3.api.ensureDir(targetModFolder);
      await FS3.api.write(downloadMarkerPath, "1");
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 2, "Connecting...");
      await downloadArchive2({
        url: downloadUrl,
        sourceType,
        outPath: tempFilePath,
        getTask: /* @__PURE__ */ __name(() => this.activeTasks.get(modId), "getTask"),
        onProgress: /* @__PURE__ */ __name((status, progress) => {
          toastDownloadMod.update(modId, progress, status);
          this.reportInstallProgress(modId, modName, status, progress);
        }, "onProgress")
      });
      const archiveStats = await Neutralino.filesystem.getStats(tempFilePath);
      if (!archiveStats.size) throw new Error("Downloaded archive is empty");
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 98, "Extracting...");
      this.reportInstallProgress(modId, modName, "Installing...", 98);
      const extractionStartedAt = performance.now();
      const extractionStatusTimer = setInterval(() => {
        const elapsedSeconds = Math.floor(
          (performance.now() - extractionStartedAt) / 1e3
        );
        toastDownloadMod.update(modId, 98, `Extracting... ${elapsedSeconds}s`);
        this.reportInstallProgress(modId, modName, "Installing...", 98);
      }, 2e3);
      try {
        await extractArchive2({
          archivePath: tempFilePath,
          destinationPath: targetModFolder,
          getTask: /* @__PURE__ */ __name(() => this.activeTasks.get(modId), "getTask")
        });
      } finally {
        clearInterval(extractionStatusTimer);
      }
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      let hasNestedArchive = true;
      while (hasNestedArchive) {
        hasNestedArchive = false;
        const files = await Neutralino.filesystem.readDirectory(targetModFolder);
        const realFiles = files.filter(
          (f) => f.entry !== "." && f.entry !== ".." && f.entry !== ".downloading"
        );
        if (realFiles.length === 1 && realFiles[0].type === "FILE") {
          const entryName = realFiles[0].entry.toLowerCase();
          if (entryName.endsWith(".zip") || entryName.endsWith(".rar") || entryName.endsWith(".7z") || entryName.endsWith(".tar") || entryName.endsWith(".gz")) {
            hasNestedArchive = true;
            const innerZipPath = `${targetModFolder}/${realFiles[0].entry}`;
            toastDownloadMod.update(modId, 98, "Extracting nested archive...");
            const innerTempPath = `${modsBasePath}/temp_inner_${modId}`;
            await FS3.api.ensureDir(innerTempPath);
            await extractArchive2({
              archivePath: innerZipPath,
              destinationPath: innerTempPath,
              getTask: /* @__PURE__ */ __name(() => this.activeTasks.get(modId), "getTask"),
              onEntry: /* @__PURE__ */ __name((file) => {
                toastDownloadMod.update(
                  modId,
                  98,
                  `Extracting nested - ${file}`
                );
              }, "onEntry")
            });
            if (this.activeTasks.get(modId)?.cancelled) {
              await FS3.api.remove(innerTempPath).catch(() => {
              });
              throw new Error("Cancelled");
            }
            await FS3.api.remove(innerZipPath).catch(() => {
            });
            const extractedFiles = await Neutralino.filesystem.readDirectory(innerTempPath);
            await this.moveEntries(
              extractedFiles,
              innerTempPath,
              targetModFolder
            );
            await FS3.api.remove(innerTempPath).catch(() => {
            });
          }
        }
      }
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 99, "Preparing mod folder...");
      const extractedEntries = await Neutralino.filesystem.readDirectory(targetModFolder);
      const realEntries = extractedEntries.filter(
        (entry) => entry.entry !== "." && entry.entry !== ".." && entry.entry !== ".downloading"
      );
      const wrapper = realEntries.length === 1 && realEntries[0].type === "DIRECTORY" ? realEntries[0] : null;
      if (wrapper) {
        engineFolderName = sanitizePathSegment(wrapper.entry) || fallbackFolderName;
        storageFolderName = `${sanitizeModFolderName(wrapper.entry, fallbackFolderName)}--${taskKey}`;
      }
      const stagingFolder = targetModFolder;
      const finalModFolder = `${modsBasePath}/${storageFolderName}`;
      if (await FS3.api.exists(finalModFolder)) {
        throw new Error("This mod is already installed");
      }
      if (wrapper) {
        await Neutralino.filesystem.move(
          `${stagingFolder}/${wrapper.entry}`,
          finalModFolder
        );
      } else {
        await FS3.api.ensureDir(finalModFolder);
        await this.moveEntries(realEntries, stagingFolder, finalModFolder);
      }
      await FS3.api.remove(stagingFolder).catch(() => {
      });
      targetModFolder = finalModFolder;
      downloadMarkerPath = `${targetModFolder}/.downloading`;
      const activeTask = this.activeTasks.get(modId);
      if (activeTask) activeTask.targetModFolder = targetModFolder;
      await FS3.api.ensureDir(targetModFolder);
      await FS3.api.write(downloadMarkerPath, "1");
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      toastDownloadMod.update(modId, 99, "Deleting temp Zip...");
      await FS3.api.remove(tempFilePath);
      const hasExtractedFiles = await this.hasExtractedFiles(targetModFolder);
      if (!hasExtractedFiles) {
        throw new Error("Downloaded archive did not contain any files");
      }
      await FS3.api.remove(downloadMarkerPath);
      await FS3.api.write(`${targetModFolder}/mod_url.txt`, downloadUrl);
      await FS3.saveInstalledMod(modId, modName, {
        engineId,
        folderName: storageFolderName,
        engineFolderName,
        ...installMetadata
      });
      this.reportInstallProgress(modId, modName, "Preparing cover...", 99);
      const coverUrl = await coverUrlPromise.catch(() => null);
      const localCover = await this.cacheModCover(modId, coverUrl).catch(
        () => null
      );
      primeModCover(modId, localCover);
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      const injectionResults = await FS3.injectModIntoInstalledEngines(modId);
      injectionResults.filter((result) => result.status === "rejected").forEach(
        (result) => console.warn("Could not inject mod into engine:", result.reason)
      );
      if (this.activeTasks.get(modId)?.cancelled) throw new Error("Cancelled");
      this.reportInstallProgress(modId, modName, "Installed", 100, localCover);
      await new Promise((resolve) => setTimeout(resolve, 320));
      this.reportInstallProgress(modId, modName, "complete", 100);
      document.dispatchEvent(new CustomEvent("mods-updated"));
      toastDownloadMod.success(modId);
      const modalBtn = document.getElementById("modal-download-btn");
      if (modalBtn && document.getElementById("mod-modal").classList.contains("show")) {
        modalBtn.disabled = true;
        modalBtn.innerHTML = '<i class="fa-solid fa-check"></i> Already Installed';
      }
      this.activeTasks.delete(modId);
      return true;
    } catch (error) {
      this.reportInstallProgress(modId, modName, "cancelled", 0);
      if (error.message !== "Cancelled") {
        await this.cleanupData(modId, tempFilePath, targetModFolder);
        toastDownloadMod.error(modId, error.message || "Installation failed");
        errorHandler.show({
          error,
          action: "Install mod",
          item: modName,
          storagePath: FS3.weekboxPath
        });
        this.activeTasks.delete(modId);
      }
      return false;
    }
  }
};

// app/src/ui/js/config/index.js
import { appUpdater } from "../../backend/core/index-core.js";

// app/src/ui/js/config/storageMoveFeedback.js
var TOAST_ID = "weekbox-storage-move";
var _StorageMoveFeedback = class _StorageMoveFeedback {
  constructor(toastSystem2) {
    this.toastSystem = toastSystem2;
  }
  show() {
    if (!document.getElementById("storage-move-lock")) {
      const lock = document.createElement("div");
      lock.id = "storage-move-lock";
      lock.className = "storage-move-lock";
      lock.setAttribute("aria-hidden", "true");
      document.body.appendChild(lock);
    }
    this.toastSystem.show(TOAST_ID, {
      title: "Moving WeekBox files",
      message: "Preparing files\u2026",
      mediaHtml: '<i class="fa-solid fa-folder-open" aria-hidden="true"></i>',
      showPercent: true
    });
  }
  update({ progress, copiedFiles, totalFiles }) {
    this.toastSystem.update(TOAST_ID, {
      message: `Moving files (${copiedFiles} of ${totalFiles})`,
      progress
    });
  }
  complete() {
    document.getElementById("storage-move-lock")?.remove();
    this.toastSystem.setState(TOAST_ID, "complete", {
      badgeHtml: '<i class="fa-solid fa-check" aria-hidden="true"></i>'
    });
    this.toastSystem.update(TOAST_ID, {
      message: "WeekBox files moved",
      progress: 100
    });
    setTimeout(() => this.toastSystem.hide(TOAST_ID), 3600);
  }
  fail(message) {
    document.getElementById("storage-move-lock")?.remove();
    this.toastSystem.setState(TOAST_ID, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>'
    });
    this.toastSystem.update(TOAST_ID, { message, progress: 100 });
  }
};
__name(_StorageMoveFeedback, "StorageMoveFeedback");
var StorageMoveFeedback = _StorageMoveFeedback;

// app/src/ui/js/existingStorageModal.js
var existingStorageModal = {
  show({ weekboxPath }) {
    const modal = document.createElement("section");
    modal.className = "error-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "existing-storage-title");
    modal.innerHTML = `
      <div class="error-content" role="document">
        <div class="error-rail" aria-hidden="true"><i class="fa-solid fa-hard-drive"></i></div>
        <div class="error-main">
          <header class="error-header">
            <div><h2 id="existing-storage-title">Use this WeekBox library?</h2></div>
            <button type="button" class="error-close" aria-label="Cancel"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <p class="error-summary">Use the existing library as-is, or move the current library here. Replacing keeps the old library in a timestamped backup folder.</p>
          <p class="storage-recommendation-path"></p>
          <footer class="error-actions">
            <button type="button" class="error-action existing-storage-cancel">Cancel</button>
            <button type="button" class="error-action existing-storage-replace"><i class="fa-solid fa-right-left" aria-hidden="true"></i><span>Replace with current</span></button>
            <button type="button" class="error-action error-settings existing-storage-use"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>Use this library</span></button>
          </footer>
        </div>
      </div>`;
    modal.querySelector(".storage-recommendation-path").textContent = weekboxPath;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));
    return new Promise((resolve) => {
      const close = /* @__PURE__ */ __name((choice) => {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.remove();
          resolve(choice);
        }, 220);
      }, "close");
      modal.querySelector(".error-close").onclick = () => close("cancel");
      modal.querySelector(".existing-storage-cancel").onclick = () => close("cancel");
      modal.querySelector(".existing-storage-use").onclick = () => close("use");
      modal.querySelector(".existing-storage-replace").onclick = () => close("replace");
      modal.onclick = (event) => {
        if (event.target === modal) close("cancel");
      };
      modal.querySelector(".existing-storage-use").focus();
    });
  }
};

// app/src/ui/js/config/index.js
import { networkStatus } from "../../backend/core/index-core.js";
import { syncWindowsProtocolRegistration } from "../../backend/core/index-core.js";
var appUpdates = new AppUpdateController(appUpdater);
var storageMoveFeedback = new StorageMoveFeedback(toastSystem);
async function formatStoragePath(path) {
  const value = String(path || "");
  if (window.NL_OS !== "Windows") return value;
  try {
    return await Neutralino.filesystem.getUnnormalizedPath(value);
  } catch {
    return value;
  }
}
__name(formatStoragePath, "formatStoragePath");
async function isSameStoragePath(left, right) {
  const normalise = /* @__PURE__ */ __name(async (path) => {
    const value = String(path || "");
    try {
      return (await Neutralino.filesystem.getNormalizedPath(value)).replace(/[\\/]+$/, "").toLowerCase();
    } catch {
      return value.replace(/[\\/]+$/, "").toLowerCase();
    }
  }, "normalise");
  const [normalisedLeft, normalisedRight] = await Promise.all([
    normalise(left),
    normalise(right)
  ]);
  return normalisedLeft === normalisedRight;
}
__name(isSameStoragePath, "isSameStoragePath");
var configModal = {
  async init() {
    if (!document.getElementById("config-modal")) {
      const tpl = document.getElementById("tpl-config-modal");
      if (!tpl) return;
      const html = tpl.innerHTML;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper.firstElementChild);
      if (window.NL_OS !== "Windows") {
        document.getElementById("setting-registerProtocolLinks")?.closest(".setting-item")?.remove();
      }
      this.bindEvents();
      this.updateNetworkAvailability();
      networkStatus.addEventListener(
        "change",
        () => this.updateNetworkAvailability()
      );
    }
  },
  bindEvents() {
    document.getElementById("config-close-btn").addEventListener("click", () => this.close());
    document.getElementById("config-modal").addEventListener("click", (e) => {
      if (e.target.id === "config-modal") this.close();
    });
    document.querySelectorAll("#config-modal a[href]").forEach((link) => {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        Neutralino.os.open(link.href).catch(() => {
        });
      });
    });
    document.querySelector('[data-credit-message="Oyachi"]')?.addEventListener("click", () => {
      Neutralino.os.showMessageBox(
        "To Oyachi",
        "Sorry for not using your logo and art. I really loved it, and I do love you a lot. I always will.\n\n- Malloy",
        "OK",
        "INFO"
      ).catch(() => {
      });
    });
    document.getElementById("choose-storage-location")?.addEventListener("click", () => this.chooseStorageLocation());
    document.getElementById("use-default-storage-location")?.addEventListener("click", () => this.useDefaultStorageLocation());
    document.getElementById("cleanup-incomplete-downloads")?.addEventListener("click", () => this.cleanupIncompleteDownloads());
    document.getElementById("storage-location-path")?.addEventListener("click", () => this.openStorageLocation());
    document.getElementById("check-app-update")?.addEventListener("click", () => {
      if (appUpdates.pendingUpdate) return appUpdates.install();
      return this.checkForAppUpdate();
    });
    document.addEventListener("app-update-available", (event) => {
      this.showAvailableAppUpdate(event.detail);
    });
    const tabBtns = document.querySelectorAll(".config-tab-btn");
    tabBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        tabBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const targetId = btn.getAttribute("data-tab-target");
        document.querySelectorAll(".config-tab-content").forEach((content) => {
          content.style.display = "none";
          content.classList.remove("active");
        });
        const targetContent = document.getElementById(`config-${targetId}`);
        if (targetContent) {
          targetContent.style.display = "block";
          targetContent.classList.add("active");
        }
        const titleElement = document.getElementById("config-section-title");
        if (titleElement) {
          titleElement.textContent = targetId.charAt(0).toUpperCase() + targetId.slice(1);
        }
      });
    });
    const toggleIds = [
      "launchOnStartup",
      "registerProtocolLinks",
      "blurOutOfFocus",
      "hideOnLaunch",
      "autoStartAfterDownload",
      "multithreadDownloads",
      "multithreadStorageMoves",
      "checkUpdatesOnStartup",
      "checkUpdatesInBackground",
      "checkAppUpdatesOnStartup",
      "diagnosticReportingEnabled"
    ];
    toggleIds.forEach((settingKey) => {
      const checkbox = document.getElementById(`setting-${settingKey}`);
      if (checkbox) {
        checkbox.addEventListener("change", async (e) => {
          const enabled = e.target.checked;
          if (settingKey === "launchOnStartup") {
            const updated = await this.handleStartupToggle(enabled);
            if (!updated) {
              checkbox.checked = appSettings2.get(settingKey);
              return;
            }
          }
          if (settingKey === "registerProtocolLinks") {
            const updated = await syncWindowsProtocolRegistration(enabled);
            if (!updated) {
              checkbox.checked = appSettings2.get(settingKey);
              return;
            }
          }
          appSettings2.set(settingKey, enabled);
        });
      }
    });
  },
  loadSettingsToUI() {
    const toggleIds = [
      "launchOnStartup",
      "registerProtocolLinks",
      "blurOutOfFocus",
      "hideOnLaunch",
      "autoStartAfterDownload",
      "multithreadDownloads",
      "multithreadStorageMoves",
      "checkUpdatesOnStartup",
      "checkUpdatesInBackground",
      "checkAppUpdatesOnStartup",
      "diagnosticReportingEnabled"
    ];
    toggleIds.forEach((settingKey) => {
      const checkbox = document.getElementById(`setting-${settingKey}`);
      if (checkbox) {
        checkbox.checked = appSettings2.get(settingKey);
      }
    });
    this.updateStorageLocationLabel();
    this.updateAppVersionLabel();
    this.updateNetworkAvailability();
    try {
      const update = JSON.parse(
        sessionStorage.getItem("weekbox_available_app_update") || "null"
      );
      if (update?.asset) this.showAvailableAppUpdate(update);
    } catch {
    }
  },
  async updateStorageLocationLabel() {
    const label = document.getElementById("storage-location-path");
    if (label)
      label.textContent = await formatStoragePath(
        FS4.weekboxPath || "AppData/WeekBox"
      );
  },
  async cleanupIncompleteDownloads() {
    const button = document.getElementById("cleanup-incomplete-downloads");
    if (!button) return;
    button.disabled = true;
    button.textContent = "Cleaning\u2026";
    try {
      await FS4.cleanupIncompleteDownloads();
      button.textContent = "Cleaned up";
    } catch {
      button.textContent = "Cleanup failed";
    }
    setTimeout(() => {
      button.disabled = false;
      button.textContent = "Clean up";
    }, 1800);
  },
  async openStorageLocation() {
    if (!FS4.weekboxPath) return;
    await Neutralino.os.open(FS4.weekboxPath).catch((error) => {
      console.warn("Could not open the WeekBox storage folder", error);
    });
  },
  async updateAppVersionLabel() {
    return appUpdates.updateVersionLabel();
  },
  showAvailableAppUpdate(update) {
    return appUpdates.showAvailable(update);
  },
  async checkForAppUpdate() {
    if (!networkStatus.online) return;
    return appUpdates.check();
  },
  updateNetworkAvailability() {
    const button = document.getElementById("check-app-update");
    const status = document.getElementById("app-update-status");
    if (!button) return;
    button.disabled = !networkStatus.online;
    button.title = networkStatus.online ? "" : "Connect to the internet to check for WeekBox updates";
    if (!networkStatus.online && status) {
      status.textContent = "Connect to the internet to check for updates.";
    }
  },
  async installAppUpdate() {
    return appUpdates.install();
  },
  hasActiveDownloads() {
    return downloadEngine.activeTasks.size > 0 || downloadMod.activeTasks.size > 0;
  },
  showStorageMoveToast() {
    storageMoveFeedback.show();
  },
  updateStorageMoveToast({ progress, copiedFiles, totalFiles }) {
    storageMoveFeedback.update({ progress, copiedFiles, totalFiles });
  },
  completeStorageMoveToast() {
    storageMoveFeedback.complete();
  },
  failStorageMoveToast(message) {
    storageMoveFeedback.fail(message);
  },
  async chooseStorageLocation() {
    if (FS4.hasRunningProcesses() || this.hasActiveDownloads()) {
      await Neutralino.os.showMessageBox(
        "Cannot move WeekBox files",
        "Close all running engines and wait for downloads to finish before changing the storage location.",
        "OK",
        "WARNING"
      );
      return;
    }
    const button = document.getElementById("choose-storage-location");
    try {
      const selectedPath = await Neutralino.os.showFolderDialog(
        "Choose WeekBox's parent folder (not a folder named WeekBox)",
        { defaultPath: FS4.basePath }
      );
      if (!selectedPath) return;
      if (await isSameStoragePath(selectedPath, FS4.basePath) || await isSameStoragePath(selectedPath, FS4.weekboxPath)) {
        await Neutralino.os.showMessageBox(
          "Already using this location",
          "WeekBox is already using this storage location, so there is nothing to move.",
          "OK",
          "INFO"
        );
        return;
      }
      const existingStorage = await FS4.findExistingStorage(selectedPath);
      if (existingStorage) {
        const choice2 = await existingStorageModal.show({
          ...existingStorage,
          weekboxPath: await formatStoragePath(existingStorage.weekboxPath)
        });
        if (choice2 === "replace") {
          button.disabled = true;
          button.innerHTML = '<i class="fa-solid fa-folder-open"></i> Moving files\u2026';
          this.showStorageMoveToast();
          await FS4.moveStorageTo(
            existingStorage.basePath,
            (progress) => this.updateStorageMoveToast(progress),
            { replaceExisting: true }
          );
          this.updateStorageLocationLabel();
          this.completeStorageMoveToast();
          return;
        }
        if (choice2 !== "use") return;
        button.disabled = true;
        button.innerHTML = '<i class="fa-solid fa-folder-open"></i> Switching library\u2026';
        await FS4.useExistingStorage(existingStorage.basePath);
        location.reload();
        return;
      }
      if (/(?:^|[\\/])weekbox[\\/]*$/i.test(selectedPath)) {
        await Neutralino.os.showMessageBox(
          "Choose the parent folder",
          "This WeekBox folder is incomplete. Select a parent folder instead (for example, AppData\\Local, not AppData\\Local\\WeekBox).",
          "OK",
          "WARNING"
        );
        return;
      }
      const newWeekboxPath = `${selectedPath.replace(/[\\/]+$/, "")}/WeekBox`;
      const choice = await Neutralino.os.showMessageBox(
        "Move WeekBox files?",
        `WeekBox will move all mods, engines, and data to:
${await formatStoragePath(newWeekboxPath)}

This can take a while for large libraries.`,
        "YES_NO",
        "QUESTION"
      );
      if (choice !== "YES") return;
      if (FS4.hasRunningProcesses() || this.hasActiveDownloads()) {
        throw new Error(
          "Close all running engines and wait for downloads to finish before moving WeekBox files."
        );
      }
      button.disabled = true;
      button.textContent = "Moving files\u2026";
      button.innerHTML = '<i class="fa-solid fa-folder-open"></i> Choose folder';
      this.showStorageMoveToast();
      await FS4.moveStorageTo(
        selectedPath,
        (progress) => this.updateStorageMoveToast(progress)
      );
      this.updateStorageLocationLabel();
      this.completeStorageMoveToast();
    } catch (error) {
      console.error("Could not move WeekBox storage", error);
      this.failStorageMoveToast(
        error.message || "Could not move WeekBox files."
      );
      await Neutralino.os.showMessageBox(
        "Could not move WeekBox files",
        error.message || "An unexpected error occurred while moving files.",
        "OK",
        "ERROR"
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.innerHTML = '<i class="fa-solid fa-folder-open"></i> Choose folder';
      }
    }
  },
  async useDefaultStorageLocation() {
    if (FS4.hasRunningProcesses() || this.hasActiveDownloads()) {
      await Neutralino.os.showMessageBox(
        "Cannot move WeekBox files",
        "Close all running engines and wait for downloads to finish before changing the storage location.",
        "OK",
        "WARNING"
      );
      return;
    }
    const button = document.getElementById("use-default-storage-location");
    const chooseButton = document.getElementById("choose-storage-location");
    try {
      const defaultPath = await FS4.getDefaultStorageParentPath();
      const defaultWeekboxPath = `${defaultPath.replace(/[\\/]+$/, "")}/WeekBox`;
      const choice = await Neutralino.os.showMessageBox(
        "Use the default location?",
        `WeekBox will move all mods, engines, and data to:
${await formatStoragePath(defaultWeekboxPath)}

This can take a while for large libraries.`,
        "YES_NO",
        "QUESTION"
      );
      if (choice !== "YES") return;
      button.disabled = true;
      chooseButton.disabled = true;
      button.textContent = "Moving files\xE2\u20AC\xA6";
      button.textContent = "Use default";
      this.showStorageMoveToast();
      await FS4.moveStorageTo(
        defaultPath,
        (progress) => this.updateStorageMoveToast(progress)
      );
      appSettings2.set("storageParentPath", null);
      this.updateStorageLocationLabel();
      this.completeStorageMoveToast();
    } catch (error) {
      console.error("Could not use the default WeekBox storage", error);
      this.failStorageMoveToast(
        error.message || "Could not move WeekBox files."
      );
      await Neutralino.os.showMessageBox(
        "Could not move WeekBox files",
        error.message || "An unexpected error occurred while moving files.",
        "OK",
        "ERROR"
      );
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = "Use default";
      }
      if (chooseButton) chooseButton.disabled = false;
    }
  },
  async handleStartupToggle(enabled) {
    if (window.NL_OS !== "Windows") return false;
    try {
      const exePath = `${window.NL_PATH}\\WeekBox.exe`;
      if (enabled) await Neutralino.filesystem.getStats(exePath);
      const command = enabled ? `cmd /c reg add "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /t REG_SZ /d "\\"${exePath}\\"" /f` : `cmd /c reg delete "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run" /v "WeekBox" /f`;
      const result = await Neutralino.os.execCommand(command, {
        background: false
      });
      if (result.exitCode !== 0) {
        throw new Error(result.stdErr || "Windows Registry command failed");
      }
      return true;
    } catch (error) {
      console.error("Could not configure Windows startup", error);
      return false;
    }
  },
  async open() {
    await this.init();
    const modal = document.getElementById("config-modal");
    if (!modal) return;
    this.loadSettingsToUI();
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
  },
  close() {
    const modal = document.getElementById("config-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  }
};

// app/src/ui/js/diagnosticsConsentModal.js
import { appSettings as appSettings3 } from "../../backend/core/index-core.js";
var diagnosticsConsentModal = {
  async showIfNeeded() {
    if (appSettings3.get("diagnosticReportingConsentAnswered")) return;
    const modal = document.createElement("section");
    modal.className = "diagnostic-consent-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "diagnostic-consent-title");
    modal.innerHTML = `
      <div class="diagnostic-consent-panel">
        <div class="diagnostic-consent-icon" aria-hidden="true"><i class="fa-solid fa-shield-heart"></i></div>
        <div class="diagnostic-consent-main">
          <h2 id="diagnostic-consent-title">Help improve WeekBox</h2>
          <p>If WeekBox breaks, it can send an error report to the people who make WeekBox so they can fix it. Your personal file locations, email address, and common secret codes are removed before it is sent.</p>
          <label class="diagnostic-consent-choice">
            <span><strong>Send diagnostic reports</strong></span>
            <span class="switch"><input type="checkbox" checked /><span class="slider round"></span></span>
          </label>
          <button type="button" class="diagnostic-consent-confirm">Continue</button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));
    const checkbox = modal.querySelector("input");
    const confirm = modal.querySelector(".diagnostic-consent-confirm");
    confirm.focus();
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") event.preventDefault();
    });
    await new Promise((resolve) => {
      confirm.addEventListener("click", async () => {
        confirm.disabled = true;
        appSettings3.set("diagnosticReportingEnabled", checkbox.checked);
        appSettings3.set("diagnosticReportingConsentAnswered", true);
        await appSettings3.write().catch(() => {
        });
        modal.remove();
        resolve();
      });
    });
  }
};

// app/src/ui/js/engine-manager/index.js
import { FS as FS6 } from "../utils/index-utils.js";
import { ENGINE_DETAILS as ENGINE_DETAILS3 } from "../../backend/config/engines.config.js";

// app/src/ui/js/engines/engineUpdateService.js
import { getEngineUpdateCandidate } from "../../backend/providers/github/github-release.provider.js";
import { ENGINE_DETAILS as ENGINE_DETAILS2 } from "../../backend/config/engines.config.js";
import { FS as FS5 } from "../utils/index-utils.js";

// app/src/ui/js/engines/utils.js
function getTargetPlatform(versionData) {
  const os = window.NL_OS;
  const arch = window.NL_ARCH;
  if (os === "Windows") {
    if (arch === "x64") {
      return versionData.win64 ? "win64" : versionData.win ? "win" : null;
    } else {
      return versionData.win32 ? "win32" : versionData.win ? "win" : null;
    }
  } else if (os === "Linux") {
    return versionData.lin ? "lin" : null;
  } else if (os === "Darwin") {
    if (arch === "x64")
      return versionData.mac64 ? "mac64" : versionData.mac ? "mac" : null;
    if (arch === "arm64")
      return versionData.macarm ? "macarm" : versionData.mac ? "mac" : null;
    return versionData.mac ? "mac" : versionData.mac64 ? "mac64" : versionData.macarm ? "macarm" : null;
  }
  return null;
}
__name(getTargetPlatform, "getTargetPlatform");
function getTargetLink(versionData) {
  const platform = getTargetPlatform(versionData);
  return platform ? versionData[platform] || null : null;
}
__name(getTargetLink, "getTargetLink");
function extractVersionFallback(url) {
  if (!url) return "Unknown";
  const githubMatch = url.match(/\/download\/(v?([^\/]+))\//);
  if (githubMatch && githubMatch[2]) return githubMatch[2];
  const genericMatch = url.match(
    /(?:v|-)?(\d+\.\d+(?:\.\d+)?(?:[a-zA-Z0-9-]*))/i
  );
  if (genericMatch && genericMatch[1]) return genericMatch[1];
  return "Unknown";
}
__name(extractVersionFallback, "extractVersionFallback");

// app/src/ui/js/engines/engineUpdateModal.js
function ensureModal() {
  let overlay = document.getElementById("engine-update-modal");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "engine-update-modal";
  overlay.className = "engine-update-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="engine-update-modal" role="dialog" aria-modal="true" aria-labelledby="engine-update-title">
      <div class="engine-update-heading">
        <img class="engine-update-mark" alt="" />
        <h2 id="engine-update-title"></h2>
      </div>
      <p class="engine-update-copy">There's a new update detected for this engine!</p>
      <div class="engine-update-build"></div>
      <div class="engine-update-actions">
        <button type="button" class="engine-update-later">Not now</button>
        <button type="button" class="engine-update-confirm">Update engine <i class="fa-solid fa-arrow-right"></i></button>
      </div>
    </section>
  `;
  document.body.appendChild(overlay);
  return overlay;
}
__name(ensureModal, "ensureModal");
var engineUpdateModal = {
  confirm({ engineId, name, icon, candidate }) {
    const overlay = ensureModal();
    const platform = getTargetPlatform(candidate);
    const buildKey = candidate.updateKeys?.[platform] || candidate.updateKey;
    const buildLabel = candidate.isNightly ? `Nightly build \xB7 ${buildKey?.replace("nightly:", "").slice(0, 8) || "new commit"}` : `Release v${candidate.version}`;
    overlay.querySelector("#engine-update-title").textContent = name;
    const iconElement = overlay.querySelector(".engine-update-mark");
    iconElement.src = icon ? `assets/icons/${icon}` : "";
    iconElement.hidden = !icon;
    overlay.querySelector(".engine-update-build").textContent = buildLabel;
    return new Promise((resolve) => {
      const confirm = overlay.querySelector(".engine-update-confirm");
      const later = overlay.querySelector(".engine-update-later");
      const finish = /* @__PURE__ */ __name((result) => {
        overlay.classList.remove("show");
        overlay.removeEventListener("click", onOverlayClick);
        document.removeEventListener("keydown", onKeydown);
        setTimeout(() => overlay.hidden = true, 180);
        resolve(result);
      }, "finish");
      const onOverlayClick = /* @__PURE__ */ __name((event) => {
        if (event.target === overlay) finish("dismissed");
      }, "onOverlayClick");
      const onKeydown = /* @__PURE__ */ __name((event) => {
        if (event.key === "Escape") finish("dismissed");
      }, "onKeydown");
      confirm.onclick = () => finish("update");
      later.onclick = () => finish("skip");
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("show"));
      overlay.addEventListener("click", onOverlayClick);
      document.addEventListener("keydown", onKeydown);
      confirm.focus();
    });
  }
};

// app/src/ui/js/engines/engineUpdateToast.js
import { ENGINE_DETAILS } from "../../backend/config/engines.config.js";
function getToastId(engineId) {
  return `engine-update-toast-${engineId}`;
}
__name(getToastId, "getToastId");
var engineUpdateToast = {
  show(engineId, name) {
    toastSystem.show(getToastId(engineId), {
      title: name,
      message: "Preparing update",
      mediaHtml: `<img src="assets/icons/${ENGINE_DETAILS[engineId]?.icon || "exe.png"}" alt="" />`,
      showPercent: true
    });
  },
  update(engineId, { progress, status }) {
    toastSystem.update(getToastId(engineId), {
      message: status,
      progress
    });
  },
  complete(engineId) {
    const id = getToastId(engineId);
    toastSystem.setState(id, "complete", {
      badgeHtml: '<i class="fa-solid fa-check"></i>'
    });
    toastSystem.update(id, { message: "Updated", progress: 100 });
    setTimeout(() => this.hide(engineId), 4200);
  },
  info(engineId, name, message) {
    this.show(engineId, name);
    const id = getToastId(engineId);
    toastSystem.setState(id, "complete", {
      badgeHtml: '<i class="fa-solid fa-check"></i>'
    });
    toastSystem.update(id, { message, progress: 100 });
    setTimeout(() => this.hide(engineId), 2600);
  },
  offer(engineId, name, icon, onSelect) {
    toastSystem.show(getToastId(engineId), {
      title: `${name} Update Available!`,
      message: "Click to review",
      mediaHtml: `<img src="assets/icons/${icon}" alt="" />`,
      badgeHtml: '<i class="fa-solid fa-exclamation" aria-hidden="true"></i>',
      showProgress: false,
      onSelect: /* @__PURE__ */ __name(() => {
        this.hide(engineId);
        onSelect();
      }, "onSelect")
    });
    toastSystem.setState(getToastId(engineId), "offer");
  },
  error(engineId) {
    const id = getToastId(engineId);
    toastSystem.setState(id, "error", {
      badgeHtml: '<i class="fa-solid fa-xmark"></i>'
    });
    toastSystem.update(id, { message: "Update failed, existing engine kept" });
    setTimeout(() => this.hide(engineId), 5200);
  },
  missingEngine(engineId, name, icon) {
    const id = getToastId(`missing-engine-${engineId || "unassigned"}`);
    toastSystem.show(id, {
      title: "Engine missing",
      message: engineId ? `Install ${name} to launch this mod` : "Assign an engine in Mod Manager",
      mediaHtml: `<img src="assets/icons/${icon || "exe.png"}" alt="" />`,
      badgeHtml: '<i class="fa-solid fa-xmark" aria-hidden="true"></i>',
      showProgress: false
    });
    toastSystem.setState(id, "error");
    setTimeout(
      () => this.hide(`missing-engine-${engineId || "unassigned"}`),
      4600
    );
  },
  hide(engineId) {
    toastSystem.hide(getToastId(engineId));
  }
};

// app/src/ui/js/engines/engineUpdateService.js
import { appSettings as appSettings4 } from "../../backend/core/index-core.js";
import { networkStatus as networkStatus2 } from "../../backend/core/index-core.js";
var SKIP_PREFIX = "weekbox-engine-update-skip-";
var UPDATE_STATE_FILE = "engineupdatestate.json";
var AUTO_CHECK_INTERVAL_MS = 3 * 60 * 60 * 1e3;
var scheduledCheck = null;
function getBuildStateKey(engineId, installedVersion) {
  return `${engineId}:${installedVersion}`;
}
__name(getBuildStateKey, "getBuildStateKey");
async function readUpdateState() {
  if (!FS5.isInitialized) await FS5.init();
  try {
    const state = JSON.parse(
      await FS5.api.read(`${FS5.dataPath}/${UPDATE_STATE_FILE}`)
    );
    return state && typeof state === "object" ? state : {};
  } catch {
    return {};
  }
}
__name(readUpdateState, "readUpdateState");
async function getInstalledBuild(engineId, installedVersion) {
  const state = await readUpdateState();
  return state.builds?.[getBuildStateKey(engineId, installedVersion)] || null;
}
__name(getInstalledBuild, "getInstalledBuild");
async function saveInstalledBuild(engineId, installedVersion, buildKey) {
  const state = await readUpdateState();
  state.builds || (state.builds = {});
  state.builds[getBuildStateKey(engineId, installedVersion)] = buildKey;
  await FS5.api.write(
    `${FS5.dataPath}/${UPDATE_STATE_FILE}`,
    JSON.stringify(state, null, 2)
  );
}
__name(saveInstalledBuild, "saveInstalledBuild");
function getValue(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
__name(getValue, "getValue");
function setValue(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
  }
}
__name(setValue, "setValue");
async function rememberInstalledEngineBuild(engineId, versionData, installedVersion = versionData.version) {
  const platform = getTargetPlatform(versionData);
  const key = versionData.updateKeys?.[platform] || versionData.updateKey || (versionData.isNightly ? null : `release:${versionData.releaseVersion || versionData.version}`);
  if (key) await saveInstalledBuild(engineId, installedVersion, key);
}
__name(rememberInstalledEngineBuild, "rememberInstalledEngineBuild");
async function findAvailableUpdate(engineId, installedVersion) {
  if (engineId === "psychonline" && installedVersion !== "Latest") {
    return { status: "pinned" };
  }
  const candidate = await getEngineUpdateCandidate(engineId);
  if (!candidate) return { status: "unavailable" };
  const platform = getTargetPlatform(candidate);
  const key = candidate.updateKeys?.[platform] || candidate.updateKey;
  if (!key) return { status: "unavailable" };
  if (getValue(`${SKIP_PREFIX}${engineId}`) === key)
    return { status: "skipped" };
  const savedBuild = await getInstalledBuild(engineId, installedVersion);
  if (savedBuild === key) return { status: "current" };
  if (engineId === "psychonline" && installedVersion === "Latest") {
    await saveInstalledBuild(engineId, installedVersion, key);
    return { status: "current" };
  }
  if (candidate.isNightly && installedVersion !== "Nightly") {
    return { status: "current" };
  }
  if (!candidate.isNightly && installedVersion === candidate.version) {
    await rememberInstalledEngineBuild(engineId, candidate, installedVersion);
    return { status: "current" };
  }
  const url = getTargetLink(candidate);
  return url ? { status: "available", candidate, key, url } : { status: "unavailable" };
}
__name(findAvailableUpdate, "findAvailableUpdate");
var engineUpdateService = {
  startScheduledChecks() {
    if (scheduledCheck) return;
    if (!networkStatus2.online) return;
    if (appSettings4.get("checkUpdatesOnStartup")) {
      void this.checkForUpdatesInBackground();
    }
    scheduledCheck = setInterval(() => {
      if (appSettings4.get("checkUpdatesInBackground")) {
        void this.checkForUpdatesInBackground();
      }
    }, AUTO_CHECK_INTERVAL_MS);
  },
  async checkForUpdatesInBackground() {
    if (!networkStatus2.online) return;
    if (!FS5.isInitialized) await FS5.init();
    const installed = await FS5.getInstalledEngines();
    for (const engineId of ["codename", "psychonline"]) {
      const installedVersion = installed.find(
        (engine) => engine.id === engineId && (engineId === "psychonline" ? engine.version === "Latest" : engine.version === "Nightly")
      )?.version;
      if (!installedVersion) continue;
      const update = await findAvailableUpdate(engineId, installedVersion);
      if (update.status !== "available") continue;
      const name = ENGINE_DETAILS2[engineId]?.name || engineId;
      engineUpdateToast.offer(
        engineId,
        name,
        ENGINE_DETAILS2[engineId]?.icon,
        () => this.promptAndUpdate(engineId, installedVersion, update)
      );
    }
  },
  async promptAndUpdate(engineId, installedVersion, update) {
    if (FS5.isEngineRunning(engineId, installedVersion)) {
      return { status: "running" };
    }
    const name = ENGINE_DETAILS2[engineId]?.name || engineId;
    const choice = await engineUpdateModal.confirm({
      engineId,
      name,
      icon: ENGINE_DETAILS2[engineId]?.icon,
      candidate: update.candidate
    });
    if (choice === "skip") {
      setValue(`${SKIP_PREFIX}${engineId}`, update.key);
      return { status: "skipped" };
    }
    if (choice !== "update") return { status: "dismissed" };
    engineUpdateToast.show(engineId, name);
    const updated = await downloadEngine.update(
      engineId,
      installedVersion,
      update.url,
      (progress) => engineUpdateToast.update(engineId, progress)
    );
    if (updated) {
      await rememberInstalledEngineBuild(
        engineId,
        update.candidate,
        installedVersion
      );
      engineUpdateToast.complete(engineId);
      return { status: "updated" };
    }
    engineUpdateToast.error(engineId);
    return { status: "error" };
  },
  async checkEngineUpdate(engineId, installedVersion) {
    if (!networkStatus2.online) return { status: "offline" };
    const update = await findAvailableUpdate(engineId, installedVersion);
    if (update.status !== "available") return update;
    return this.promptAndUpdate(engineId, installedVersion, update);
  }
};

// app/src/ui/js/engine-manager/index.js
import { applyDominantColor } from "../utils/index-utils.js";
import { networkStatus as networkStatus3 } from "../../backend/core/index-core.js";
var engineManagerModal = {
  currentIndex: 0,
  resizeObserver: null,
  async init() {
    if (!document.getElementById("engine-manager-modal")) {
      const tpl = document.getElementById("tpl-engine-manager");
      if (!tpl) return;
      const html = tpl.innerHTML;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = html;
      document.body.appendChild(wrapper.firstElementChild);
      document.getElementById("engine-manager-close-btn").addEventListener("click", () => this.close());
      document.getElementById("engine-manager-modal").addEventListener("click", (e) => {
        if (e.target.id === "engine-manager-modal") this.close();
      });
      networkStatus3.addEventListener("change", () => {
        if (document.getElementById("engine-manager-modal")?.classList.contains("show")) {
          void this.loadInstalledEngines();
        }
      });
      document.addEventListener("weekbox-process-exit", () => {
        if (document.getElementById("engine-manager-modal")?.classList.contains("show")) {
          void this.loadInstalledEngines();
        }
      });
    }
  },
  async open() {
    await this.init();
    if (!FS6.isInitialized) await FS6.init();
    const modal = document.getElementById("engine-manager-modal");
    if (!modal) return;
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
    await this.loadInstalledEngines();
  },
  close() {
    const modal = document.getElementById("engine-manager-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
      if (this.resizeObserver) {
        this.resizeObserver.disconnect();
        this.resizeObserver = null;
      }
    }, 300);
  },
  async loadInstalledEngines() {
    const engines = await FS6.getInstalledEngines();
    this.render(engines);
  },
  render(engines) {
    const container = document.getElementById("engine-manager-modal-body");
    if (!container) return;
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    container.innerHTML = "";
    if (engines.length === 0) {
      container.innerHTML = `<div class="empty-mods-state" style="margin: auto;">No engines installed yet.</div>`;
      return;
    }
    const groupedEngines = {};
    engines.forEach((engine) => {
      if (!groupedEngines[engine.id]) {
        groupedEngines[engine.id] = [];
      }
      groupedEngines[engine.id].push(engine.version);
    });
    const ENGINE_ORDER = [
      "vslice",
      "codename",
      "psych",
      "pslice",
      "fpsplus",
      "psychonline",
      "executable"
    ];
    const sortedEngineEntries = Object.entries(groupedEngines).sort((a, b) => {
      const indexA = ENGINE_ORDER.indexOf(a[0]);
      const indexB = ENGINE_ORDER.indexOf(b[0]);
      const posA = indexA === -1 ? 999 : indexA;
      const posB = indexB === -1 ? 999 : indexB;
      return posA - posB;
    });
    if (this.currentIndex >= sortedEngineEntries.length) {
      this.currentIndex = Math.max(0, sortedEngineEntries.length - 1);
    }
    const viewport = document.createElement("div");
    viewport.className = "em-carousel-viewport";
    const track = document.createElement("div");
    track.className = "em-carousel-track";
    const btnPrev = document.createElement("button");
    btnPrev.className = "em-nav-btn left";
    btnPrev.innerHTML = '<i class="fa-solid fa-chevron-left"></i>';
    const btnNext = document.createElement("button");
    btnNext.className = "em-nav-btn right";
    btnNext.innerHTML = '<i class="fa-solid fa-chevron-right"></i>';
    const indexContainer = document.createElement("div");
    indexContainer.className = "em-carousel-index";
    viewport.appendChild(track);
    viewport.appendChild(btnPrev);
    viewport.appendChild(btnNext);
    container.appendChild(viewport);
    container.appendChild(indexContainer);
    sortedEngineEntries.forEach(([engineId, versions], idx) => {
      const details = ENGINE_DETAILS3[engineId] || {
        name: engineId,
        icon: "exe.png"
      };
      const card = document.createElement("div");
      card.className = "engine-column";
      card.addEventListener("click", () => {
        if (this.currentIndex !== idx) {
          this.currentIndex = idx;
          updateCarousel();
        }
      });
      const header = document.createElement("div");
      header.className = "engine-column-header";
      header.innerHTML = `
        <img src="assets/icons/${details.icon}" alt="${details.name}" class="engine-col-icon" crossorigin="Anonymous" onerror="this.src='assets/icons/exe.png'"/>
        <span class="engine-col-name">${details.name}</span>
      `;
      card.appendChild(header);
      const imgEl = header.querySelector(".engine-col-icon");
      applyDominantColor(imgEl, card, {
        cssVar: "--engine-color",
        alpha: 0.25,
        fallback: "rgba(255, 255, 255, 0.1)"
      });
      const versionsList = document.createElement("div");
      versionsList.className = "engine-versions-list";
      versions.forEach((version) => {
        const item = document.createElement("div");
        item.className = "version-item";
        const updateDisabled = !networkStatus3.online;
        const running = FS6.isEngineRunning(engineId, version);
        item.innerHTML = `
          <span class="version-text">${version}</span>
          <div class="version-actions">
            ${engineId === "codename" && version === "Nightly" || engineId === "psychonline" && version === "Latest" ? `
              <button class="engine-action-btn engine-update-btn" title="${updateDisabled ? "Connect to the internet to check for updates" : "Check for updates"}" aria-label="Check ${details.name} for updates" ${updateDisabled ? "disabled" : ""}>
                <i class="fa-solid fa-rotate"></i>
              </button>` : ""}
            <button class="engine-action-btn engine-dir-btn" title="Open Directory">
              <i class="fa-solid fa-folder-open"></i>
            </button>
            <button class="engine-action-btn engine-delete-btn" title="${running ? "Close the engine before uninstalling" : "Uninstall Version"}" aria-label="${running ? "Close the engine before uninstalling" : "Uninstall Version"}" ${running ? "disabled" : ""}>
              <i class="fa-solid fa-trash"></i>
            </button>
          </div>
        `;
        const updateBtn = item.querySelector(".engine-update-btn");
        updateBtn?.addEventListener("click", async (e) => {
          e.stopPropagation();
          updateBtn.disabled = true;
          updateBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
          const result = await engineUpdateService.checkEngineUpdate(
            engineId,
            version
          );
          if (result.status === "current") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "Already up to date"
            );
          } else if (result.status === "skipped") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "This update is skipped"
            );
          } else if (result.status === "pinned") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "This version is pinned"
            );
          } else if (result.status === "unavailable") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "Could not check for updates"
            );
          } else if (result.status === "running") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "Close the engine before updating"
            );
          } else if (result.status === "offline") {
            engineUpdateToast.info(
              engineId,
              details.name,
              "Connect to the internet to check for updates"
            );
          }
          updateBtn.disabled = false;
          updateBtn.innerHTML = '<i class="fa-solid fa-rotate"></i>';
        });
        item.querySelector(".engine-dir-btn").addEventListener("click", async (e) => {
          e.stopPropagation();
          const targetPath = `${FS6.enginesPath}/${engineId}/${version}`;
          try {
            await Neutralino.os.open(targetPath);
          } catch (e2) {
          }
        });
        const deleteBtn = item.querySelector(".engine-delete-btn");
        deleteBtn.addEventListener("click", async (e) => {
          e.stopPropagation();
          if (FS6.isEngineRunning(engineId, version)) return;
          deleteBtn.disabled = true;
          deleteBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>`;
          const targetPath = `${FS6.enginesPath}/${engineId}/${version}`;
          try {
            if (window.NL_OS === "Windows") {
              await Neutralino.os.execCommand(
                `rmdir /S /Q "${targetPath.replace(/\//g, "\\")}"`,
                { background: false }
              ).catch(() => {
              });
            } else {
              await Neutralino.os.execCommand(`rm -rf "${targetPath}"`, { background: false }).catch(() => {
              });
            }
          } catch (e2) {
          }
          await this.loadInstalledEngines();
        });
        versionsList.appendChild(item);
      });
      card.appendChild(versionsList);
      track.appendChild(card);
      const indexIcon = document.createElement("img");
      indexIcon.className = "em-index-icon";
      indexIcon.src = `assets/icons/${details.icon}`;
      indexIcon.onerror = () => indexIcon.src = "assets/icons/exe.png";
      indexIcon.title = details.name;
      indexIcon.addEventListener("click", () => {
        this.currentIndex = idx;
        updateCarousel();
      });
      indexContainer.appendChild(indexIcon);
    });
    const updateCarousel = /* @__PURE__ */ __name(() => {
      const vw = viewport.clientWidth;
      if (vw === 0) return;
      const cardWidth = 300;
      const gap = 30;
      const offset = vw / 2 - cardWidth / 2 - this.currentIndex * (cardWidth + gap);
      track.style.transform = `translateX(${offset}px)`;
      Array.from(track.children).forEach((col, idx) => {
        col.classList.toggle("active", idx === this.currentIndex);
      });
      Array.from(indexContainer.children).forEach((icon, idx) => {
        icon.classList.toggle("active", idx === this.currentIndex);
      });
      btnPrev.style.display = this.currentIndex === 0 ? "none" : "flex";
      btnNext.style.display = this.currentIndex === sortedEngineEntries.length - 1 ? "none" : "flex";
    }, "updateCarousel");
    btnPrev.addEventListener("click", () => {
      if (this.currentIndex > 0) {
        this.currentIndex--;
        updateCarousel();
      }
    });
    btnNext.addEventListener("click", () => {
      if (this.currentIndex < sortedEngineEntries.length - 1) {
        this.currentIndex++;
        updateCarousel();
      }
    });
    this.resizeObserver = new ResizeObserver(() => updateCarousel());
    this.resizeObserver.observe(viewport);
    requestAnimationFrame(updateCarousel);
  }
};

// app/src/ui/js/engines/releaseNotes.js
var ALLOWED_TAGS = /* @__PURE__ */ new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "details",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "summary",
  "table",
  "tt",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul"
]);
var ALLOWED_ATTRIBUTES = {
  a: /* @__PURE__ */ new Set(["href", "title"]),
  img: /* @__PURE__ */ new Set(["alt", "height", "src", "title", "width"]),
  ol: /* @__PURE__ */ new Set(["start"])
};
function isSafeUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}
__name(isSafeUrl, "isSafeUrl");
function sanitizeReleaseHtml(html) {
  const documentNode = new DOMParser().parseFromString(html, "text/html");
  documentNode.body.querySelectorAll("*").forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    if (!ALLOWED_TAGS.has(tagName)) {
      if (["script", "style", "template"].includes(tagName)) {
        element.remove();
        return;
      }
      element.replaceWith(...element.childNodes);
      return;
    }
    const allowedAttributes = ALLOWED_ATTRIBUTES[tagName] || /* @__PURE__ */ new Set();
    [...element.attributes].forEach((attribute) => {
      if (!allowedAttributes.has(attribute.name.toLowerCase())) {
        element.removeAttribute(attribute.name);
      }
    });
    if ((tagName === "a" || tagName === "img") && !isSafeUrl(element.getAttribute(tagName === "a" ? "href" : "src"))) {
      element.removeAttribute(tagName === "a" ? "href" : "src");
    }
    if (tagName === "a" && element.hasAttribute("href")) {
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    }
  });
  return documentNode.body.innerHTML;
}
__name(sanitizeReleaseHtml, "sanitizeReleaseHtml");
function renderMarkdownLinks(text) {
  const documentNode = new DOMParser().parseFromString("", "text/html");
  const pattern = /\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g;
  let cursor = 0;
  let match;
  while (match = pattern.exec(text)) {
    documentNode.body.append(
      documentNode.createTextNode(text.slice(cursor, match.index))
    );
    const link = documentNode.createElement("a");
    link.href = match[2];
    link.textContent = match[1];
    documentNode.body.append(link);
    cursor = match.index + match[0].length;
  }
  documentNode.body.append(documentNode.createTextNode(text.slice(cursor)));
  return sanitizeReleaseHtml(documentNode.body.innerHTML);
}
__name(renderMarkdownLinks, "renderMarkdownLinks");
function showPlainTextNotes(container, text) {
  container.classList.add("release-notes-plain");
  container.innerHTML = renderMarkdownLinks(text);
}
__name(showPlainTextNotes, "showPlainTextNotes");
async function fetchAndRenderReleaseNotes(versionData, targetLink) {
  const notesContainer = document.getElementById("engine-release-notes");
  if (!notesContainer) return;
  notesContainer.classList.remove("release-notes-plain");
  notesContainer.innerHTML = '<p style="color: var(--text-muted);">Fetching release notes...</p>';
  const link = targetLink || versionData.win || versionData.lin || versionData.mac || "";
  const match = link.match(
    /github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\//
  );
  if (!match) {
    notesContainer.innerHTML = "<p><em>No release notes available.</em></p>";
    return;
  }
  const [owner, repository, tag] = match.slice(1);
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repository}/releases/tags/${encodeURIComponent(tag)}`,
      {
        headers: {
          Accept: "application/vnd.github.full+json",
          "X-GitHub-Api-Version": "2026-03-10"
        }
      }
    );
    if (!response.ok)
      throw new Error(`Release lookup failed: ${response.status}`);
    const release = await response.json();
    const text = release.body || "No description.";
    const html = sanitizeReleaseHtml(release.body_html || "");
    if (html) {
      notesContainer.innerHTML = html;
    } else {
      showPlainTextNotes(notesContainer, text);
    }
  } catch {
    notesContainer.innerHTML = "<p><em>Failed to fetch release notes.</em></p>";
  }
}
__name(fetchAndRenderReleaseNotes, "fetchAndRenderReleaseNotes");

// app/src/ui/js/engines/dropdown.js
import { setupDropdown } from "../utils/index-utils.js";
var engineDropdown = {
  dropdownController: null,
  setup(engine, onVersionChanged) {
    const dropdown = document.getElementById("engine-version-dropdown");
    let trigger = document.getElementById("engine-version-trigger");
    const optionsContainer = document.getElementById("engine-version-options");
    const badge = document.getElementById("engine-display-version");
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);
    trigger = newTrigger;
    const selectedText = document.getElementById("engine-version-selected");
    optionsContainer.innerHTML = "";
    if (engine.versions.length === 0) {
      selectedText.textContent = "Unknown";
      badge.textContent = `Version: Unknown`;
      return;
    }
    engine.versions.forEach((v, index) => {
      if (!v.version || v.version === "Unknown") {
        const sampleLink = v.win64 || v.win32 || v.win || v.lin || v.mac || Object.values(v).find(
          (val) => typeof val === "string" && val.startsWith("http")
        ) || "";
        v.version = extractVersionFallback(sampleLink);
      }
      const optionDiv = document.createElement("div");
      optionDiv.className = "custom-option";
      if (index === 0) optionDiv.classList.add("selected");
      optionDiv.textContent = v.version;
      optionDiv.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedText.textContent = v.version;
        badge.textContent = `Version: ${v.version}`;
        document.querySelectorAll(".custom-option").forEach((opt) => opt.classList.remove("selected"));
        optionDiv.classList.add("selected");
        this.dropdownController?.close();
        fetchAndRenderReleaseNotes(v, getTargetLink(v));
        if (onVersionChanged) onVersionChanged(v.version);
      });
      optionsContainer.appendChild(optionDiv);
    });
    const initialVersion = engine.versions[0];
    selectedText.textContent = initialVersion.version;
    badge.textContent = `Version: ${initialVersion.version}`;
    fetchAndRenderReleaseNotes(initialVersion, getTargetLink(initialVersion));
    if (onVersionChanged) onVersionChanged(initialVersion.version);
    this.destroy();
    this.dropdownController = setupDropdown(trigger, dropdown);
  },
  destroy() {
    if (this.dropdownController) {
      this.dropdownController.destroy();
      this.dropdownController = null;
    }
  }
};

// app/src/ui/js/engines/engineInstallToast.js
import { ENGINE_DETAILS as ENGINE_DETAILS4 } from "../../backend/config/engines.config.js";
function getToastId2(engineId, version) {
  return `engine-install:${engineId}:${version}`;
}
__name(getToastId2, "getToastId");
var engineInstallToast = {
  show(install) {
    if (!install) return null;
    const { engineId, version, name } = install;
    const toastId = getToastId2(engineId, version);
    if (!toastDownloadMod.toasts.has(toastId)) {
      toastDownloadMod.show(toastId, `Installing ${name}`, null, {
        iconHtml: `<img src="assets/icons/${ENGINE_DETAILS4[engineId]?.icon || "exe.png"}" alt="" />`
      });
    }
    return toastId;
  },
  update(install, progressInfo) {
    const toastId = this.show(install);
    if (!toastId) return;
    const progress = Math.min(
      100,
      Math.max(0, Number(progressInfo?.progress) || 0)
    );
    const status = String(progressInfo?.status || "Working...");
    toastDownloadMod.update(toastId, progress, status);
  },
  complete(install) {
    const toastId = this.show(install);
    if (!toastId) return;
    toastDownloadMod.success(toastId);
  },
  error(install, message) {
    const toastId = this.show(install);
    if (!toastId) return;
    toastDownloadMod.error(toastId, message);
  },
  hide(install) {
    if (!install) return;
    const { engineId, version } = install;
    toastDownloadMod.hide(getToastId2(engineId, version));
  }
};

// app/src/ui/js/engines/index.js
import { appEvents } from "../../backend/core/index-core.js";
import { getSelectedEngine } from "../../backend/core/index-core.js";
import { FS as FS8 } from "../utils/index-utils.js";

// app/src/ui/js/engines/modsMasterClass.js
import { FS as FS7 } from "../utils/index-utils.js";
var _ModsMasterClass = class _ModsMasterClass {
  async injectBeforeLaunch(engineId, version) {
    if (!FS7.isInitialized) await FS7.init();
    try {
      const results = await FS7.injectModsIntoEngine(engineId, version);
      const failed = results.filter((result) => result.status === "rejected");
      if (failed.length > 0) {
        console.warn("ModsMasterClass: Failed to inject some mods.");
      }
      return true;
    } catch (error) {
      console.error("ModsMasterClass:", error);
      return false;
    }
  }
  async cleanupAfterExit(engineId, version) {
    if (!FS7.isInitialized) await FS7.init();
    try {
      await FS7.cleanupEngineMods(engineId, version);
      return true;
    } catch (error) {
      console.error("ModsMasterClass cleanup:", error);
      return false;
    }
  }
};
__name(_ModsMasterClass, "ModsMasterClass");
var ModsMasterClass = _ModsMasterClass;
var modsMaster = new ModsMasterClass();

// app/src/ui/js/engines/index.js
import { appSettings as appSettings5 } from "../../backend/core/index-core.js";
var enginesView = {
  async init() {
    this.isVisible = true;
    const engine = getSelectedEngine();
    if (!engine) return;
    this.currentEngine = engine;
    document.getElementById("engine-display-title").textContent = engine.meta.name;
    const bottomIcon = document.getElementById("engine-bottom-icon");
    if (engine.meta.icon) {
      bottomIcon.src = `assets/icons/${engine.meta.icon}`;
      bottomIcon.style.display = "block";
    } else {
      bottomIcon.style.display = "none";
    }
    if (!FS8.isInitialized) await FS8.init();
    engineDropdown.setup(engine, (version) => {
      this.currentVersion = version;
      this.updateButtonState();
    });
  },
  destroy() {
    this.isVisible = false;
    if (this.activeInstall) {
      const task = downloadEngine.getActiveTask(
        this.activeInstall.engineId,
        this.activeInstall.version
      );
      if (task)
        engineInstallToast.update(this.activeInstall, task.progressInfo);
    }
    engineDropdown.destroy();
  },
  async updateButtonState() {
    const launchBtn = document.getElementById("launch-engine-btn");
    const dlUI = document.getElementById("download-ui");
    const dlText = document.getElementById("dl-text");
    const dlTextSizer = document.getElementById("dl-text-sizer");
    const dlTrackTextSizer = document.getElementById("dl-track-text-sizer");
    const dlActiveLayer = document.getElementById("dl-active-layer");
    const downloadActions = document.getElementById("engine-download-actions");
    if (!launchBtn) return;
    const activeTask = downloadEngine.getActiveTask(
      this.currentEngine.id,
      this.currentVersion
    );
    if (activeTask) {
      this.activeInstall = {
        engineId: this.currentEngine.id,
        version: this.currentVersion,
        name: this.currentEngine.meta.name
      };
      launchBtn.disabled = true;
      this.setupDownloadActions(launchBtn, downloadActions);
      if (activeTask.state === "installing")
        launchBtn.textContent = "Installing...";
      this.renderDownloadProgress(activeTask.progressInfo);
      engineInstallToast.hide(this.activeInstall);
      return;
    }
    this.activeInstall = null;
    if (downloadActions) downloadActions.hidden = true;
    const versionData = this.currentEngine.versions.find(
      (v) => v.version === this.currentVersion
    );
    if (!versionData) {
      launchBtn.textContent = "Unavailable";
      launchBtn.disabled = true;
      if (dlUI) dlUI.style.display = "none";
      return;
    }
    const isInstalled = await FS8.isEngineInstalled(
      this.currentEngine.id,
      this.currentVersion
    );
    const newBtn = launchBtn.cloneNode(true);
    launchBtn.parentNode.replaceChild(newBtn, launchBtn);
    const activeBtn = document.getElementById("launch-engine-btn");
    if (isInstalled) {
      activeBtn.textContent = "Launch";
      activeBtn.disabled = false;
      if (dlUI) dlUI.style.display = "none";
      let isLaunched = FS8.isEngineRunning(
        this.currentEngine.id,
        this.currentVersion
      );
      const showLaunched = /* @__PURE__ */ __name(() => {
        isLaunched = true;
        activeBtn.disabled = false;
        activeBtn.classList.add("engine-running");
        activeBtn.innerHTML = '<span class="engine-launch-label">Launched</span><span class="engine-close-label">Close</span>';
      }, "showLaunched");
      if (isLaunched) showLaunched();
      activeBtn.addEventListener("click", async () => {
        if (isLaunched) {
          activeBtn.disabled = true;
          activeBtn.classList.remove("engine-running");
          activeBtn.textContent = "Closing...";
          await FS8.closeEngine(
            this.currentEngine.id,
            this.currentVersion,
            (state) => {
              if (state === "error") {
                showLaunched();
              }
            }
          );
          return;
        }
        activeBtn.disabled = true;
        activeBtn.textContent = "Running...";
        await modsMaster.injectBeforeLaunch(
          this.currentEngine.id,
          this.currentVersion
        );
        if (appSettings5.get("hideOnLaunch")) {
          Neutralino.window.hide();
        }
        await FS8.runEngine(
          this.currentEngine.id,
          this.currentVersion,
          async (state) => {
            if (state === "launched" || state === "already_running") {
              showLaunched();
            } else if (state === "completed" || state === "error" || state === "not_found") {
              if (appSettings5.get("hideOnLaunch")) {
                Neutralino.window.show();
                Neutralino.window.focus();
              }
              isLaunched = false;
              activeBtn.classList.remove("engine-running");
              activeBtn.disabled = false;
              activeBtn.textContent = "Launch";
              await modsMaster.cleanupAfterExit(
                this.currentEngine.id,
                this.currentVersion
              );
            }
          }
        );
      });
    } else {
      const downloadUrl = getTargetLink(versionData);
      if (!downloadUrl) {
        activeBtn.textContent = "Unsupported OS";
        activeBtn.disabled = true;
        if (dlUI) dlUI.style.display = "none";
        return;
      }
      activeBtn.textContent = "Download";
      activeBtn.disabled = false;
      activeBtn.addEventListener("click", async () => {
        activeBtn.disabled = true;
        this.activeInstall = {
          engineId: this.currentEngine.id,
          version: this.currentVersion,
          name: this.currentEngine.meta.name
        };
        const install = this.activeInstall;
        const installKey = `${install.engineId}:${install.version}`;
        this.setupDownloadActions(activeBtn, downloadActions);
        this.renderDownloadProgress({
          progress: 0,
          status: "Starting download..."
        });
        const success = await downloadEngine.install(
          this.currentEngine.id,
          this.currentVersion,
          downloadUrl,
          (progressInfo) => {
            const progress = Math.min(
              100,
              Math.max(0, Number(progressInfo?.progress) || 0)
            );
            const status = String(progressInfo?.status || "Working...");
            this.downloadProgress = progress;
            this.renderDownloadProgress({ progress, status });
            if (!this.isVisible)
              engineInstallToast.update(install, {
                progress,
                status
              });
          },
          (state) => this.updateInstallState(state)
        );
        const wasCancelled = this.cancelledInstall === installKey;
        if (wasCancelled && this.rollbackPromise) await this.rollbackPromise;
        const finishedInstall = install;
        this.activeInstall = null;
        if (downloadActions) downloadActions.hidden = true;
        if (wasCancelled) {
          engineInstallToast.hide(finishedInstall);
          this.cancelledInstall = null;
          if (dlUI) dlUI.style.display = "none";
          this.updateButtonState();
          return;
        }
        if (success) {
          if (!this.isVisible) engineInstallToast.complete(finishedInstall);
          await rememberInstalledEngineBuild(
            this.currentEngine.id,
            versionData
          );
          if (dlUI) dlUI.style.display = "none";
          await this.updateButtonState();
          document.dispatchEvent(new CustomEvent("mods-updated"));
          if (appSettings5.get("autoStartAfterDownload")) {
            setTimeout(() => {
              const freshBtn = document.getElementById("launch-engine-btn");
              if (freshBtn && !freshBtn.disabled && freshBtn.textContent === "Launch") {
                freshBtn.click();
              }
            }, 500);
          }
        } else {
          if (!this.isVisible)
            engineInstallToast.error(finishedInstall, "Installation failed");
          if (dlText) dlText.textContent = "0% - Download failed";
          if (dlTextSizer) dlTextSizer.textContent = "0% - Download failed";
          if (dlTrackTextSizer)
            dlTrackTextSizer.textContent = "0% - Download failed";
          activeBtn.disabled = false;
          activeBtn.textContent = "Retry Download";
        }
      });
    }
  },
  renderDownloadProgress(progressInfo) {
    const dlUI = document.getElementById("download-ui");
    const dlText = document.getElementById("dl-text");
    const dlTextSizer = document.getElementById("dl-text-sizer");
    const dlTrackTextSizer = document.getElementById("dl-track-text-sizer");
    const dlActiveLayer = document.getElementById("dl-active-layer");
    const progress = Math.min(
      100,
      Math.max(0, Number(progressInfo?.progress) || 0)
    );
    const status = String(progressInfo?.status || "Working...");
    const progressText = `${Math.floor(progress)}% - ${status}`;
    if (dlUI) dlUI.style.display = "block";
    if (dlText) dlText.textContent = progressText;
    if (dlTextSizer) dlTextSizer.textContent = progressText;
    if (dlTrackTextSizer) dlTrackTextSizer.textContent = progressText;
    if (dlActiveLayer)
      dlActiveLayer.style.clipPath = `inset(0 ${100 - progress}% 0 0)`;
  },
  setupDownloadActions(activeBtn, downloadActions) {
    if (!downloadActions || !this.activeInstall) return;
    downloadActions.hidden = false;
    const cancelBtn = document.getElementById("cancel-engine-download-btn");
    const { engineId, version } = this.activeInstall;
    cancelBtn.onclick = async () => {
      cancelBtn.disabled = true;
      this.cancelledInstall = `${engineId}:${version}`;
      this.rollbackPromise = this.animateRollback();
      await downloadEngine.cancel(engineId, version);
    };
    activeBtn.textContent = "Downloading...";
  },
  updateInstallState(state) {
    const activeBtn = document.getElementById("launch-engine-btn");
    const cancelBtn = document.getElementById("cancel-engine-download-btn");
    if (!activeBtn) return;
    if (state === "downloading") {
      activeBtn.textContent = "Downloading...";
    } else if (state === "installing") {
      activeBtn.textContent = "Installing...";
    } else if (state === "cancelled") {
      activeBtn.textContent = "Cancelled";
      if (cancelBtn) cancelBtn.disabled = true;
    }
  },
  animateRollback() {
    const dlText = document.getElementById("dl-text");
    const dlTextSizer = document.getElementById("dl-text-sizer");
    const dlTrackTextSizer = document.getElementById("dl-track-text-sizer");
    const dlActiveLayer = document.getElementById("dl-active-layer");
    let progress = Math.max(0, this.downloadProgress || 0);
    return new Promise((resolve) => {
      const rollback = /* @__PURE__ */ __name(() => {
        progress = Math.max(0, progress - Math.max(2, progress / 12));
        const message = `${Math.ceil(progress)}% - Rolling back...`;
        if (dlText) dlText.textContent = message;
        if (dlTextSizer) dlTextSizer.textContent = message;
        if (dlTrackTextSizer) dlTrackTextSizer.textContent = message;
        if (dlActiveLayer)
          dlActiveLayer.style.clipPath = `inset(0 ${100 - progress}% 0 0)`;
        if (progress > 0) {
          setTimeout(rollback, 35);
        } else {
          resolve();
        }
      }, "rollback");
      rollback();
    });
  }
};
function registerEnginesView() {
  appEvents.addEventListener("view:loaded", (event) => {
    if (event.detail === "engines") enginesView.init();
    else enginesView.destroy();
  });
}
__name(registerEnginesView, "registerEnginesView");

// app/src/ui/js/firstRunStorageModal.js
var firstRunStorageModal = {
  show(defaultPath) {
    const modal = document.createElement("section");
    modal.className = "diagnostic-consent-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "first-run-storage-title");
    modal.innerHTML = `
      <div class="diagnostic-consent-panel">
        <div class="diagnostic-consent-icon" aria-hidden="true"><i class="fa-solid fa-folder-tree"></i></div>
        <div class="diagnostic-consent-main">
          <h2 id="first-run-storage-title">Where should WeekBox save its files?</h2>
          <p>WeekBox keeps your mods, engines, and settings together in one library folder.</p>
          <p class="first-run-storage-path"></p>
          <div class="first-run-storage-actions">
            <button type="button" class="diagnostic-consent-confirm first-run-storage-default">Use default location</button>
            <button type="button" class="error-action first-run-storage-new">Choose a different location</button>
            <button type="button" class="error-action first-run-storage-existing">Find an existing WeekBox library</button>
          </div>
        </div>
      </div>`;
    modal.querySelector(".first-run-storage-path").textContent = defaultPath;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));
    return new Promise((resolve) => {
      const finish = /* @__PURE__ */ __name((choice) => {
        modal.remove();
        resolve(choice);
      }, "finish");
      modal.querySelector(".first-run-storage-default").onclick = () => finish("default");
      modal.querySelector(".first-run-storage-new").onclick = () => finish("new");
      modal.querySelector(".first-run-storage-existing").onclick = () => finish("existing");
      modal.querySelector(".first-run-storage-default").focus();
    });
  }
};

// app/src/ui/js/home/carousel.js
import { gameBananaApi as gameBananaApi7 } from "../../backend/providers/gamebanana/gamebanana.provider.js";

// app/src/ui/js/home/modal/index.js
import { gameBananaApi as gameBananaApi6 } from "../../backend/providers/gamebanana/gamebanana.provider.js";

// app/src/ui/js/sidebar.js
import { router } from "../../backend/core/index-core.js";
import { setSelectedEngine } from "../../backend/core/index-core.js";
import { getEngineReleaseVersions } from "../../backend/providers/github/github-release.provider.js";

// app/src/ui/js/mod-manager/index.js
import { FS as FS13 } from "../utils/index-utils.js";

// app/src/ui/js/mod-manager/dependenciesRenderer.js
import { FS as FS10 } from "../utils/index-utils.js";
import { sanitizePathSegment as sanitizePathSegment3 } from "../utils/index-utils.js";
import { gameBananaApi as gameBananaApi3 } from "../../backend/providers/gamebanana/gamebanana.provider.js";

// app/src/ui/js/mod-manager/modSettingsModal.js
import { gameBananaApi as gameBananaApi2 } from "../../backend/providers/gamebanana/gamebanana.provider.js";
import { FS as FS9 } from "../utils/index-utils.js";
import { sanitizePathSegment as sanitizePathSegment2 } from "../utils/index-utils.js";

// app/src/ui/js/mod-manager/modSettingsDropdowns.js
import { ENGINE_DETAILS as ENGINE_DETAILS5 } from "../../backend/config/engines.config.js";
import { setupDropdown as setupDropdown2 } from "../utils/index-utils.js";

// app/src/ui/js/mod-manager/modSettingsTemplates.js
function escapeHtml(value) {
  return String(value || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}
__name(escapeHtml, "escapeHtml");
function getGameBananaId(mod) {
  return getGameBananaSource(mod)?.id || null;
}
__name(getGameBananaId, "getGameBananaId");
function getGameBananaSource(mod) {
  const match = String(mod?.id || "").match(/^(?:(mod|tool):)?(\d+)$/);
  if (!match) return null;
  return { type: match[1] || "mod", id: match[2] };
}
__name(getGameBananaSource, "getGameBananaSource");
function loadingContent() {
  return `
    <div class="mod-settings-modal mod-settings-loading" role="status">
      <i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>
      <span>Loading mod settings\u2026</span>
    </div>`;
}
__name(loadingContent, "loadingContent");
function settingsContent({
  mod,
  localCover,
  controlsDisabled,
  canReset,
  resetTitle,
  canMoveToDependencies,
  isDependency,
  isExecutable,
  readOnly
}) {
  return `
    <form class="mod-settings-modal">
      <header class="mod-settings-header">
        <h2 id="mod-settings-title">${isDependency ? "Dependency Settings" : "Mod Settings"}</h2>
        <div class="mod-settings-header-actions">
          <button type="button" class="mod-settings-open-folder" title="Open ${isDependency ? "Dependency" : "Mod"} Folder" aria-label="Open ${isDependency ? "dependency" : "mod"} folder"><i class="fa-solid fa-folder-open"></i></button>
          <button type="button" class="mod-settings-close" aria-label="Close ${isDependency ? "Dependency" : "Mod"} Settings"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </header>
      <div class="mod-settings-body">
        <div class="mod-settings-identity">
          <label class="mod-settings-cover-picker" title="${readOnly ? "Changes are unavailable while the mod is running" : "Change cover image"}">
            <img class="mod-settings-cover" src="${escapeHtml(localCover || "assets/icons/launcher-icon.png")}" alt="Current mod cover">
            <span><i class="fa-solid fa-image" aria-hidden="true"></i> Change image</span>
            <input class="mod-settings-file" type="file" accept="image/*" ${readOnly ? "disabled" : ""}>
          </label>
          <input class="mod-settings-name" aria-label="Mod name" value="${escapeHtml(mod.name)}" maxlength="120" required ${readOnly ? "disabled" : ""}>
        </div>
        ${isExecutable ? `
          <div class="mod-settings-engine mod-settings-executable-type">
            <div>
              <span>Type</span>
              <div class="mod-settings-executable-value"><img src="assets/icons/exe.png" alt=""><span>Executable</span></div>
            </div>
          </div>` : `<div class="mod-settings-engine" ${controlsDisabled ? 'aria-disabled="true"' : ""}>
          <label>Engine
            <span class="mod-settings-dropdown">
              <button type="button" class="mod-settings-dropdown-trigger mod-settings-engine-trigger" aria-haspopup="listbox" aria-expanded="false" ${controlsDisabled}>
                <span class="mod-settings-select-icon mod-settings-engine-icon"><i class="fa-solid fa-question-circle" aria-hidden="true"></i></span>
                <span class="mod-settings-engine-selected"></span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
              </button>
              <div class="mod-settings-dropdown-menu mod-settings-engine-menu" role="listbox" aria-label="Engine" hidden></div>
              <select class="mod-settings-engine-select" hidden></select>
            </span>
          </label>
          <label>Version
            <span class="mod-settings-dropdown">
              <button type="button" class="mod-settings-dropdown-trigger mod-settings-version-trigger" aria-haspopup="listbox" aria-expanded="false" ${controlsDisabled}>
                <span class="mod-settings-select-icon"><i class="fa-solid fa-code-branch" aria-hidden="true"></i></span>
                <span class="mod-settings-version-selected"></span><i class="fa-solid fa-chevron-down mod-settings-select-chevron" aria-hidden="true"></i>
              </button>
              <div class="mod-settings-dropdown-menu mod-settings-version-menu" role="listbox" aria-label="Version" hidden></div>
              <select class="mod-settings-version-select" hidden></select>
            </span>
          </label>
        </div>`}
        ${mod.engineLocked ? '<p class="mod-settings-note">This mod is locked to Psych Online.</p>' : ""}
        ${readOnly ? '<p class="mod-settings-note">Close the engine to change these settings. You can still open the mod folder.</p>' : ""}
      </div>
      <footer class="mod-settings-footer">
        <button type="button" class="mod-settings-reset" ${canReset && !readOnly ? "" : `disabled title="${escapeHtml(readOnly ? "Close the engine to change settings" : resetTitle)}"`}>Reset</button>
        ${isDependency ? `<button type="button" class="mod-settings-move-to-mods" ${readOnly ? "disabled" : ""}>Move to Mods</button>` : canMoveToDependencies ? `<button type="button" class="mod-settings-move-to-dependencies" ${readOnly ? "disabled" : ""}>Move to Dependencies</button>` : ""}
        <span class="mod-settings-status" role="status"></span>
        <button type="button" class="mod-settings-cancel">Cancel</button>
        <button type="submit" class="mod-settings-save" ${readOnly ? "disabled" : ""}>Save</button>
      </footer>
    </form>`;
}
__name(settingsContent, "settingsContent");

// app/src/ui/js/mod-manager/modSettingsDropdowns.js
function setupModSettingsDropdowns(overlay, mod, installedEngines) {
  const assignableEngines = Object.entries(ENGINE_DETAILS5).filter(
    ([id]) => id !== "executable"
  );
  const engineSelect = overlay.querySelector(".mod-settings-engine-select");
  const versionSelect = overlay.querySelector(".mod-settings-version-select");
  const engineIcon = overlay.querySelector(".mod-settings-engine-icon");
  const engineTrigger = overlay.querySelector(".mod-settings-engine-trigger");
  const engineMenu = overlay.querySelector(".mod-settings-engine-menu");
  const engineSelected = overlay.querySelector(".mod-settings-engine-selected");
  const versionTrigger = overlay.querySelector(".mod-settings-version-trigger");
  const versionMenu = overlay.querySelector(".mod-settings-version-menu");
  const versionSelected = overlay.querySelector(
    ".mod-settings-version-selected"
  );
  const renderVersions = /* @__PURE__ */ __name((selectedVersion = mod.engineVersion || "") => {
    const versions = installedEngines.filter((item) => item.id === engineSelect.value).map((item) => item.version);
    versionSelect.innerHTML = [
      '<option value="">Any version</option>',
      ...versions.map(
        (version) => `<option value="${escapeHtml(version)}" ${version === selectedVersion ? "selected" : ""}>${escapeHtml(version)}</option>`
      )
    ].join("");
    versionMenu.innerHTML = [
      `<button type="button" data-version="" class="${!selectedVersion ? "selected" : ""}" role="option" aria-selected="${!selectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>Any version</button>`,
      ...versions.map(
        (version) => `<button type="button" data-version="${escapeHtml(version)}" class="${version === selectedVersion ? "selected" : ""}" role="option" aria-selected="${version === selectedVersion}"><i class="fa-solid fa-code-branch" aria-hidden="true"></i>${escapeHtml(version)}</button>`
      )
    ].join("");
    versionSelected.textContent = selectedVersion || "Any version";
  }, "renderVersions");
  engineSelect.innerHTML = [
    '<option value="">Unassigned</option>',
    ...assignableEngines.map(
      ([id, details]) => `<option value="${id}" ${id === mod.engineId ? "selected" : ""}>${escapeHtml(details.name)}</option>`
    )
  ].join("");
  const renderEngines = /* @__PURE__ */ __name(() => {
    const engine = ENGINE_DETAILS5[engineSelect.value];
    engineSelected.textContent = engine?.name || "Unassigned";
    engineIcon.innerHTML = engine ? `<img src="assets/icons/${engine.icon}" alt="">` : '<i class="fa-solid fa-question-circle" aria-hidden="true"></i>';
    engineMenu.innerHTML = [
      `<button type="button" data-engine-id="" class="${!engineSelect.value ? "selected" : ""}" role="option" aria-selected="${!engineSelect.value}"><i class="fa-solid fa-question-circle" aria-hidden="true"></i>Unassigned</button>`,
      ...assignableEngines.map(
        ([id, details]) => `<button type="button" data-engine-id="${id}" class="${id === engineSelect.value ? "selected" : ""}" role="option" aria-selected="${id === engineSelect.value}"><img src="assets/icons/${details.icon}" alt="">${escapeHtml(details.name)}</button>`
      )
    ].join("");
  }, "renderEngines");
  renderEngines();
  renderVersions();
  const engineDropdown2 = setupDropdown2(
    engineTrigger,
    engineTrigger.parentElement,
    {
      menuElement: engineMenu
    }
  );
  const versionDropdown = setupDropdown2(
    versionTrigger,
    versionTrigger.parentElement,
    {
      menuElement: versionMenu
    }
  );
  engineMenu.addEventListener("click", (event) => {
    const option = event.target.closest("button[data-engine-id]");
    if (!option) return;
    engineSelect.value = option.dataset.engineId;
    renderEngines();
    renderVersions();
    engineDropdown2.close();
  });
  versionMenu.addEventListener("click", (event) => {
    const option = event.target.closest("button[data-version]");
    if (!option) return;
    versionSelect.value = option.dataset.version;
    renderVersions(versionSelect.value);
    versionDropdown.close();
  });
  return {
    engineSelect,
    versionSelect,
    destroy: /* @__PURE__ */ __name(() => {
      engineDropdown2.destroy();
      versionDropdown.destroy();
    }, "destroy")
  };
}
__name(setupModSettingsDropdowns, "setupModSettingsDropdowns");

// app/src/ui/js/mod-manager/modSettingsModal.js
import { networkStatus as networkStatus4 } from "../../backend/core/index-core.js";
var modSettingsModal = {
  isOpening: false,
  openRequestId: 0,
  dropdowns: null,
  async open({
    mod,
    isExecutable,
    installedEngines,
    onSaved,
    readOnly = false
  }) {
    if (this.isOpening) return false;
    this.close();
    this.isOpening = true;
    const requestId = ++this.openRequestId;
    const overlay = document.createElement("div");
    overlay.className = "mod-settings-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "mod-settings-title");
    overlay.innerHTML = loadingContent();
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    let localCover;
    try {
      localCover = await FS9.getModCover(mod.id);
    } finally {
      this.isOpening = false;
    }
    if (requestId !== this.openRequestId) return false;
    const controlsDisabled = readOnly || isExecutable || mod.engineLocked ? "disabled" : "";
    const isDependency = mod.kind === "dependency";
    overlay.innerHTML = settingsContent({
      mod,
      localCover,
      controlsDisabled,
      canReset: Boolean(getGameBananaSource(mod)) && networkStatus4.online,
      resetTitle: networkStatus4.online ? "Defaults are only available for GameBanana mods" : "Connect to the internet to reset GameBanana mod information",
      canMoveToDependencies: !isExecutable && mod.kind !== "dependency",
      isDependency,
      isExecutable,
      readOnly
    });
    const form = overlay.querySelector("form");
    const nameInput = overlay.querySelector(".mod-settings-name");
    const cover = overlay.querySelector(".mod-settings-cover");
    const fileInput = overlay.querySelector(".mod-settings-file");
    const status = overlay.querySelector(".mod-settings-status");
    const dropdowns = isExecutable ? null : setupModSettingsDropdowns(overlay, mod, installedEngines);
    this.dropdowns = dropdowns;
    let pendingCoverDataUrl = null;
    let pendingCoverUrl = null;
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        pendingCoverDataUrl = String(reader.result || "");
        pendingCoverUrl = null;
        cover.src = pendingCoverDataUrl;
      });
      reader.readAsDataURL(file);
    });
    const close = /* @__PURE__ */ __name(() => this.close(), "close");
    overlay.querySelector(".mod-settings-close").addEventListener("click", close);
    overlay.querySelector(".mod-settings-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelector(".mod-settings-open-folder").addEventListener("click", async () => {
      const modPath = `${FS9.modsPath}/${mod.folderName || sanitizePathSegment2(mod.name)}`;
      try {
        await Neutralino.os.open(modPath);
      } catch {
        status.textContent = "Could not open the mod folder.";
      }
    });
    overlay.querySelector(".mod-settings-reset").addEventListener("click", async () => {
      const source = getGameBananaSource(mod);
      if (!source) return;
      status.textContent = "Loading defaults\u2026";
      try {
        const details = source.type === "tool" ? await gameBananaApi2.getToolDetails(source.id) : await gameBananaApi2.getModDetails(source.id, {
          includeRequirements: false
        });
        if (!details?.title)
          throw new Error("GameBanana defaults are unavailable");
        nameInput.value = details.title;
        pendingCoverUrl = source.type === "tool" ? details?.thumbnail || null : details.images?.[0] || null;
        pendingCoverDataUrl = null;
        cover.src = pendingCoverUrl || "assets/icons/launcher-icon.png";
        status.textContent = "Defaults loaded. Save to apply them.";
      } catch (error) {
        status.textContent = error.message || "Could not load defaults.";
      }
    });
    overlay.querySelector(".mod-settings-move-to-mods")?.addEventListener("click", async (event) => {
      const moveButton = event.currentTarget;
      moveButton.disabled = true;
      status.textContent = "Moving to mods\u2026";
      try {
        await FS9.assertModChangeAllowed(mod.id);
        const movedMod = await FS9.moveDependencyToMods(mod.id);
        if (!movedMod) throw new Error("Dependency could not be moved");
        await onSaved?.();
        close();
      } catch (error) {
        status.textContent = error.message || "Could not move dependency.";
        moveButton.disabled = false;
      }
    });
    overlay.querySelector(".mod-settings-move-to-dependencies")?.addEventListener("click", async (event) => {
      const moveButton = event.currentTarget;
      moveButton.disabled = true;
      status.textContent = "Moving to dependencies\u2026";
      try {
        await FS9.assertModChangeAllowed(mod.id);
        if (!mod.engineLocked) {
          await FS9.setModEngineCompatibility(
            mod.id,
            dropdowns.engineSelect.value || null,
            dropdowns.versionSelect.value || null
          );
        }
        const movedMod = await FS9.moveModToDependencies(mod.id);
        if (!movedMod) throw new Error("Mod could not be moved");
        await onSaved?.();
        close();
      } catch (error) {
        status.textContent = error.message || "Could not move mod.";
        moveButton.disabled = false;
      }
    });
    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      const name = nameInput.value.trim();
      if (!name) return;
      const saveButton = overlay.querySelector(".mod-settings-save");
      saveButton.disabled = true;
      status.textContent = "Saving\u2026";
      try {
        await FS9.assertModChangeAllowed(mod.id);
        if (!isExecutable && !mod.engineLocked) {
          await FS9.setModEngineCompatibility(
            mod.id,
            dropdowns.engineSelect.value || null,
            dropdowns.versionSelect.value || null
          );
        }
        const appearance = { name };
        if (pendingCoverDataUrl) appearance.coverDataUrl = pendingCoverDataUrl;
        else if (pendingCoverUrl) appearance.coverUrl = pendingCoverUrl;
        if (!await FS9.updateModAppearance(mod.id, appearance)) {
          throw new Error("Mod settings could not be saved");
        }
        await onSaved?.();
        close();
      } catch (error) {
        status.textContent = error.message || "Could not save mod settings.";
        saveButton.disabled = false;
      }
    });
    return true;
  },
  close() {
    this.openRequestId += 1;
    this.dropdowns?.destroy();
    this.dropdowns = null;
    document.querySelector(".mod-settings-overlay")?.remove();
  }
};

// app/src/ui/js/mod-manager/dependenciesRenderer.js
const modManagerTemplates = __modManagerTemplates;

// app/src/ui/js/mod-manager/processUiSync.js
var ownerListeners = /* @__PURE__ */ new WeakMap();
function replaceProcessExitListener(owner, listener, eventTarget = document) {
  if (!owner) return () => {
  };
  const previous = ownerListeners.get(owner);
  if (previous) {
    previous.eventTarget.removeEventListener(
      "weekbox-process-exit",
      previous.listener
    );
    previous.eventTarget.removeEventListener(
      "weekbox-process-change",
      previous.listener
    );
  }
  eventTarget.addEventListener("weekbox-process-exit", listener);
  eventTarget.addEventListener("weekbox-process-change", listener);
  ownerListeners.set(owner, { eventTarget, listener });
  return () => {
    const current = ownerListeners.get(owner);
    if (current?.listener !== listener) return;
    eventTarget.removeEventListener("weekbox-process-exit", listener);
    eventTarget.removeEventListener("weekbox-process-change", listener);
    ownerListeners.delete(owner);
  };
}
__name(replaceProcessExitListener, "replaceProcessExitListener");
function syncLaunchButton(button, state, templates) {
  const isRunning = state === "running";
  const canSwitchMod = state === "switch";
  button.classList.toggle("is-running", isRunning);
  button.classList.toggle("is-switchable", canSwitchMod);
  button.setAttribute(
    "aria-label",
    `${isRunning ? "Close" : canSwitchMod ? "Switch Mod" : button.dataset.launchLabel} ${button.dataset.modName}`
  );
  button.innerHTML = isRunning ? templates.launchButtonRunning() : canSwitchMod ? templates.launchButtonSwitch() : templates.launchButtonDefault(button.dataset.launchLabel);
}
__name(syncLaunchButton, "syncLaunchButton");

// app/src/ui/js/mod-manager/dependenciesRenderer.js
function getDependencyUsers(dependency, allMods) {
  return allMods.filter(
    (mod) => mod.kind !== "dependency" && Array.isArray(mod.dependencies) && mod.dependencies.includes(dependency.id)
  );
}
__name(getDependencyUsers, "getDependencyUsers");
function getDependencyDetails(dependency, users) {
  if (users.length) return `Used by ${users.map((mod) => mod.name).join(", ")}`;
  if (dependency.engineId) {
    return `For ${dependency.engineId}${dependency.engineVersion ? ` ${dependency.engineVersion}` : ""}`;
  }
  return dependency.sourceType === "tool" ? "GameBanana tool dependency" : "GameBanana mod dependency";
}
__name(getDependencyDetails, "getDependencyDetails");
function loadDependencyCover(dependency, image) {
  Promise.resolve().then(async () => {
    const source = getGameBananaSource(dependency);
    if (!source) return FS10.ensureModCover(dependency.id, async () => null);
    const details = source.type === "tool" ? await gameBananaApi3.getToolDetails(source.id) : await gameBananaApi3.getModDetails(source.id, {
      includeRequirements: false
    });
    const imageUrl = source.type === "tool" ? details?.thumbnail : details?.images?.[0];
    if (!imageUrl || imageUrl === "assets/icons/launcher-icon.png") {
      return FS10.ensureModCover(dependency.id, async () => null);
    }
    const coverSource = `${source.type}:${source.id}`;
    if (dependency.coverSource !== coverSource) {
      await FS10.updateModAppearance(dependency.id, {
        coverUrl: imageUrl,
        coverSource
      });
      dependency.coverSource = coverSource;
    }
    return FS10.getModCover(dependency.id);
  }).then((localCover) => {
    if (localCover) image.src = localCover;
  }).catch(() => {
  });
}
__name(loadDependencyCover, "loadDependencyCover");
var dependenciesRenderer = {
  async render(container, dependencies, allMods, installedEngines, isListView, onDependencyRemoved, onSettingsSaved) {
    if (!dependencies.length) return;
    const section = document.createElement("section");
    section.className = "mod-manager-dependencies";
    const list = document.createElement("div");
    list.id = "mod-manager-grid-container";
    list.className = "mod-manager-dependency-list";
    if (isListView) list.classList.add("list-view");
    const syncDependencyActions = [];
    dependencies.forEach((dependency) => {
      const users = getDependencyUsers(dependency, allMods);
      const locked = FS10.isModLockedForChanges(dependency, allMods);
      const lockedMessage = "Close the engine before changing this dependency";
      const row = document.createElement("article");
      row.className = "mod-manager-dependency";
      const cover = document.createElement("img");
      cover.className = "mod-manager-dependency-cover";
      cover.src = "assets/icons/launcher-icon.png";
      cover.alt = "";
      cover.loading = "lazy";
      cover.addEventListener("error", () => {
        cover.src = "assets/icons/launcher-icon.png";
      });
      loadDependencyCover(dependency, cover);
      FS10.getModCover(dependency.id).then((localCover) => {
        if (localCover && cover.isConnected) cover.src = localCover;
      }).catch(() => {
      });
      const copy = document.createElement("div");
      copy.className = "mod-manager-dependency-copy";
      const name = document.createElement("strong");
      name.textContent = dependency.name;
      name.title = dependency.name;
      const details = document.createElement("small");
      details.textContent = getDependencyDetails(dependency, users);
      copy.append(name, details);
      const actions = document.createElement("div");
      actions.className = "mod-manager-dependency-actions";
      const directory = document.createElement("button");
      directory.type = "button";
      directory.title = "Open Dependency Folder";
      directory.innerHTML = modManagerTemplates.openDirectoryIcon();
      directory.addEventListener(
        "click",
        () => Neutralino.os.open(
          `${FS10.modsPath}/${dependency.folderName || sanitizePathSegment3(dependency.name)}`
        ).catch(() => {
        })
      );
      const settings = document.createElement("button");
      settings.type = "button";
      settings.title = locked ? "Open dependency settings (read-only while running)" : "Dependency Settings";
      settings.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
      settings.addEventListener("click", async () => {
        settings.disabled = true;
        settings.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>';
        try {
          await modSettingsModal.open({
            mod: dependency,
            isExecutable: false,
            installedEngines,
            onSaved: onSettingsSaved,
            readOnly: FS10.isModLockedForChanges(dependency, allMods)
          });
        } finally {
          settings.disabled = false;
          settings.innerHTML = '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
        }
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.title = users.length ? "Remove dependent mods first" : locked ? lockedMessage : "Delete Dependency";
      remove.disabled = users.length > 0 || locked;
      remove.innerHTML = modManagerTemplates.deleteIcon();
      remove.addEventListener("click", async () => {
        if (FS10.isModLockedForChanges(dependency, allMods)) return;
        remove.disabled = true;
        try {
          await FS10.removeInstalledMod(dependency.id);
          onDependencyRemoved(dependency.id);
        } catch (error) {
          remove.disabled = false;
        }
      });
      syncDependencyActions.push(() => {
        const isLocked = FS10.isModLockedForChanges(dependency, allMods);
        settings.disabled = false;
        settings.title = isLocked ? "Open dependency settings (read-only while running)" : "Dependency Settings";
        remove.disabled = users.length > 0 || isLocked;
        remove.title = users.length ? "Remove dependent mods first" : isLocked ? lockedMessage : "Delete Dependency";
      });
      actions.append(directory, settings, remove);
      row.append(cover, copy, actions);
      list.append(row);
    });
    section.append(list);
    container.append(section);
    let removeProcessExitListener = /* @__PURE__ */ __name(() => {
    }, "removeProcessExitListener");
    const onProcessExit = /* @__PURE__ */ __name(() => {
      if (!section.isConnected) {
        removeProcessExitListener();
        return;
      }
      syncDependencyActions.forEach((sync) => sync());
    }, "onProcessExit");
    removeProcessExitListener = replaceProcessExitListener(
      section.parentElement,
      onProcessExit
    );
  }
};

// app/src/ui/js/mod-manager/cardRenderer.js
import { FS as FS11 } from "../utils/index-utils.js";
import { gameBananaApi as gameBananaApi4 } from "../../backend/providers/gamebanana/gamebanana.provider.js";
import {
  ENGINE_DETAILS as ENGINE_DETAILS6,
  getEngineLaunchBehavior
} from "../../backend/config/engines.config.js";
import { applyDominantColor as applyDominantColor2 } from "../utils/index-utils.js";
const modManagerTemplates2 = __modManagerTemplates;
var cardRenderer = {
  async renderCards(gridContainer, modsToRender, allMods, standaloneMods, installedEngines, onModDeleted, onSettingsSaved) {
    const standaloneModIds = new Set(standaloneMods.map((m) => String(m.id)));
    const fragment = document.createDocumentFragment();
    const refreshLaunchButtons = /* @__PURE__ */ __name(() => {
      gridContainer.querySelectorAll(".mod-manager-launch-btn").forEach((button) => {
        const isStandalone = button.dataset.launchKind === "standalone";
        const engine = isStandalone ? null : {
          id: button.dataset.engineId,
          version: button.dataset.engineVersion
        };
        const state = FS11.getModLaunchState(
          { id: button.dataset.modId },
          engine,
          isStandalone
        );
        syncLaunchButton(button, state, modManagerTemplates2);
      });
    }, "refreshLaunchButtons");
    const refreshChangeButtons = /* @__PURE__ */ __name(() => {
      gridContainer.querySelectorAll(".mod-manager-card").forEach((card) => {
        const mod = allMods.find(
          (item) => String(item.id) === card.dataset.modId
        );
        if (!mod) return;
        const locked = FS11.isModLockedForChanges(mod, allMods);
        const message = "Close the engine before changing this mod";
        const deleteBtn = card.querySelector(".mod-manager-delete-btn");
        const settingsBtn = card.querySelector(".mod-manager-settings-btn");
        const visibilityBtn = card.querySelector(".mod-manager-vis-btn");
        if (!deleteBtn || !settingsBtn || !visibilityBtn) return;
        deleteBtn.disabled = locked;
        deleteBtn.title = locked ? message : "Delete Mod";
        deleteBtn.setAttribute("aria-label", locked ? message : "Delete Mod");
        settingsBtn.disabled = false;
        settingsBtn.title = locked ? "Open mod settings (read-only while running)" : "Mod Settings";
        settingsBtn.setAttribute("aria-label", settingsBtn.title);
        visibilityBtn.disabled = locked;
        visibilityBtn.title = locked ? message : "Toggle Visibility";
      });
    }, "refreshChangeButtons");
    let removeProcessExitListener = /* @__PURE__ */ __name(() => {
    }, "removeProcessExitListener");
    const onProcessExit = /* @__PURE__ */ __name(() => {
      if (!gridContainer.isConnected) {
        removeProcessExitListener();
        return;
      }
      refreshLaunchButtons();
      refreshChangeButtons();
    }, "onProcessExit");
    removeProcessExitListener = replaceProcessExitListener(
      gridContainer.parentElement,
      onProcessExit
    );
    for (const mod of modsToRender) {
      const isExecutable = standaloneModIds.has(String(mod.id));
      const engine = isExecutable ? null : installedEngines.find(
        (item) => item.id === mod.engineId && (!mod.engineVersion || item.version === mod.engineVersion)
      );
      let engineBadgeHtml = modManagerTemplates2.unassignedBadge();
      if (isExecutable) {
        engineBadgeHtml = modManagerTemplates2.executableBadge();
      } else if (mod.engineLocked) {
        const engineInfo = ENGINE_DETAILS6.psychonline;
        engineBadgeHtml = modManagerTemplates2.engineBadge(
          engineInfo.name,
          engineInfo.icon
        );
      } else {
        const engineInfo = ENGINE_DETAILS6[mod.engineId];
        if (engineInfo) {
          engineBadgeHtml = modManagerTemplates2.engineBadge(
            engineInfo.name,
            engineInfo.icon
          );
        }
      }
      const isHidden = mod.hidden;
      const isUnassigned = !isExecutable && !mod.engineId;
      const eyeIcon = mod.hidden ? "fa-eye-slash" : "fa-eye";
      const card = document.createElement("div");
      card.className = "mod-manager-card";
      card.dataset.modId = String(mod.id);
      card.dataset.modSearch = String(mod.name || "").toLocaleLowerCase();
      card.classList.toggle("is-hidden", Boolean(mod.hidden));
      card.classList.toggle("is-unassigned", isUnassigned);
      if (mod.hidden) {
        card.style.opacity = "0.5";
      }
      const launchLabel = isExecutable || getEngineLaunchBehavior(mod.engineId)?.scope === "exclusive-mod" ? "Launch Mod" : "Launch Engine";
      card.innerHTML = modManagerTemplates2.cardContent(
        isExecutable ? "standalone" : "engine",
        mod.id,
        engine?.id || "",
        engine?.version || "",
        launchLabel,
        mod.name,
        mod.hidden,
        isUnassigned,
        eyeIcon,
        engineBadgeHtml
      );
      card.classList.add("is-cover-loading");
      loadModCardImage({
        mod,
        card,
        fetchDetails: gameBananaApi4.getModDetails.bind(gameBananaApi4),
        applyDominantColor: applyDominantColor2
      });
      const deleteBtn = card.querySelector(".mod-manager-delete-btn");
      const launchBtn = card.querySelector(".mod-manager-launch-btn");
      launchBtn.addEventListener("click", async () => {
        launchBtn.disabled = true;
        try {
          if (FS11.getModLaunchState(mod, engine, isExecutable) === "unavailable") {
            const engineInfo = ENGINE_DETAILS6[mod.engineId];
            engineUpdateToast.missingEngine(
              mod.engineId,
              engineInfo?.name || "the assigned engine",
              engineInfo?.icon
            );
            return;
          }
          await FS11.toggleModLaunch(mod, engine, isExecutable, () => {
            refreshLaunchButtons();
            refreshChangeButtons();
          });
        } catch (error) {
          console.error(error);
        } finally {
          launchBtn.disabled = false;
          refreshLaunchButtons();
          refreshChangeButtons();
        }
      });
      deleteBtn.addEventListener("click", async () => {
        if (FS11.isModLockedForChanges(mod, allMods)) return;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = modManagerTemplates2.deleteSpinner();
        try {
          await FS11.removeInstalledMod(mod.id);
          onModDeleted(mod.id);
          card.style.transform = "scale(0.8) translateY(10px)";
          card.style.opacity = "0";
          setTimeout(() => {
            card.remove();
            if (gridContainer.children.length === 0) {
              gridContainer.outerHTML = modManagerTemplates2.emptyState(
                "No mods installed yet."
              );
            }
          }, 300);
          document.dispatchEvent(new CustomEvent("mods-updated"));
        } catch (error) {
          deleteBtn.disabled = false;
          deleteBtn.innerHTML = modManagerTemplates2.deleteIcon();
        }
      });
      const settingsBtn = card.querySelector(".mod-manager-settings-btn");
      settingsBtn.addEventListener("click", async () => {
        if (settingsBtn.disabled) return;
        settingsBtn.disabled = true;
        settingsBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
          await modSettingsModal.open({
            mod,
            isExecutable,
            installedEngines,
            onSaved: onSettingsSaved,
            readOnly: FS11.isModLockedForChanges(mod, allMods)
          });
        } finally {
          settingsBtn.disabled = false;
          settingsBtn.innerHTML = '<i class="fa-solid fa-gear"></i>';
        }
      });
      const visBtn = card.querySelector(".mod-manager-vis-btn");
      visBtn.addEventListener("click", async () => {
        if (FS11.isModLockedForChanges(mod, allMods)) return;
        visBtn.disabled = true;
        const isNowHidden = !mod.hidden;
        mod.hidden = isNowHidden;
        card.classList.toggle("is-hidden", isNowHidden);
        launchBtn.disabled = isNowHidden;
        card.style.opacity = isNowHidden ? "0.5" : "1";
        visBtn.querySelector("i").className = isNowHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        try {
          await FS11.setModHidden(mod.id, isNowHidden);
          document.dispatchEvent(new CustomEvent("mods-updated"));
        } catch (error) {
          mod.hidden = !isNowHidden;
          card.classList.toggle("is-hidden", mod.hidden);
          launchBtn.disabled = mod.hidden;
          card.style.opacity = mod.hidden ? "0.5" : "1";
          visBtn.querySelector("i").className = mod.hidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
        } finally {
          visBtn.disabled = false;
        }
      });
      fragment.appendChild(card);
    }
    gridContainer.appendChild(fragment);
    refreshLaunchButtons();
    refreshChangeButtons();
  }
};

// app/src/ui/js/mod-manager/localModImportModal.js
import { ENGINE_DETAILS as ENGINE_DETAILS7 } from "../../backend/config/engines.config.js";
import { gameBananaApi as gameBananaApi5 } from "../../backend/providers/gamebanana/gamebanana.provider.js";
import { FS as FS12 } from "../utils/index-utils.js";
function folderName(path) {
  return String(path || "").split(/[\\/]/).filter(Boolean).pop() || "Local mod";
}
__name(folderName, "folderName");
var localModImportModal = {
  overlay: null,
  sourcePath: "",
  installedEngines: [],
  pendingCoverDataUrl: null,
  pendingCoverUrl: null,
  async open({ onImported } = {}) {
    this.close();
    this.sourcePath = "";
    this.pendingCoverDataUrl = null;
    this.pendingCoverUrl = null;
    this.installedEngines = await FS12.getInstalledEngines();
    this.onImported = onImported;
    this.overlay = document.createElement("div");
    this.overlay.className = "local-mod-import-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");
    document.body.appendChild(this.overlay);
    this.renderFolderStep();
    requestAnimationFrame(() => this.overlay?.classList.add("show"));
  },
  close() {
    if (!this.overlay) return;
    const overlay = this.overlay;
    this.overlay = null;
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 180);
  },
  async chooseFolder() {
    try {
      const selectedPath = await Neutralino.os.showFolderDialog(
        "Choose the mod folder"
      );
      if (!selectedPath || !this.overlay) return;
      this.sourcePath = selectedPath;
      this.renderFolderStep();
    } catch (error) {
      this.setStatus("Could not open the folder picker.");
    }
  },
  setStatus(message) {
    const status = this.overlay?.querySelector(".local-mod-import-status");
    if (status) status.textContent = message;
  },
  renderFolderStep() {
    if (!this.overlay) return;
    this.overlay.innerHTML = `
      <section class="local-mod-import-modal local-mod-import-modal--folder" aria-labelledby="local-mod-import-title">
        <header class="local-mod-import-header">
          <div><h2 id="local-mod-import-title">Import local mod</h2><p>Step 1 of 2 \xB7 Choose the mod folder</p></div>
          <button class="local-mod-import-close" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <div class="local-mod-import-body">
          <button class="local-mod-import-folder" type="button" title="Choose mod folder"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span><strong>${this.sourcePath ? folderName(this.sourcePath) : "Choose a folder"}</strong><span>${this.sourcePath || "Click to select the folder containing the mod files."}</span></span></button>
          <p class="local-mod-import-status" role="status"></p>
        </div>
        <footer class="local-mod-import-footer"><button class="local-mod-import-cancel" type="button">Cancel</button><button class="local-mod-import-next" type="button" ${this.sourcePath ? "" : "disabled"}>Next <i class="fa-solid fa-arrow-right"></i></button></footer>
      </section>`;
    this.overlay.querySelector(".local-mod-import-header p")?.remove();
    this.overlay.querySelector(".local-mod-import-close").addEventListener("click", () => this.close());
    this.overlay.querySelector(".local-mod-import-cancel").addEventListener("click", () => this.close());
    this.overlay.querySelector(".local-mod-import-folder").addEventListener("click", () => this.chooseFolder());
    this.overlay.querySelector(".local-mod-import-next").addEventListener("click", () => this.renderDetailsStep());
    this.overlay.onclick = (event) => {
      if (event.target === this.overlay) this.close();
    };
  },
  renderDetailsStep() {
    if (!this.overlay) return;
    const engineOptions = Object.entries(ENGINE_DETAILS7).filter(([id]) => id !== "executable").map(([id, engine]) => `<option value="${id}">${engine.name}</option>`).join("");
    this.overlay.innerHTML = `
      <section class="local-mod-import-modal local-mod-import-modal--details" aria-labelledby="local-mod-import-title">
        <header class="local-mod-import-header">
          <div><h2 id="local-mod-import-title">Import local mod</h2><p>Step 2 of 2 \xB7 Add its details</p></div>
          <button class="local-mod-import-close" type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
        </header>
        <form class="local-mod-import-form">
          <div class="local-mod-import-body">
            <div class="local-mod-import-details-top">
              <label class="local-mod-import-cover-picker"><input class="local-mod-import-cover-file" type="file" accept="image/*" hidden><img class="local-mod-import-cover" src="assets/icons/launcher-icon.png" alt="Mod cover"><span><i class="fa-solid fa-image"></i> Change image</span></label>
              <input class="local-mod-import-name" aria-label="Mod name" required maxlength="120">
            </div>
            <div class="local-mod-import-fields"><label>Engine<select class="local-mod-import-engine"><option value="">Unassigned</option>${engineOptions}</select></label><label>Version<select class="local-mod-import-version"><option value="">Any version</option></select></label></div>
            <p class="local-mod-import-status" role="status"></p>
          </div>
          <footer class="local-mod-import-footer"><button class="local-mod-import-back" type="button"><i class="fa-solid fa-arrow-left"></i> Back</button><button class="local-mod-import-gamebanana" type="button"><i class="fa-solid fa-cloud-arrow-down"></i> Import from GameBanana</button><button class="local-mod-import-submit" type="submit"><i class="fa-solid fa-plus"></i> Add mod</button></footer>
        </form>
      </section>`;
    this.overlay.querySelector(".local-mod-import-header p")?.remove();
    const nameInput = this.overlay.querySelector(".local-mod-import-name");
    const engineSelect = this.overlay.querySelector(".local-mod-import-engine");
    const versionSelect = this.overlay.querySelector(
      ".local-mod-import-version"
    );
    const coverImage = this.overlay.querySelector(".local-mod-import-cover");
    nameInput.value = folderName(this.sourcePath);
    const updateVersions = /* @__PURE__ */ __name(() => {
      const versions = this.installedEngines.filter((engine) => engine.id === engineSelect.value).map((engine) => engine.version);
      versionSelect.innerHTML = [
        '<option value="">Any version</option>',
        ...versions.map(
          (version) => `<option value="${version}">${version}</option>`
        )
      ].join("");
      versionSelect.disabled = !engineSelect.value;
    }, "updateVersions");
    updateVersions();
    engineSelect.addEventListener("change", updateVersions);
    this.overlay.querySelector(".local-mod-import-cover-file").addEventListener("change", (event) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.addEventListener("load", () => {
        this.pendingCoverDataUrl = String(reader.result || "");
        this.pendingCoverUrl = null;
        coverImage.src = this.pendingCoverDataUrl;
      });
      reader.readAsDataURL(file);
    });
    this.overlay.querySelector(".local-mod-import-close").addEventListener("click", () => this.close());
    this.overlay.querySelector(".local-mod-import-back").addEventListener("click", () => this.renderFolderStep());
    this.overlay.querySelector(".local-mod-import-gamebanana").addEventListener(
      "click",
      () => this.openGameBananaImport({
        nameInput,
        engineSelect,
        versionSelect,
        coverImage,
        updateVersions
      })
    );
    this.overlay.querySelector(".local-mod-import-form").addEventListener(
      "submit",
      (event) => this.import(event, { nameInput, engineSelect, versionSelect })
    );
    this.overlay.onclick = (event) => {
      if (event.target === this.overlay) this.close();
    };
  },
  openGameBananaImport({
    nameInput,
    engineSelect,
    versionSelect,
    coverImage,
    updateVersions
  }) {
    const overlay = document.createElement("div");
    overlay.className = "local-mod-gamebanana-overlay";
    overlay.innerHTML = `
      <section class="local-mod-gamebanana-modal" role="dialog" aria-modal="true" aria-labelledby="gamebanana-import-title">
        <header><h2 id="gamebanana-import-title">Import from GameBanana</h2><button type="button" aria-label="Close"><i class="fa-solid fa-xmark"></i></button></header>
        <form><div class="local-mod-gamebanana-body"><input aria-label="GameBanana mod ID or link" required autofocus placeholder="608074 or gamebanana.com/mods/608074"><p class="local-mod-gamebanana-status" role="status"></p></div><footer><button class="local-mod-gamebanana-cancel" type="button">Cancel</button><button type="submit">Import details</button></footer></form>
      </section>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("show"));
    const close = /* @__PURE__ */ __name(() => {
      overlay.classList.remove("show");
      setTimeout(() => overlay.remove(), 180);
    }, "close");
    const status = overlay.querySelector(".local-mod-gamebanana-status");
    overlay.querySelector("header button").addEventListener("click", close);
    overlay.querySelector(".local-mod-gamebanana-cancel").addEventListener("click", close);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) close();
    });
    overlay.querySelector("form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const submit = event.currentTarget.querySelector('[type="submit"]');
      const value = event.currentTarget.querySelector("input").value.trim();
      const parsed = gameBananaApi5.getGameBananaSubmission(value);
      const modId = parsed?.type === "mod" ? parsed.id : Number(value);
      if (!Number.isInteger(modId) || modId <= 0) {
        status.textContent = "Enter a GameBanana mod ID or mod link.";
        return;
      }
      submit.disabled = true;
      status.textContent = "Loading GameBanana details\u2026";
      try {
        const details = await gameBananaApi5.getModDetails(modId, {
          includeRequirements: false
        });
        if (!details?.title)
          throw new Error("That GameBanana mod was not found.");
        nameInput.value = details.title;
        engineSelect.value = details.engineId || "";
        updateVersions();
        versionSelect.value = "";
        this.pendingCoverDataUrl = null;
        this.pendingCoverUrl = details.images?.[0] || null;
        coverImage.src = this.pendingCoverUrl || "assets/icons/launcher-icon.png";
        close();
      } catch (error) {
        status.textContent = error.message || "Could not import GameBanana details.";
        submit.disabled = false;
      }
    });
  },
  async import(event, { nameInput, engineSelect, versionSelect }) {
    event.preventDefault();
    const submit = this.overlay?.querySelector(".local-mod-import-submit");
    if (!submit) return;
    submit.disabled = true;
    this.setStatus("Copying mod files\u2026");
    try {
      await FS12.importLocalMod({
        sourcePath: this.sourcePath,
        name: nameInput.value.trim(),
        engineId: engineSelect.value,
        engineVersion: versionSelect.value,
        coverDataUrl: this.pendingCoverDataUrl,
        coverUrl: this.pendingCoverUrl?.startsWith("http") ? this.pendingCoverUrl : null
      });
      await this.onImported?.();
      this.close();
    } catch (error) {
      this.setStatus(error.message || "Could not import that folder.");
      submit.disabled = false;
    }
  }
};

// app/src/ui/js/mod-manager/index.js
const modManagerTemplates3 = __modManagerTemplates;

// app/src/ui/js/mod-manager/filterSortModal.js
import { setupDropdown as setupDropdown3 } from "../utils/index-utils.js";
import { ENGINE_DETAILS as ENGINE_DETAILS8 } from "../../backend/config/engines.config.js";
var BASE_TYPE_OPTIONS = [
  ["all", "All mods", "fa-layer-group"],
  ["executable", "Executables", "fa-file-code", "assets/icons/exe.png"]
];
function getTypeOptions(engineIds) {
  return [
    ...BASE_TYPE_OPTIONS,
    ...engineIds.map((engineId) => [
      `engine:${engineId}`,
      ENGINE_DETAILS8[engineId]?.name || engineId,
      "fa-microchip",
      ENGINE_DETAILS8[engineId] ? `assets/icons/${ENGINE_DETAILS8[engineId].icon}` : null
    ]),
    ["unassigned", "Unassigned", "fa-circle-question"]
  ];
}
__name(getTypeOptions, "getTypeOptions");
var SORT_OPTIONS = [
  ["added-desc", "Last added", "fa-clock"],
  ["added-asc", "First added", "fa-clock-rotate-left"],
  ["name-asc", "Name: A-Z", "fa-arrow-down-a-z"],
  ["name-desc", "Name: Z-A", "fa-arrow-down-z-a"],
  ["engine-asc", "Engine: A-Z", "fa-microchip"],
  ["engine-desc", "Engine: Z-A", "fa-microchip"]
];
function createIcon(iconClass, iconPath) {
  if (iconPath) {
    return Object.assign(document.createElement("img"), {
      src: iconPath,
      alt: ""
    });
  }
  const icon = document.createElement("i");
  icon.className = `fa-solid ${iconClass || "fa-filter"}`;
  icon.setAttribute("aria-hidden", "true");
  return icon;
}
__name(createIcon, "createIcon");
function createDropdown({ label, options, selected, onSelect }) {
  const dropdown = document.createElement("div");
  dropdown.className = "mod-manager-modal-dropdown";
  const labelElement = document.createElement("span");
  labelElement.className = "mod-manager-modal-dropdown-label";
  labelElement.textContent = label;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "mod-manager-modal-dropdown-trigger";
  trigger.setAttribute("aria-expanded", "false");
  trigger.innerHTML = `<span data-selected-icon></span><span class="mod-manager-dropdown-value"></span><i class="fa-solid fa-chevron-down" aria-hidden="true"></i>`;
  const menu = document.createElement("div");
  menu.className = "mod-manager-modal-dropdown-menu";
  menu.setAttribute("role", "listbox");
  menu.hidden = true;
  const sync = /* @__PURE__ */ __name((value) => {
    const selectedOption = options.find(
      ([optionValue]) => optionValue === value
    );
    trigger.querySelector(".mod-manager-dropdown-value").textContent = selectedOption?.[1] || "";
    trigger.querySelector("[data-selected-icon]").replaceChildren(createIcon(selectedOption?.[2], selectedOption?.[3]));
    menu.querySelectorAll("button").forEach((button) => {
      const isSelected = button.dataset.value === value;
      button.classList.toggle("selected", isSelected);
      button.setAttribute("aria-selected", String(isSelected));
    });
  }, "sync");
  const dropdownCtrl = setupDropdown3(trigger, dropdown, { menuElement: menu });
  options.forEach(([value, optionLabel, iconClass, iconPath]) => {
    const option = document.createElement("button");
    option.type = "button";
    option.dataset.value = value;
    option.setAttribute("role", "option");
    option.append(
      createIcon(iconClass, iconPath),
      document.createElement("span")
    );
    option.querySelector("span").textContent = optionLabel;
    option.addEventListener("click", () => {
      sync(value);
      onSelect(value);
      dropdownCtrl.close();
    });
    menu.append(option);
  });
  sync(selected);
  dropdown.append(labelElement, trigger, menu);
  return { dropdown, sync, destroy: dropdownCtrl.destroy };
}
__name(createDropdown, "createDropdown");
function openFilterSortModal({ filter, sort, engineIds = [], onApply }) {
  document.getElementById("mod-manager-filter-modal")?.remove();
  const overlay = document.createElement("section");
  overlay.id = "mod-manager-filter-modal";
  overlay.className = "mod-manager-filter-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "mod-manager-filter-title");
  const panel = document.createElement("form");
  panel.className = "mod-manager-filter-panel";
  panel.innerHTML = `
    <div class="mod-manager-filter-heading">
      <h3 id="mod-manager-filter-title">Filter and sort</h3>
      <button type="button" class="mod-manager-filter-dismiss" aria-label="Close filter and sort"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
    </div>
    <div class="mod-manager-filter-dropdowns"></div>
    <div class="mod-manager-filter-footer">
      <button type="button" class="mod-manager-filter-reset">Reset</button>
      <button type="submit" class="mod-manager-filter-apply">Apply</button>
    </div>`;
  let selectedFilter = filter;
  let selectedSort = sort;
  const controls = panel.querySelector(".mod-manager-filter-dropdowns");
  const typeDropdown = createDropdown({
    label: "Type",
    options: getTypeOptions(engineIds),
    selected: filter,
    onSelect: /* @__PURE__ */ __name((value) => selectedFilter = value, "onSelect")
  });
  const sortDropdown = createDropdown({
    label: "Sort by",
    options: SORT_OPTIONS,
    selected: sort,
    onSelect: /* @__PURE__ */ __name((value) => selectedSort = value, "onSelect")
  });
  controls.append(typeDropdown.dropdown, sortDropdown.dropdown);
  const close = /* @__PURE__ */ __name(() => {
    typeDropdown.destroy();
    sortDropdown.destroy();
    overlay.remove();
  }, "close");
  panel.querySelector(".mod-manager-filter-dismiss").addEventListener("click", close);
  panel.querySelector(".mod-manager-filter-reset").addEventListener("click", () => {
    selectedFilter = "all";
    selectedSort = "added-desc";
    typeDropdown.sync(selectedFilter);
    sortDropdown.sync(selectedSort);
  });
  panel.addEventListener("submit", (event) => {
    event.preventDefault();
    onApply({ filter: selectedFilter, sort: selectedSort });
    close();
  });
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
  overlay.append(panel);
  document.body.append(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
  panel.querySelector(".mod-manager-filter-dismiss").focus();
}
__name(openFilterSortModal, "openFilterSortModal");

// app/src/ui/js/mod-manager/index.js
var modManagerModal = {
  typeFilter: "all",
  sortMode: "added-desc",
  searchQuery: "",
  activeView: "mods",
  cachedMods: null,
  cachedStandaloneMods: null,
  cachedInstalledEngines: null,
  cachedViews: { mods: null, dependencies: null },
  eventBound: false,
  loadRequestId: 0,
  preloadPromise: null,
  preloaded: false,
  pendingInstalls: /* @__PURE__ */ new Map(),
  async init() {
    if (!document.getElementById("mod-manager-modal")) {
      const wrapper = document.createElement("div");
      wrapper.innerHTML = modManagerTemplates3.mainModal();
      document.body.appendChild(wrapper.firstElementChild);
      document.getElementById("mod-manager-close-btn").addEventListener("click", () => this.close());
      document.getElementById("mod-manager-modal").addEventListener("click", (e) => {
        if (e.target.id === "mod-manager-modal") this.close();
      });
      const toggleBtn = document.getElementById("mod-manager-view-toggle");
      toggleBtn.addEventListener("click", () => {
        const grid = document.getElementById("mod-manager-grid-container");
        if (!grid) return;
        const isListView = grid.classList.toggle("list-view");
        localStorage.setItem(
          this.activeView === "dependencies" ? "weekbox_dependency_view" : "weekbox_mod_manager_view",
          isListView ? "list" : "grid"
        );
        toggleBtn.querySelector("i").className = isListView ? "fa-solid fa-table-cells-large" : "fa-solid fa-list";
      });
      document.getElementById("mod-manager-dependencies-toggle").addEventListener("click", () => {
        this.activeView = this.activeView === "mods" ? "dependencies" : "mods";
        if (!this.showCachedView()) {
          this.render(
            this.cachedMods || [],
            this.cachedStandaloneMods || [],
            this.cachedInstalledEngines || [],
            { preserveOtherView: true }
          );
        }
      });
      document.getElementById("mod-manager-search-input").addEventListener("input", (event) => {
        this.searchQuery = event.target.value.trim().toLocaleLowerCase();
        this.applySearchFilter();
      });
      document.getElementById("mod-manager-filter-toggle").addEventListener("click", () => {
        openFilterSortModal({
          filter: this.typeFilter,
          sort: this.sortMode,
          engineIds: [
            ...new Set(
              (this.cachedMods || []).filter((mod) => mod.kind !== "dependency" && mod.engineId).map((mod) => mod.engineId)
            )
          ],
          onApply: /* @__PURE__ */ __name(({ filter, sort }) => {
            this.typeFilter = filter;
            this.sortMode = sort;
            this.render(
              this.cachedMods || [],
              this.cachedStandaloneMods || []
            );
          }, "onApply")
        });
      });
      if (!this.eventBound) {
        document.addEventListener("mods-updated", () => {
          if (document.getElementById("mod-manager-modal")?.classList.contains("show")) {
            this.loadInstalledMods(true);
          } else {
            this.cachedMods = null;
            this.cachedStandaloneMods = null;
            this.cachedInstalledEngines = null;
            this.cachedViews = { mods: null, dependencies: null };
            this.preloaded = false;
            this.preloadPromise = null;
          }
        });
        document.addEventListener("mod-install-progress", (event) => {
          const install = event.detail;
          if (!install?.modId) return;
          if (install.status === "complete" || install.status === "cancelled") {
            this.pendingInstalls.delete(String(install.modId));
            document.querySelectorAll(".mod-manager-installing-card").forEach((card) => {
              if (card.dataset.modId === String(install.modId)) card.remove();
            });
            return;
          }
          this.pendingInstalls.set(String(install.modId), install);
          this.updatePendingInstallCard(install);
        });
        this.eventBound = true;
      }
    }
  },
  async open() {
    await this.init();
    if (!FS13.isInitialized) await FS13.init();
    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
    this.renderPendingInstallCards();
    if (!this.preloaded) {
      const container = document.getElementById("mod-manager-modal-body");
      if (container && !container.children.length) {
        container.innerHTML = modManagerTemplates3.emptyState(
          '<i class="fa-solid fa-spinner fa-spin" style="margin-right: 8px;"></i> Loading mods...'
        );
      }
      await this.preload();
    } else {
      await this.loadInstalledMods(true);
    }
  },
  async preload() {
    if (this.preloadPromise) return this.preloadPromise;
    this.preloadPromise = (async () => {
      await this.init();
      await this.loadInstalledMods(true);
      this.preloaded = true;
    })().catch((error) => {
      this.preloadPromise = null;
      throw error;
    });
    return this.preloadPromise;
  },
  close() {
    this.loadRequestId += 1;
    modSettingsModal.close();
    const modal = document.getElementById("mod-manager-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  },
  async loadInstalledMods(force = false) {
    const requestId = ++this.loadRequestId;
    try {
      let mods = this.cachedMods;
      let standaloneMods = this.cachedStandaloneMods;
      let installedEngines = this.cachedInstalledEngines;
      if (force || !this.cachedMods || !this.cachedInstalledEngines) {
        [mods, standaloneMods, installedEngines] = await Promise.all([
          FS13.getInstalledMods(),
          FS13.getStandaloneMods(),
          FS13.getInstalledEngines()
        ]);
      }
      if (requestId !== this.loadRequestId) return;
      this.cachedMods = mods;
      this.cachedStandaloneMods = standaloneMods;
      this.cachedInstalledEngines = installedEngines;
      await this.render(mods, standaloneMods, installedEngines);
    } catch (error) {
      if (requestId !== this.loadRequestId) return;
      console.error("Error loading mods in Mod Manager:", error);
      const container = document.getElementById("mod-manager-modal-body");
      if (container) {
        container.innerHTML = modManagerTemplates3.emptyState(
          '<i class="fa-solid fa-triangle-exclamation"></i> Error loading your mods.'
        );
      }
    }
  },
  syncActiveView() {
    const isModsView = this.activeView === "mods";
    const dependenciesToggle = document.getElementById(
      "mod-manager-dependencies-toggle"
    );
    if (dependenciesToggle) {
      dependenciesToggle.setAttribute("aria-pressed", String(!isModsView));
      const currentLabel = isModsView ? "Mods" : "Dependencies";
      const nextLabel = isModsView ? "Dependencies" : "Mods";
      const label = dependenciesToggle.querySelector("span");
      label.textContent = currentLabel;
      label.dataset.hoverLabel = nextLabel;
      dependenciesToggle.setAttribute("aria-label", `Show ${nextLabel}`);
    }
    document.querySelector(".mod-manager-header-actions")?.classList.toggle("dependencies-view", !isModsView);
    document.querySelector(".mod-manager-search")?.classList.toggle("is-hidden", !isModsView);
  },
  syncViewToggleIcon() {
    const grid = document.getElementById("mod-manager-grid-container");
    const toggleIcon = document.querySelector("#mod-manager-view-toggle i");
    if (!grid || !toggleIcon) return;
    toggleIcon.className = grid.classList.contains("list-view") ? "fa-solid fa-table-cells-large" : "fa-solid fa-list";
  },
  showCachedView() {
    const view = this.cachedViews[this.activeView];
    const container = document.getElementById("mod-manager-modal-body");
    if (!view || !container) return false;
    container.replaceChildren(view);
    this.syncActiveView();
    this.syncViewToggleIcon();
    this.applySearchFilter();
    this.renderPendingInstallCards();
    return true;
  },
  applySearchFilter() {
    const grid = document.getElementById("mod-manager-grid-container");
    if (!grid || this.activeView !== "mods") return;
    grid.querySelectorAll(".mod-manager-card").forEach((card) => {
      if (card.classList.contains("mod-manager-installing-card")) return;
      card.classList.toggle(
        "is-search-hidden",
        Boolean(this.searchQuery) && !card.dataset.modSearch.includes(this.searchQuery)
      );
    });
  },
  updatePendingInstallCard(install) {
    const modal = document.getElementById("mod-manager-modal");
    const grid = document.getElementById("mod-manager-grid-container");
    if (!modal?.classList.contains("show") || !grid || this.activeView !== "mods") {
      return;
    }
    let card = Array.from(
      grid.querySelectorAll(".mod-manager-installing-card")
    ).find((item) => item.dataset.modId === String(install.modId));
    if (!card) {
      card = document.createElement("article");
      card.className = "mod-manager-card mod-manager-installing-card";
      card.dataset.modId = install.modId;
      card.setAttribute("aria-live", "polite");
      card.innerHTML = `
        <div class="mod-manager-cover-wrap">
          <div class="mod-manager-installing-cover">
            <img class="mod-manager-installing-image" alt="" hidden>
            <div class="mod-manager-installing-overlay"><i class="fa-solid fa-download" aria-hidden="true"></i></div>
          </div>
        </div>
        <div class="mod-manager-card-body mod-info">
          <div class="mod-manager-info">
            <h3 class="mod-title"></h3>
            <p class="mod-manager-installing-status"></p>
          </div>
        </div>`;
      const addLocalCard = grid.querySelector(".mod-manager-add-local-card");
      grid.insertBefore(card, addLocalCard || null);
    }
    card.querySelector(".mod-title").textContent = install.modName;
    card.querySelector(".mod-manager-installing-status").textContent = `${install.status} ${Math.round(install.progress || 0)}%`;
    const image = card.querySelector(".mod-manager-installing-image");
    if (install.coverUrl && card.dataset.coverUrl !== install.coverUrl) {
      card.dataset.coverUrl = install.coverUrl;
      const preload = new Image();
      preload.addEventListener("load", () => {
        if (!card.isConnected) return;
        image.src = install.coverUrl;
        image.hidden = false;
        requestAnimationFrame(() => card.classList.add("has-install-cover"));
      });
      preload.src = install.coverUrl;
    }
  },
  renderPendingInstallCards() {
    this.pendingInstalls.forEach(
      (install) => this.updatePendingInstallCard(install)
    );
  },
  async render(mods, standaloneMods, installedEngines = this.cachedInstalledEngines || [], { preserveOtherView = false } = {}) {
    const container = document.getElementById("mod-manager-modal-body");
    if (!container) return;
    const savedScrollTop = container.scrollTop;
    const dependencies = mods.filter((mod) => mod.kind === "dependency");
    const playableMods = mods.filter((mod) => mod.kind !== "dependency");
    this.syncActiveView();
    const standaloneModIds = new Set(standaloneMods.map((m) => String(m.id)));
    const modOrder = new Map(
      playableMods.map((mod, index) => [String(mod.id), index])
    );
    const filteredMods = playableMods.filter((mod) => {
      const isExecutable = standaloneModIds.has(String(mod.id));
      if (this.typeFilter.startsWith("engine:") && mod.engineId !== this.typeFilter.slice("engine:".length))
        return false;
      if (this.typeFilter === "executable" && !isExecutable) return false;
      if (this.typeFilter === "unassigned" && (mod.engineId || isExecutable))
        return false;
      return true;
    }).sort((left, right) => {
      if (this.sortMode === "name-asc")
        return String(left.name || "").localeCompare(
          String(right.name || "")
        );
      if (this.sortMode === "name-desc")
        return String(right.name || "").localeCompare(
          String(left.name || "")
        );
      if (this.sortMode === "engine-asc")
        return String(left.engineId || "").localeCompare(
          String(right.engineId || "")
        );
      if (this.sortMode === "engine-desc")
        return String(right.engineId || "").localeCompare(
          String(left.engineId || "")
        );
      const difference = modOrder.get(String(left.id)) - modOrder.get(String(right.id));
      return this.sortMode === "added-asc" ? difference : -difference;
    });
    if (!preserveOtherView) {
      this.cachedViews = { mods: null, dependencies: null };
    }
    container.innerHTML = "";
    if (this.activeView === "dependencies") {
      if (dependencies.length) {
        const isListView2 = localStorage.getItem("weekbox_dependency_view") !== "grid";
        const toggleIcon2 = document.querySelector("#mod-manager-view-toggle i");
        if (toggleIcon2)
          toggleIcon2.className = isListView2 ? "fa-solid fa-table-cells-large" : "fa-solid fa-list";
        await dependenciesRenderer.render(
          container,
          dependencies,
          mods,
          installedEngines,
          isListView2,
          (deletedId) => {
            this.cachedMods = this.cachedMods.filter((m) => m.id !== deletedId);
            this.cachedStandaloneMods = this.cachedStandaloneMods.filter(
              (m) => m.id !== deletedId
            );
            this.render(this.cachedMods, this.cachedStandaloneMods);
            document.dispatchEvent(new CustomEvent("mods-updated"));
          },
          () => this.loadInstalledMods(true)
        );
        this.cachedViews.dependencies = container.firstElementChild;
      } else {
        container.innerHTML = modManagerTemplates3.emptyState(
          "No dependencies installed yet."
        );
        this.cachedViews.dependencies = container.firstElementChild;
      }
      container.scrollTop = savedScrollTop;
      return;
    }
    const gridContainer = document.createElement("div");
    gridContainer.id = "mod-manager-grid-container";
    gridContainer.className = "mod-manager-grid";
    const isListView = localStorage.getItem("weekbox_mod_manager_view") === "list";
    if (isListView) gridContainer.classList.add("list-view");
    const toggleIcon = document.querySelector("#mod-manager-view-toggle i");
    if (toggleIcon)
      toggleIcon.className = isListView ? "fa-solid fa-table-cells-large" : "fa-solid fa-list";
    container.appendChild(gridContainer);
    try {
      await cardRenderer.renderCards(
        gridContainer,
        filteredMods,
        mods,
        standaloneMods,
        installedEngines,
        (deletedId) => {
          this.cachedMods = this.cachedMods.filter((m) => m.id !== deletedId);
          this.cachedStandaloneMods = this.cachedStandaloneMods.filter(
            (m) => m.id !== deletedId
          );
        },
        () => {
          this.loadInstalledMods(true);
        }
      );
      this.applySearchFilter();
      this.renderPendingInstallCards();
      const addLocalCard = document.createElement("div");
      addLocalCard.innerHTML = modManagerTemplates3.addLocalModCard();
      const addLocalButton = addLocalCard.firstElementChild;
      addLocalButton.addEventListener("click", async () => {
        if (addLocalButton.disabled) return;
        addLocalButton.disabled = true;
        try {
          await localModImportModal.open({
            onImported: /* @__PURE__ */ __name(() => this.loadInstalledMods(true), "onImported")
          });
        } finally {
          addLocalButton.disabled = false;
        }
      });
      gridContainer.appendChild(addLocalButton);
      this.cachedViews.mods = gridContainer;
      container.scrollTop = savedScrollTop;
      requestAnimationFrame(() => {
        container.scrollTop = savedScrollTop;
      });
    } catch (err) {
      console.error(err);
      container.innerHTML = modManagerTemplates3.emptyState(
        '<i class="fa-solid fa-triangle-exclamation"></i> Error rendering cards.'
      );
    }
  }
};

// app/src/ui/js/sidebar.js
import { FS as FS14 } from "../utils/index-utils.js";
import { networkStatus as networkStatus5 } from "../../backend/core/index-core.js";
var sidebar = {
  updateEngineMarquee(button) {
    const container = button.querySelector(".marquee-container");
    const label = button.querySelector(".marquee-text");
    if (!container || !label) return;
    requestAnimationFrame(() => {
      const distance = Math.max(0, label.scrollWidth - container.clientWidth);
      label.classList.toggle("is-overflowing", distance > 1);
      label.style.setProperty("--marquee-distance", `${distance}px`);
      label.title = distance > 1 ? label.textContent : "";
    });
  },
  refreshEngineMarquees() {
    document.querySelectorAll(".engine-btn").forEach((button) => this.updateEngineMarquee(button));
  },
  async init() {
    this.sidebar = document.getElementById("sidebar");
    this.resizer = document.getElementById("sidebar-resizer");
    this.tabButtons = document.querySelectorAll(".nav-btn[data-tab]");
    this.modManagerBtn = document.getElementById("mod-manager-btn");
    this.engineManagerBtn = document.getElementById("engine-manager-btn");
    this.configBtn = document.getElementById("config-btn");
    this.brandBtn = document.getElementById("sidebar-brand-btn");
    this.isResizing = false;
    if (!this.sidebar) return;
    this.setupResizer();
    this.setupNavigation();
    this.setupBrandButton();
    this.networkStatusListener = () => {
      void this.refreshNetworkFeatures();
    };
    networkStatus5.addEventListener("change", this.networkStatusListener);
    await this.refreshNetworkFeatures();
  },
  setupResizer() {
    if (!this.resizer) return;
    this.resizer.addEventListener("mousedown", () => {
      this.isResizing = true;
      document.body.style.cursor = "ew-resize";
      this.resizer.classList.add("resizing");
    });
    document.addEventListener("mousemove", (e) => {
      if (!this.isResizing) return;
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 500) newWidth = 500;
      this.sidebar.style.width = `${newWidth}px`;
      this.refreshEngineMarquees();
    });
    document.addEventListener("mouseup", () => {
      if (this.isResizing) {
        this.isResizing = false;
        document.body.style.cursor = "default";
        this.resizer.classList.remove("resizing");
      }
    });
  },
  setupNavigation() {
    this.tabButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        this.tabButtons.forEach((b) => b.classList.remove("active"));
        if (this.modManagerBtn) this.modManagerBtn.classList.remove("active");
        if (this.engineManagerBtn)
          this.engineManagerBtn.classList.remove("active");
        if (this.configBtn) this.configBtn.classList.remove("active");
        const engineBtns = document.querySelectorAll(".engine-btn");
        engineBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const viewToLoad = btn.getAttribute("data-tab");
        router.navigate(viewToLoad);
      });
    });
    if (this.modManagerBtn) {
      this.modManagerBtn.addEventListener("click", () => {
        modManagerModal.open();
      });
    }
    if (this.engineManagerBtn) {
      this.engineManagerBtn.addEventListener("click", () => {
        engineManagerModal.open();
      });
    }
    if (this.configBtn) {
      this.configBtn.addEventListener("click", () => {
        configModal.open();
      });
    }
  },
  setupBrandButton() {
    if (!this.brandBtn) return;
    const brandIcon = this.brandBtn.querySelector(".sidebar-brand-icon");
    if (!brandIcon) return;
    this.brandBtn.addEventListener("click", () => {
      brandIcon.animate(
        [{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }],
        {
          duration: 420,
          easing: "linear",
          composite: "add",
          fill: "forwards"
        }
      );
    });
  },
  async refreshNetworkFeatures() {
    const enginesContainer = document.getElementById("engines-container");
    enginesContainer?.classList.toggle("is-offline", !networkStatus5.online);
    enginesContainer?.setAttribute(
      "aria-disabled",
      String(!networkStatus5.online)
    );
    const networkIndicator = document.getElementById("sidebar-network-status");
    networkIndicator?.classList.toggle("is-online", networkStatus5.online);
    networkIndicator?.classList.toggle("is-offline", !networkStatus5.online);
    networkIndicator?.setAttribute(
      "aria-label",
      networkStatus5.online ? "Online" : "Offline"
    );
    networkIndicator?.setAttribute(
      "title",
      networkStatus5.online ? "Online" : "Offline"
    );
    await this.loadEngines();
    if (networkStatus5.online) engineUpdateService.startScheduledChecks();
    if (!networkStatus5.online && router.currentViewId === "engines") {
      await router.navigate("home");
    }
  },
  openEngine(engineId) {
    const button = document.querySelector(
      `.engine-btn[data-engine-id="${engineId}"]`
    );
    if (!button) return false;
    button.click();
    return true;
  },
  extractVersionFromUrl(url) {
    if (!url) return "Unknown";
    const githubMatch = url.match(/\/download\/(v?([^\/]+))\//);
    if (githubMatch && githubMatch[2]) return githubMatch[2];
    const genericMatch = url.match(/(?:v|-)?(\d+\.\d+(?:\.\d+)?)/i);
    if (genericMatch && genericMatch[1]) return genericMatch[1];
    return "Unknown";
  },
  async loadEngines() {
    const wrapper = document.getElementById("engines-wrapper");
    if (!wrapper) return;
    try {
      const response = await fetch("src/backend/data/engines-router.json");
      if (!response.ok) throw new Error("Failed to load engines-router.json");
      const enginesRouter = await response.json();
      wrapper.innerHTML = "";
      for (const engineDef of enginesRouter) {
        const displayName = engineDef.name;
        const iconSrc = engineDef.icon ? `assets/icons/${engineDef.icon}` : "";
        const btn = document.createElement("button");
        btn.className = "nav-btn engine-btn";
        btn.dataset.engineId = engineDef.versions;
        btn.disabled = !networkStatus5.online;
        btn.title = networkStatus5.online ? "" : "Connect to the internet to browse engine releases";
        btn.innerHTML = `
          <img src="${iconSrc}" class="engine-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>'">
          <div class="marquee-container"><span class="marquee-text">${displayName}</span></div>
        `;
        btn.addEventListener("click", async () => {
          this.tabButtons.forEach((b) => b.classList.remove("active"));
          if (this.modManagerBtn) this.modManagerBtn.classList.remove("active");
          if (this.engineManagerBtn)
            this.engineManagerBtn.classList.remove("active");
          if (this.configBtn) this.configBtn.classList.remove("active");
          const engineBtns = document.querySelectorAll(".engine-btn");
          engineBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          try {
            const originalText = btn.querySelector("span").textContent;
            btn.querySelector("span").innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:4px;"></i> Loading...`;
            const releaseVersions = await getEngineReleaseVersions(
              engineDef.versions
            );
            if (releaseVersions.length === 0)
              throw new Error("No compatible releases available");
            const processedVersionsData = releaseVersions.map((item) => {
              const sampleLink = item.win || item.win64 || item.win32 || item.lin || item.mac || item.mac64 || item.macarm || "";
              return {
                ...item,
                version: item.version || this.extractVersionFromUrl(sampleLink)
              };
            });
            processedVersionsData.sort((a, b) => {
              if (a.isNightly) return -1;
              if (b.isNightly) return 1;
              return b.version.localeCompare(a.version, void 0, {
                numeric: true,
                sensitivity: "base"
              });
            });
            btn.querySelector("span").textContent = originalText;
            setSelectedEngine({
              id: engineDef.versions,
              meta: { name: engineDef.name, icon: engineDef.icon },
              versions: processedVersionsData
            });
            router.navigate("engines");
          } catch (err) {
            console.error(err);
            btn.querySelector("span").textContent = displayName;
            alert(`Could not load version information for ${displayName}`);
          }
        });
        wrapper.appendChild(btn);
        this.updateEngineMarquee(btn);
      }
    } catch (error) {
      console.error(error);
      wrapper.innerHTML = `<p style="color:red; padding:8px; font-size:12px;">Failed to load engine router</p>`;
    }
  },
  async loadStandaloneMods() {
    if (!FS14.isInitialized) await FS14.init();
    const existingContainer = document.getElementById(
      "standalone-mods-container"
    );
    if (existingContainer) existingContainer.remove();
    const existingWrapper = document.getElementById("standalone-mods-wrapper");
    const existingDivider = document.getElementById("standalone-mods-divider");
    const existingTitle = document.getElementById("standalone-mods-title");
    if (existingWrapper) existingWrapper.remove();
    if (existingDivider) existingDivider.remove();
    if (existingTitle) existingTitle.remove();
    const allStandaloneMods = await FS14.getStandaloneMods();
    const standaloneMods = allStandaloneMods.filter((mod) => !mod.hidden);
    if (standaloneMods.length === 0) return;
    const sidebarNav = document.querySelector(".sidebar-nav");
    if (!sidebarNav) return;
    const container = document.createElement("div");
    container.className = "engines-list";
    container.id = "standalone-mods-container";
    const divider = document.createElement("div");
    divider.className = "nav-divider";
    container.appendChild(divider);
    const sectionTitle = document.createElement("p");
    sectionTitle.className = "section-title";
    sectionTitle.textContent = "Standalone Mods";
    container.appendChild(sectionTitle);
    const wrapper = document.createElement("div");
    wrapper.className = "engines-wrapper";
    wrapper.id = "standalone-mods-wrapper";
    container.appendChild(wrapper);
    sidebarNav.appendChild(container);
    for (const mod of standaloneMods) {
      const btn = document.createElement("button");
      btn.className = "nav-btn engine-btn standalone-btn";
      const iconSrc = mod.icoPath || "data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>";
      btn.innerHTML = `
        <img src="${iconSrc}" class="engine-icon" onerror="this.onerror=null; this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 512 512\\'><path fill=\\'%23888\\' d=\\'M448 32H64C28.65 32 0 60.65 0 96v320c0 35.35 28.65 64 64 64h384c35.35 0 64-28.65 64-64V96C512 60.65 483.3 32 448 32zM212.7 222.7L132.7 302.7C126.4 308.9 118.2 312 110.1 312s-16.38-3.125-22.62-9.375c-12.5-12.5-12.5-32.75 0-45.25L155.3 189.3l-67.88-67.88c-12.5-12.5-12.5-32.75 0-45.25s32.75-12.5 45.25 0l102.6 102.6C247.7 191.3 247.7 210.2 212.7 222.7zM384 320c-17.67 0-32-14.33-32-32s14.33-32 32-32h32c17.67 0 32 14.33 32 32s-14.33 32-32 32H384z\\'/></svg>'">
        <div class="marquee-container"><span class="marquee-text">${mod.name}</span></div>
      `;
      btn.addEventListener("click", async () => {
        if (btn.classList.contains("running")) {
          const process = FS14.activeEngineProcesses.get(`standalone:${mod.id}`);
          if (process) {
            btn.querySelector(".marquee-container").innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="margin-right:4px;"></i> Closing...`;
            Neutralino.os.updateSpawnedProcess(process.id, "exit").catch(() => {
            });
          }
          return;
        }
        this.tabButtons.forEach((b) => b.classList.remove("active"));
        if (this.modManagerBtn) this.modManagerBtn.classList.remove("active");
        if (this.engineManagerBtn)
          this.engineManagerBtn.classList.remove("active");
        if (this.configBtn) this.configBtn.classList.remove("active");
        const engineBtns = document.querySelectorAll(".engine-btn");
        engineBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const originalText = btn.querySelector(".marquee-text").textContent;
        btn.querySelector(".marquee-container").innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <i class="fa-solid fa-stop" style="color: #ff4a4a;" title="Stop"></i>
            <span>Launched</span>
          </div>
        `;
        btn.classList.add("running");
        await FS14.runStandaloneMod(mod.id, () => {
          btn.querySelector(".marquee-container").innerHTML = `<span class="marquee-text">${originalText}</span>`;
          this.updateEngineMarquee(btn);
          btn.classList.remove("running");
          btn.classList.remove("active");
        });
      });
      wrapper.appendChild(btn);
      this.updateEngineMarquee(btn);
    }
  }
};

// app/src/ui/js/home/modal/carousel.js
var modModalCarousel = {
  slideInterval: null,
  images: [],
  currentIndex: 0,
  slideDuration: 5e3,
  setup(imagesArray) {
    this.images = imagesArray;
    this.currentIndex = 0;
    const thumbsContainer = document.getElementById("modal-thumbnails");
    thumbsContainer.innerHTML = "";
    this.images.forEach((imgSrc, index) => {
      const thumb = document.createElement("div");
      thumb.className = `thumbnail-wrapper ${index === 0 ? "active" : ""}`;
      thumb.onclick = () => this.goToSlide(index);
      thumb.innerHTML = `<img src="${imgSrc}">`;
      thumbsContainer.appendChild(thumb);
    });
    this.updateMainImage();
  },
  goToSlide(index) {
    this.currentIndex = index;
    this.updateMainImage();
  },
  updateMainImage() {
    const mainImg = document.getElementById("modal-main-image");
    mainImg.classList.remove("fade-anim");
    void mainImg.offsetWidth;
    mainImg.classList.add("fade-anim");
    mainImg.src = this.images[this.currentIndex];
    const thumbsContainer = document.getElementById("modal-thumbnails");
    const thumbs = thumbsContainer.querySelectorAll(".thumbnail-wrapper");
    thumbs.forEach((t) => t.classList.remove("active"));
    const activeThumb = thumbs[this.currentIndex];
    if (activeThumb) {
      activeThumb.classList.add("active");
      activeThumb.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center"
      });
    }
    const progressBar = document.getElementById("modal-progress-bar");
    if (progressBar) {
      progressBar.style.transition = "none";
      progressBar.style.width = "0%";
      void progressBar.offsetWidth;
      progressBar.style.transition = `width ${this.slideDuration}ms linear`;
      progressBar.style.width = "100%";
    }
    this.startAutoPlay();
  },
  startAutoPlay() {
    this.stopAutoPlay();
    if (this.images.length <= 1) return;
    this.slideInterval = setTimeout(() => {
      let nextIndex = (this.currentIndex + 1) % this.images.length;
      this.goToSlide(nextIndex);
    }, this.slideDuration);
  },
  stopAutoPlay() {
    if (this.slideInterval) {
      clearTimeout(this.slideInterval);
    }
  }
};

// app/src/ui/js/home/modal/dependencyReviewModal.js
function ensureModal2() {
  let overlay = document.getElementById("dependency-review-modal");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "dependency-review-modal";
  overlay.className = "dependency-review-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="dependency-review-modal" role="dialog" aria-modal="true" aria-labelledby="dependency-review-title">
      <div class="dependency-review-heading">
        <i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i>
        <div><h2 id="dependency-review-title">Install dependencies</h2></div>
      </div>
      <div class="dependency-review-list"></div>
      <div class="dependency-review-actions">
        <button type="button" class="dependency-review-cancel">Cancel</button>
        <button type="button" class="dependency-review-confirm">Install selected</button>
      </div>
    </section>`;
  document.body.appendChild(overlay);
  return overlay;
}
__name(ensureModal2, "ensureModal");
var dependencyReviewModal = {
  review(requirements) {
    const overlay = ensureModal2();
    const list = overlay.querySelector(".dependency-review-list");
    list.replaceChildren(
      ...requirements.map((requirement) => {
        const row = document.createElement("label");
        row.className = "dependency-review-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.value = requirement.dependencyId;
        const copy = document.createElement("span");
        copy.className = "dependency-review-copy";
        const name = document.createElement("strong");
        name.textContent = requirement.title;
        const meta = document.createElement("small");
        meta.textContent = requirement.fileSizeStr || "";
        copy.append(name);
        if (requirement.fileSizeStr) copy.append(meta);
        const open = document.createElement("button");
        open.type = "button";
        open.className = "dependency-review-open";
        open.title = "Open on GameBanana";
        open.setAttribute(
          "aria-label",
          `Open ${requirement.title} on GameBanana`
        );
        open.innerHTML = '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>';
        open.addEventListener("click", (event) => {
          event.preventDefault();
          Neutralino.os.open(requirement.gameBananaUrl).catch(() => {
          });
        });
        row.append(checkbox, copy, open);
        return row;
      })
    );
    return new Promise((resolve) => {
      const confirm = overlay.querySelector(".dependency-review-confirm");
      const cancel = overlay.querySelector(".dependency-review-cancel");
      const finish = /* @__PURE__ */ __name((result) => {
        overlay.classList.remove("show");
        document.removeEventListener("keydown", onKeydown);
        setTimeout(() => overlay.hidden = true, 180);
        resolve(result);
      }, "finish");
      const onKeydown = /* @__PURE__ */ __name((event) => {
        if (event.key === "Escape") finish(null);
      }, "onKeydown");
      cancel.onclick = () => finish(null);
      confirm.onclick = () => {
        const selected = new Set(
          [...list.querySelectorAll("input:checked")].map(
            (input) => input.value
          )
        );
        finish(requirements.filter((item) => selected.has(item.dependencyId)));
      };
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("show"));
      document.addEventListener("keydown", onKeydown);
      confirm.focus();
    });
  }
};

// app/src/ui/js/home/modal/downloadChoiceModal.js
function ensureModal3() {
  let overlay = document.getElementById("download-choice-modal");
  if (overlay) return overlay;
  overlay = document.createElement("div");
  overlay.id = "download-choice-modal";
  overlay.className = "dependency-review-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="dependency-review-modal" role="dialog" aria-modal="true" aria-labelledby="download-choice-title">
      <div class="dependency-review-heading">
        <i class="fa-solid fa-download" aria-hidden="true"></i>
        <div><h2 id="download-choice-title">Choose a download</h2></div>
      </div>
      <div class="dependency-review-list download-choice-list"></div>
      <div class="dependency-review-actions">
        <button type="button" class="dependency-review-cancel">Cancel</button>
        <button type="button" class="dependency-review-confirm">Continue</button>
      </div>
    </section>`;
  document.body.appendChild(overlay);
  return overlay;
}
__name(ensureModal3, "ensureModal");
var downloadChoiceModal = {
  choose(options) {
    if (options.length === 1) return Promise.resolve(options[0]);
    const overlay = ensureModal3();
    const list = overlay.querySelector(".download-choice-list");
    const selectedId = options[0]?.id;
    list.replaceChildren(
      ...options.map((option, index) => {
        const row = document.createElement("label");
        row.className = "dependency-review-item";
        const input = document.createElement("input");
        input.type = "radio";
        input.name = "download-choice";
        input.value = option.id;
        input.checked = index === 0;
        const copy = document.createElement("span");
        copy.className = "dependency-review-copy";
        const name = document.createElement("strong");
        name.textContent = option.name;
        const meta = document.createElement("small");
        const fileDetails = option.type === "external" ? option.fileSizeStr || "Alternate file source" : option.fileSizeStr;
        meta.textContent = [
          fileDetails,
          option.uploadedAtLabel
        ].filter(Boolean).join(" \u2022 ");
        copy.append(name, meta);
        const icon = document.createElement("i");
        icon.className = option.type === "external" ? "fa-solid fa-cloud-arrow-down download-choice-icon" : "fa-solid fa-file-zipper download-choice-icon";
        icon.setAttribute("aria-hidden", "true");
        row.append(input, copy, icon);
        return row;
      })
    );
    return new Promise((resolve) => {
      const confirm = overlay.querySelector(".dependency-review-confirm");
      const cancel = overlay.querySelector(".dependency-review-cancel");
      const finish = /* @__PURE__ */ __name((result) => {
        overlay.classList.remove("show");
        document.removeEventListener("keydown", onKeydown);
        setTimeout(() => overlay.hidden = true, 180);
        resolve(result);
      }, "finish");
      const onKeydown = /* @__PURE__ */ __name((event) => {
        if (event.key === "Escape") finish(null);
      }, "onKeydown");
      cancel.onclick = () => finish(null);
      confirm.onclick = () => {
        const id = list.querySelector("input:checked")?.value || selectedId;
        finish(options.find((option) => option.id === id) || null);
      };
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("show"));
      document.addEventListener("keydown", onKeydown);
      confirm.focus();
    });
  }
};

// app/src/ui/js/home/modal/index.js
import { FS as FS15 } from "../utils/index-utils.js";

// app/src/ui/js/home/modal/modalUi.js
import { ENGINE_DETAILS as ENGINE_DETAILS9 } from "../../backend/config/engines.config.js";
async function ensureModal4(onClose) {
  if (!document.getElementById("mod-modal")) {
    const tpl = document.getElementById("tpl-modal");
    if (!tpl) throw new Error("Could not load mod modal");
    const wrapper = document.createElement("div");
    wrapper.innerHTML = tpl.innerHTML;
    document.body.appendChild(wrapper.firstElementChild);
  }
  const modal = document.getElementById("mod-modal");
  const closeBtn = document.getElementById("modal-close-btn");
  closeBtn.onclick = onClose;
  modal.onclick = (event) => {
    if (event.target === modal) onClose();
  };
}
__name(ensureModal4, "ensureModal");
function showModal() {
  const modal = document.getElementById("mod-modal");
  modal.style.display = "flex";
  requestAnimationFrame(() => modal.classList.add("show"));
}
__name(showModal, "showModal");
function hideModal() {
  const modal = document.getElementById("mod-modal");
  if (!modal) return;
  modal.classList.remove("show");
  setTimeout(() => {
    modal.style.display = "none";
  }, 300);
}
__name(hideModal, "hideModal");
function resetModal() {
  ["modal-title", "modal-author", "modal-description"].forEach((id) => {
    document.getElementById(id).textContent = "";
  });
  ["modal-time", "modal-likes", "modal-views", "modal-filesize"].forEach(
    (id) => {
      document.getElementById(id).textContent = "--";
    }
  );
  document.getElementById("modal-main-image").src = "";
  document.getElementById("modal-main-image").classList.remove("fade-anim");
  const gameBananaLink = document.getElementById("modal-gamebanana-link");
  gameBananaLink.removeAttribute("href");
  gameBananaLink.onclick = (event) => event.preventDefault();
  gameBananaLink.hidden = true;
  gameBananaLink.querySelector("img").src = "https://images.gamebanana.com/static/img/banana.png";
  gameBananaLink.setAttribute("aria-label", "Open this mod on GameBanana");
  gameBananaLink.title = "Open this mod on GameBanana";
  document.getElementById("modal-author").hidden = false;
  document.getElementById("modal-views-icon").className = "fa-solid fa-eye";
  document.getElementById("modal-thumbnails").replaceChildren();
  const progressBar = document.getElementById("modal-progress-bar");
  if (progressBar) {
    progressBar.style.transition = "none";
    progressBar.style.width = "0%";
  }
  const button = document.getElementById("modal-download-btn");
  button.disabled = true;
  button.innerHTML = '<i class="fa-solid fa-download"></i> Download';
  button.onclick = null;
  document.getElementById("modal-engine-badge").hidden = true;
  document.getElementById("modal-engine-name").textContent = "";
}
__name(resetModal, "resetModal");
function showModData(data, isInstalled, onDownload) {
  document.getElementById("modal-title").textContent = data.title;
  const author = document.getElementById("modal-author");
  author.textContent = data.author ? `by ${data.author}` : "";
  author.hidden = Boolean(data.hideAuthor);
  document.getElementById("modal-time").textContent = data.timeAgo;
  document.getElementById("modal-likes").textContent = data.likes.toLocaleString();
  document.getElementById("modal-views").textContent = (data.downloads ?? data.views).toLocaleString();
  document.getElementById("modal-views-icon").className = data.source === "peo" ? "fa-solid fa-download" : "fa-solid fa-eye";
  const description = document.getElementById("modal-description");
  const content = document.createElement("template");
  content.innerHTML = data.description;
  content.content.querySelectorAll(
    "img, picture, video, audio, iframe, embed, object, source"
  ).forEach((element) => element.remove());
  description.replaceChildren(content.content);
  document.getElementById("modal-image-loader").style.display = "none";
  const gameBananaLink = document.getElementById("modal-gamebanana-link");
  const sourceUrl = data.source === "peo" ? data.sourceUrl : data.gameBananaUrl;
  if (sourceUrl) gameBananaLink.href = sourceUrl;
  else gameBananaLink.removeAttribute("href");
  gameBananaLink.hidden = !sourceUrl;
  if (data.source === "peo") {
    gameBananaLink.querySelector("img").src = "assets/icons/psychonline.png";
    gameBananaLink.setAttribute("aria-label", "Open Psych Online mods");
    gameBananaLink.title = "Open Psych Online mods";
  }
  gameBananaLink.onclick = (event) => {
    event.preventDefault();
    if (sourceUrl) Neutralino.os.open(sourceUrl).catch(() => {
    });
  };
  const engine = ENGINE_DETAILS9[data.engineId];
  const engineBadge = document.getElementById("modal-engine-badge");
  const engineIcon = document.getElementById("modal-engine-icon");
  const engineName = document.getElementById("modal-engine-name");
  if (engine) {
    engineIcon.src = `assets/icons/${engine.icon}`;
    engineIcon.alt = "";
    engineName.textContent = engine.name;
    engineBadge.hidden = false;
  } else {
    engineBadge.hidden = true;
  }
  updateDownloadStatus(data, isInstalled, onDownload);
}
__name(showModData, "showModData");
function updateDownloadStatus(data, isInstalled, onDownload) {
  document.getElementById("modal-filesize").textContent = data.fileSizeStr;
  const button = document.getElementById("modal-download-btn");
  if (isInstalled) {
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-check"></i> Already Installed';
  } else if (data.loadingDownloads) {
    button.disabled = true;
    button.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking downloads\u2026';
  } else if (data.downloadOptions?.length) {
    button.disabled = false;
    button.innerHTML = data.downloadOptions.length > 1 ? '<i class="fa-solid fa-list"></i> Choose Download' : `<i class="fa-solid fa-download"></i> ${data.downloadButtonLabel || "Download"}`;
    button.onclick = onDownload;
  }
}
__name(updateDownloadStatus, "updateDownloadStatus");

// app/src/ui/js/home/modal/index.js
var modModal = {
  async init() {
    try {
      await ensureModal4(() => this.close());
    } catch (error) {
    }
  },
  async open(modId) {
    const engineId = gameBananaApi6.getEngineIdForSubmission("mods", modId);
    if (engineId) {
      sidebar.openEngine(engineId);
      return;
    }
    if (!document.getElementById("mod-modal")) {
      await this.init();
    }
    if (!document.getElementById("mod-modal")) return;
    showModal();
    resetModal();
    document.getElementById("modal-title").textContent = "Loading info...";
    document.getElementById("modal-image-loader").style.display = "block";
    let isInstalled = false;
    let hasRenderedProfile = false;
    const showProgress = /* @__PURE__ */ __name(async (data2) => {
      if (!hasRenderedProfile) {
        isInstalled = await FS15.isModInstalled(data2.id);
        await this.populateData(data2, isInstalled);
        hasRenderedProfile = true;
        return;
      }
      updateDownloadStatus(
        data2,
        isInstalled,
        () => this.installWithDependencies(data2)
      );
    }, "showProgress");
    const data = await gameBananaApi6.getModDetails(modId, {
      onProgress: showProgress
    });
    if (!data) {
      document.getElementById("modal-title").textContent = "Error loading mod";
      return;
    }
    if (!hasRenderedProfile) await this.populateData(data, isInstalled);
    else
      updateDownloadStatus(
        data,
        isInstalled,
        () => this.installWithDependencies(data)
      );
  },
  close() {
    modModalCarousel.stopAutoPlay();
    hideModal();
  },
  async populateData(data, isInstalled) {
    showModData(data, isInstalled, () => this.installWithDependencies(data));
    modModalCarousel.setup(data.images);
  },
  async installWithDependencies(data) {
    const selectedDownload = await downloadChoiceModal.choose(
      data.downloadOptions || []
    );
    if (!selectedDownload) return;
    const requirements = data.requirements || [];
    const selected = requirements.length ? await dependencyReviewModal.review(requirements) : [];
    if (selected === null) return;
    for (const dependency of selected) {
      const installed = await FS15.isModInstalled(dependency.dependencyId);
      if (installed) continue;
      const installedDependency = await downloadMod.install(
        dependency.dependencyId,
        dependency.title,
        dependency.downloadUrl,
        data.engineId,
        {
          kind: "dependency",
          sourceType: dependency.downloadType || dependency.type,
          toastThumbnail: dependency.thumbnail
        }
      );
      if (!installedDependency) return;
    }
    const installedMod = await downloadMod.install(
      data.id,
      data.title,
      selectedDownload.downloadUrl,
      data.engineId,
      {
        dependencies: selected.map((dependency) => dependency.dependencyId),
        toastThumbnail: data.images?.[0],
        sourceType: selectedDownload.type,
        source: data.source || "gamebanana",
        image: data.images?.[0] || null,
        sourceUrl: data.sourceUrl || data.gameBananaUrl || null,
        engineLocked: Boolean(data.engineLocked)
      }
    );
    if (!installedMod) return;
    await Promise.all(
      selected.map(
        (dependency) => FS15.addDependencyConsumer(dependency.dependencyId, data.id)
      )
    );
  }
};

// app/src/ui/js/home/carousel.js
import { networkStatus as networkStatus6 } from "../../backend/core/index-core.js";
var homeCarousel = {
  currentSlideIndex: 0,
  slideInterval: null,
  totalSlides: 0,
  featuredGroupSize: 5,
  async init() {
    const track = document.getElementById("carousel-track");
    const dotsContainer = document.getElementById("carousel-dots");
    if (!track) return;
    try {
      const mods = await gameBananaApi7.getFeaturedCarousel();
      if (mods.length === 0) {
        track.innerHTML = `<div style="padding: 24px; color: var(--text-muted);">No featured mods found.</div>`;
        return;
      }
      track.innerHTML = "";
      dotsContainer.innerHTML = "";
      this.totalSlides = mods.length;
      mods.forEach((mod, index) => {
        const engineBadgeHtml = `
          <div class="home-engine-badge" title="${mod.category.name}">
              <img src="assets/icons/${mod.engine.icon}" alt=""/>
              <span>${mod.engine.name}</span>
          </div>
        `;
        const slide = document.createElement("div");
        slide.className = "carousel-slide";
        slide.style.backgroundImage = `url('${mod.image}')`;
        slide.innerHTML = `
            <div class="carousel-overlay"></div>
            ${engineBadgeHtml}
            <div class="carousel-content">
                <span class="badge">${mod.label}</span>
                <h1>${mod.title}</h1>
                <p class="carousel-author">by ${mod.author}</p>
                <button class="action-btn download-mod-btn">
                    <i class="fa-solid fa-download"></i> Download
                </button>
            </div>
        `;
        const downloadBtn = slide.querySelector(".download-mod-btn");
        downloadBtn.addEventListener("click", () => {
          modModal.open(mod.id);
        });
        track.appendChild(slide);
        const dot = document.createElement("div");
        dot.className = "dot";
        dot.addEventListener("click", () => this.goToSlide(index));
        dotsContainer.appendChild(dot);
      });
      this.setupControls();
      this.updateDots();
      this.startAutoSlide();
    } catch (error) {
      networkStatus6.setOnline(false);
      track.innerHTML = `<div style="padding: 24px; color: red;">Carousel error</div>`;
    }
  },
  setupControls() {
    const btnPrev = document.getElementById("carousel-prev");
    const btnNext = document.getElementById("carousel-next");
    if (btnPrev) {
      const newPrev = btnPrev.cloneNode(true);
      btnPrev.parentNode.replaceChild(newPrev, btnPrev);
      newPrev.title = "Previous featured mod - Shift-click for previous group";
      newPrev.addEventListener(
        "click",
        (event) => event.shiftKey ? this.prevGroup() : this.prevSlide()
      );
    }
    if (btnNext) {
      const newNext = btnNext.cloneNode(true);
      btnNext.parentNode.replaceChild(newNext, btnNext);
      newNext.title = "Next featured mod - Shift-click for next group";
      newNext.addEventListener(
        "click",
        (event) => event.shiftKey ? this.nextGroup() : this.nextSlide()
      );
    }
  },
  updateDots() {
    const dots = document.querySelectorAll(".dot");
    if (dots.length === 0) return;
    dots.forEach((d) => {
      d.classList.remove("active");
      d.style.display = "none";
    });
    const visibleDots = this.featuredGroupSize;
    const groupStart = Math.floor(this.currentSlideIndex / visibleDots) * visibleDots;
    for (let offset = 0; offset < Math.min(visibleDots, this.totalSlides - groupStart); offset++) {
      const dotIndex = groupStart + offset;
      dots[dotIndex].style.display = "block";
      dots[dotIndex].style.order = offset + 1;
    }
    dots[this.currentSlideIndex].classList.add("active");
  },
  goToSlide(index) {
    const track = document.getElementById("carousel-track");
    if (!track) return;
    this.currentSlideIndex = index;
    track.style.transform = `translateX(-${this.currentSlideIndex * 100}%)`;
    this.updateDots();
    this.startAutoSlide();
  },
  nextSlide() {
    if (this.totalSlides > 0)
      this.goToSlide((this.currentSlideIndex + 1) % this.totalSlides);
  },
  prevSlide() {
    if (this.totalSlides > 0)
      this.goToSlide(
        (this.currentSlideIndex - 1 + this.totalSlides) % this.totalSlides
      );
  },
  nextGroup() {
    if (this.totalSlides > 0)
      this.goToSlide(
        (this.currentSlideIndex + this.featuredGroupSize) % this.totalSlides
      );
  },
  prevGroup() {
    if (this.totalSlides > 0)
      this.goToSlide(
        (this.currentSlideIndex - this.featuredGroupSize + this.totalSlides) % this.totalSlides
      );
  },
  startAutoSlide() {
    this.stopAutoSlide();
    this.slideInterval = setInterval(() => this.nextSlide(), 5e3);
  },
  stopAutoSlide() {
    if (this.slideInterval) clearInterval(this.slideInterval);
  }
};

// app/src/ui/js/home/grid/cardBuilder.js
import { ENGINE_DETAILS as ENGINE_DETAILS10 } from "../../backend/config/engines.config.js";
import { applyDominantColor as applyDominantColor3 } from "../utils/index-utils.js";
function createCard(mod, index) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "mod-card";
  if (mod.source === "peo") card.classList.add("mod-card--no-author");
  const imageContainer = document.createElement("div");
  imageContainer.className = "mod-image-container";
  const image = document.createElement("img");
  image.className = "mod-image";
  image.src = mod.image;
  image.alt = "";
  image.loading = "lazy";
  image.onerror = () => {
    image.onerror = null;
    image.src = "assets/icons/launcher-icon.png";
  };
  imageContainer.appendChild(image);
  const colorProbe = new Image();
  colorProbe.crossOrigin = "anonymous";
  colorProbe.src = mod.image;
  colorProbe.addEventListener("error", () => {
    card.style.setProperty("--card-color", "rgba(255, 255, 255, 0.2)");
  });
  applyDominantColor3(colorProbe, card, {
    alpha: 0.5,
    fallback: "rgba(255, 255, 255, 0.08)"
  });
  const info = document.createElement("div");
  info.className = "mod-info";
  const title = document.createElement("h3");
  title.className = "mod-title";
  title.textContent = mod.title;
  const author = document.createElement("p");
  author.className = "mod-author";
  author.textContent = `by ${mod.author}`;
  info.appendChild(title);
  if (mod.source !== "peo") info.appendChild(author);
  let engineBadgeHtml = `
    <div class="home-engine-badge grid-engine-badge">
      <i class="fa-solid fa-question-circle"></i>
      <span>${mod.gameId === 8694 ? "FNF Mod" : "Unassigned"}</span>
    </div>
  `;
  const engine = ENGINE_DETAILS10[mod.engineId];
  if (engine) {
    engineBadgeHtml = `
      <div class="home-engine-badge grid-engine-badge">
        <img src="assets/icons/${engine.icon}" alt=""/>
         <span>${engine.name}</span>
      </div>
    `;
  }
  const badgeWrapper = document.createElement("div");
  badgeWrapper.innerHTML = engineBadgeHtml;
  info.appendChild(badgeWrapper.firstElementChild);
  const stats = document.createElement("div");
  stats.className = "mod-stats";
  [
    ["fa-regular fa-clock", mod.timeAgo],
    ["fa-solid fa-heart", Number(mod.likes).toLocaleString()],
    [
      mod.source === "peo" ? "fa-solid fa-download" : "fa-solid fa-eye",
      Number(
        mod.source === "peo" ? mod.downloads : mod.views
      ).toLocaleString()
    ]
  ].forEach(([icon, value]) => {
    const stat = document.createElement("span");
    const iconElement = document.createElement("i");
    iconElement.className = icon;
    iconElement.setAttribute("aria-hidden", "true");
    stat.append(iconElement, document.createTextNode(` ${value}`));
    stats.appendChild(stat);
  });
  info.append(stats);
  card.append(imageContainer, info);
  card.addEventListener("click", () => modModal.open(mod.id));
  return card;
}
__name(createCard, "createCard");

// app/src/ui/js/home/grid/gridState.js
var gridState = {
  currentPage: 1,
  isLoading: false,
  isSearchMode: false,
  searchQuery: "",
  currentFilter: "popular",
  currentCategoryId: null,
  hasMore: true,
  renderVersion: 0,
  pendingInitialRender: false,
  discoverySnapshotId: null,
  discoveryController: null,
  status: "ready"
};

// app/src/ui/js/home/grid/gridRender.js
import { gameBananaApi as gameBananaApi8 } from "../../backend/providers/gamebanana/gamebanana.provider.js";
import { networkStatus as networkStatus7 } from "../../backend/core/index-core.js";
var gridRender = {
  async renderGrid(isInitial = false) {
    if (gridState.isLoading) {
      if (isInitial) {
        gridState.discoveryController?.abort();
        gridState.renderVersion++;
        gridState.pendingInitialRender = true;
      }
      return;
    }
    const grid = document.getElementById("popular-grid");
    if (!grid) return;
    const renderVersion = ++gridState.renderVersion;
    const requestedPage = isInitial ? 1 : gridState.currentPage + 1;
    if (isInitial) {
      gridState.discoveryController?.abort();
      gridState.discoveryController = new AbortController();
      gridState.discoverySnapshotId = null;
      gridState.currentPage = 1;
      gridState.hasMore = true;
      grid.replaceChildren();
      grid.classList.remove("grid-empty", "grid-error");
    }
    gridState.isLoading = true;
    if (!isInitial) this.showLoadMoreIndicator(grid);
    try {
      const response = gridState.isSearchMode ? await gameBananaApi8.searchMods(
        gridState.searchQuery,
        requestedPage,
        12
      ) : await gameBananaApi8.getGridMods(
        gridState.currentFilter,
        requestedPage,
        gridState.currentCategoryId,
        {
          snapshotId: gridState.discoverySnapshotId,
          signal: gridState.discoveryController?.signal
        }
      );
      const result = Array.isArray(response) ? { mods: response, exhausted: response.length < 12 } : response;
      const mods = result.mods;
      if (renderVersion !== gridState.renderVersion) return;
      if (mods.length === 0 && isInitial) {
        if (result.sourceErrors?.length) {
          grid.textContent = "Discovery is temporarily unavailable.";
          grid.classList.add("grid-error");
          gridState.status = "error";
        } else {
          grid.textContent = "No mods found.";
          grid.classList.add("grid-empty");
        }
        return;
      }
      grid.classList.remove("grid-empty", "grid-error");
      if (mods.length === 0) {
        gridState.hasMore = false;
        return;
      }
      const cards = document.createDocumentFragment();
      mods.forEach((mod, index) => cards.appendChild(createCard(mod, index)));
      grid.appendChild(cards);
      if (result.snapshotId) gridState.discoverySnapshotId = result.snapshotId;
      gridState.currentPage = requestedPage;
      gridState.hasMore = !result.exhausted && mods.length === 12;
      gridState.status = result.stale ? "stale" : result.partial ? "partial" : result.exhausted ? "exhausted" : "ready";
      return true;
    } catch (error) {
      if (error?.kind === "aborted") return false;
      networkStatus7.setOnline(false);
      if (isInitial && renderVersion === gridState.renderVersion) {
        grid.textContent = "Failed to load mods.";
        grid.classList.add("grid-error");
      }
      return false;
    } finally {
      this.hideLoadMoreIndicator(grid);
      gridState.isLoading = false;
      if (gridState.pendingInitialRender) {
        gridState.pendingInitialRender = false;
        this.renderGrid(true);
      }
    }
  },
  showLoadMoreIndicator(grid) {
    if (grid.querySelector(".chunk-loader")) return;
    const loader = document.createElement("div");
    loader.className = "chunk-loader";
    loader.setAttribute("role", "status");
    loader.setAttribute("aria-live", "polite");
    loader.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>Loading more mods...</span>';
    grid.appendChild(loader);
  },
  hideLoadMoreIndicator(grid) {
    grid?.querySelector(".chunk-loader")?.remove();
  }
};

// app/src/ui/js/home/grid/filterManager.js
import { setupDropdown as setupDropdown4 } from "../utils/index-utils.js";
var filterManager = {
  filterClickHandler: null,
  filterContainer: null,
  engineDropdownCtrl: null,
  sortDropdownCtrl: null,
  setup() {
    this.remove();
    const engineDropdown2 = document.getElementById("engine-filter-dropdown");
    const engineTrigger = document.getElementById("engine-filter-trigger");
    const sortDropdown = document.getElementById("sort-filter-dropdown");
    const sortTrigger = document.getElementById("sort-filter-trigger");
    this.engineDropdownCtrl = setupDropdown4(engineTrigger, engineDropdown2);
    this.sortDropdownCtrl = setupDropdown4(sortTrigger, sortDropdown);
    const filters = document.getElementById("grid-filters");
    if (!filters) return;
    this.filterContainer = filters;
    this.filterClickHandler = (event) => {
      const option = event.target.closest(
        "#engine-filter-options .custom-option"
      );
      if (option) this.selectCategoryFilter(option);
      const sortOption = event.target.closest(
        "#sort-filter-options .custom-option"
      );
      if (sortOption) this.selectSortFilter(sortOption);
    };
    filters.addEventListener("click", this.filterClickHandler);
    this.syncCategoryFilter();
    this.syncSortFilter();
  },
  selectSortFilter(option) {
    const filter = option.dataset.filter;
    if (!filter) return;
    if (filter === gridState.currentFilter) {
      this.sortDropdownCtrl?.close();
      return;
    }
    gridState.currentFilter = filter;
    this.syncSortFilter();
    this.sortDropdownCtrl?.close();
    gridRender.renderGrid(true);
  },
  selectCategoryFilter(option) {
    const value = option.dataset.categoryId;
    const categoryId = value ? Number(value) : null;
    if (categoryId === gridState.currentCategoryId) {
      this.engineDropdownCtrl?.close();
      return;
    }
    gridState.currentCategoryId = categoryId;
    this.syncCategoryFilter();
    this.engineDropdownCtrl?.close();
    gridRender.renderGrid(true);
  },
  syncCategoryFilter() {
    const selectedText = document.getElementById("engine-filter-selected");
    const selectedIcon = document.getElementById("engine-filter-icon");
    const options = [
      ...document.querySelectorAll("#engine-filter-options .custom-option")
    ];
    const selectedOption = options.find((option) => {
      const value = option.dataset.categoryId;
      return (value ? Number(value) : null) === gridState.currentCategoryId;
    }) || options[0];
    if (!selectedOption) return;
    options.forEach((option) => {
      const isSelected = option === selectedOption;
      option.classList.toggle("selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });
    if (selectedText) selectedText.textContent = selectedOption.dataset.label;
    if (selectedIcon) {
      const icon = selectedOption.querySelector(".filter-engine-icon");
      selectedIcon.replaceChildren(
        ...[...icon.childNodes].map((node) => node.cloneNode(true))
      );
    }
  },
  syncSortFilter() {
    const selectedText = document.getElementById("sort-filter-selected");
    const options = [
      ...document.querySelectorAll("#sort-filter-options .custom-option")
    ];
    const selectedOption = options.find(
      (option) => option.dataset.filter === gridState.currentFilter
    ) || options[0];
    if (!selectedOption) return;
    options.forEach((option) => {
      const isSelected = option === selectedOption;
      option.classList.toggle("selected", isSelected);
      option.setAttribute("aria-selected", String(isSelected));
    });
    if (selectedText) selectedText.textContent = selectedOption.dataset.label;
  },
  remove() {
    this.engineDropdownCtrl?.destroy();
    this.sortDropdownCtrl?.destroy();
    this.filterContainer?.removeEventListener("click", this.filterClickHandler);
    this.filterContainer = null;
    this.filterClickHandler = null;
  }
};

// app/src/ui/js/home/grid/scrollManager.js
var scrollManager = {
  scrollHandler: null,
  scrollFrame: null,
  setup() {
    const mainContent = document.getElementById("main-content");
    if (!mainContent) return;
    this.remove();
    const checkForMore = /* @__PURE__ */ __name(() => {
      this.scrollFrame = null;
      if (mainContent.scrollTop + mainContent.clientHeight >= mainContent.scrollHeight - 300 && !gridState.isLoading && gridState.hasMore) {
        gridRender.renderGrid(false);
      }
    }, "checkForMore");
    this.scrollHandler = () => {
      if (this.scrollFrame) return;
      this.scrollFrame = requestAnimationFrame(checkForMore);
    };
    mainContent.addEventListener("scroll", this.scrollHandler, {
      passive: true
    });
  },
  remove() {
    const mainContent = document.getElementById("main-content");
    if (mainContent && this.scrollHandler)
      mainContent.removeEventListener("scroll", this.scrollHandler);
    if (this.scrollFrame) cancelAnimationFrame(this.scrollFrame);
    this.scrollFrame = null;
    this.scrollHandler = null;
  }
};

// app/src/ui/js/home/grid/index.js
var homeGrid = {
  // Getters y Setters para exponer el estado a dependencias externas (como search.js)
  get currentPage() {
    return gridState.currentPage;
  },
  set currentPage(val) {
    gridState.currentPage = val;
  },
  get isSearchMode() {
    return gridState.isSearchMode;
  },
  set isSearchMode(val) {
    gridState.isSearchMode = val;
  },
  get searchQuery() {
    return gridState.searchQuery;
  },
  set searchQuery(val) {
    gridState.searchQuery = val;
  },
  async init({ prefetchNextPage = false } = {}) {
    gridState.currentPage = 1;
    gridState.isSearchMode = false;
    gridState.hasMore = true;
    gridState.pendingInitialRender = false;
    filterManager.setup();
    await gridRender.renderGrid(true);
    if (prefetchNextPage && gridState.hasMore) {
      await gridRender.renderGrid(false);
    }
    scrollManager.setup();
  },
  renderGrid(isInitial) {
    return gridRender.renderGrid(isInitial);
  },
  destroy() {
    scrollManager.remove();
    filterManager.remove();
  }
};

// app/src/ui/js/home/homeScroll.js
var homeScroll = {
  init() {
    this.mainContent = document.getElementById("main-content");
    this.container = document.querySelector(".home-container");
    this.handler ?? (this.handler = () => {
      if (!this.container) return;
      const isScrolled = this.container.classList.contains("scrolled");
      const threshold = isScrolled ? 30 : 70;
      this.container.classList.toggle(
        "scrolled",
        this.mainContent.scrollTop > threshold
      );
    });
    this.mainContent?.removeEventListener("scroll", this.handler);
    this.mainContent?.addEventListener("scroll", this.handler);
  },
  destroy() {
    this.mainContent?.removeEventListener("scroll", this.handler);
    this.mainContent = null;
    this.container = null;
  }
};

// app/src/ui/js/home/index.js
import { appEvents as appEvents2 } from "../../backend/core/index-core.js";

// app/src/ui/js/home/searchDropdown.js
import { gameBananaApi as gameBananaApi9 } from "../../backend/providers/gamebanana/gamebanana.provider.js";
var homeSearchDropdown = {
  recentSearches: [],
  maxRecent: 5,
  fetchTimeout: null,
  suggestionVersion: 0,
  init() {
    this.loadRecent();
    this.input = document.getElementById("mod-search-input");
    this.dropdown = document.getElementById("search-dropdown");
    if (!this.input || !this.dropdown) return;
    this.input.addEventListener("focus", () => this.showDropdown());
    this.input.addEventListener("input", () => this.updateDropdown());
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-container")) {
        this.hideDropdown();
      }
    });
  },
  loadRecent() {
    try {
      const saved = localStorage.getItem("weekbox_recent_searches");
      this.recentSearches = saved ? JSON.parse(saved) : [];
    } catch (e) {
      this.recentSearches = [];
    }
  },
  saveRecent(query) {
    if (!query) return;
    this.recentSearches = this.recentSearches.filter(
      (q) => q.toLowerCase() !== query.toLowerCase()
    );
    this.recentSearches.unshift(query);
    if (this.recentSearches.length > this.maxRecent) this.recentSearches.pop();
    localStorage.setItem(
      "weekbox_recent_searches",
      JSON.stringify(this.recentSearches)
    );
  },
  showDropdown() {
    if (!this.input || !this.dropdown) return;
    this.updateDropdown();
    this.dropdown.style.display = "flex";
  },
  hideDropdown() {
    if (!this.dropdown) return;
    this.dropdown.style.display = "none";
  },
  async updateDropdown() {
    if (!this.input || !this.dropdown) return;
    const suggestionVersion = ++this.suggestionVersion;
    const query = this.input.value.trim().toLowerCase();
    this.dropdown.innerHTML = "";
    let filteredRecent = this.recentSearches;
    if (query) {
      filteredRecent = this.recentSearches.filter(
        (q) => q.toLowerCase().includes(query)
      );
    }
    if (filteredRecent.length > 0) {
      this.renderSection(
        "Recent searches",
        filteredRecent,
        "fa-clock-rotate-left",
        true
      );
    }
    if (query.length > 2) {
      clearTimeout(this.fetchTimeout);
      const relatedSection = document.createElement("div");
      relatedSection.className = "dropdown-section";
      relatedSection.innerHTML = `<div class="dropdown-title">Related</div><div class="dropdown-item" style="cursor:default;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>`;
      this.dropdown.appendChild(relatedSection);
      this.fetchTimeout = setTimeout(async () => {
        const related = await this.fetchRelated(query);
        if (suggestionVersion !== this.suggestionVersion) return;
        if (related.length > 0) {
          relatedSection.innerHTML = `<div class="dropdown-title">Related suggestions</div>`;
          related.forEach((title) => {
            const item = document.createElement("div");
            item.className = "dropdown-item";
            item.innerHTML = `<i class="fa-solid fa-magnifying-glass"></i> <span>${title}</span>`;
            item.addEventListener("click", () => {
              this.input.value = title;
              this.hideDropdown();
              homeSearch.executeSearch(title);
            });
            relatedSection.appendChild(item);
          });
        } else {
          relatedSection.style.display = "none";
        }
      }, 500);
    }
    if (this.dropdown.innerHTML === "") {
      this.dropdown.innerHTML = `<div class="dropdown-item empty-state">No recent searches</div>`;
    }
  },
  removeRecent(query) {
    this.recentSearches = this.recentSearches.filter(
      (item) => item.toLowerCase() !== query.toLowerCase()
    );
    localStorage.setItem(
      "weekbox_recent_searches",
      JSON.stringify(this.recentSearches)
    );
    this.updateDropdown();
  },
  renderSection(title, items, icon, removable = false) {
    const section = document.createElement("div");
    section.className = "dropdown-section";
    section.innerHTML = `<div class="dropdown-title">${title}</div>`;
    items.forEach((text) => {
      const item = document.createElement("div");
      item.className = "dropdown-item";
      item.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${text}</span>`;
      item.addEventListener("click", () => {
        this.input.value = text;
        this.hideDropdown();
        homeSearch.executeSearch(text);
      });
      if (removable) {
        const removeButton = document.createElement("button");
        removeButton.className = "history-remove";
        removeButton.type = "button";
        removeButton.setAttribute(
          "aria-label",
          `Remove ${text} from search history`
        );
        removeButton.innerHTML = '<i class="fa-solid fa-xmark"></i>';
        removeButton.addEventListener("click", (event) => {
          event.stopPropagation();
          this.removeRecent(text);
        });
        item.appendChild(removeButton);
      }
      section.appendChild(item);
    });
    this.dropdown.appendChild(section);
  },
  async fetchRelated(query) {
    return gameBananaApi9.getSearchSuggestions(query);
  }
};

// app/src/ui/js/home/search.js
var homeSearch = {
  abortController: null,
  init() {
    this.destroy();
    const input = document.getElementById("mod-search-input");
    const hint = document.getElementById("mod-search-hint");
    if (!input || !hint) return;
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    input.placeholder = "";
    hint.textContent = "Search mods, paste a GameBanana link, or enter a mod ID";
    input.addEventListener(
      "focus",
      () => {
        this.updateHintVisibility(input, hint);
      },
      { signal }
    );
    input.addEventListener(
      "blur",
      () => {
        this.updateHintVisibility(input, hint);
      },
      { signal }
    );
    input.addEventListener(
      "input",
      () => {
        this.updateHintVisibility(input, hint);
      },
      { signal }
    );
    input.addEventListener(
      "keydown",
      (event) => {
        if (event.key !== "Enter") return;
        event.preventDefault();
        this.executeSearch(input.value.trim());
        homeSearchDropdown.hideDropdown();
        input.blur();
      },
      { signal }
    );
    this.updateHintVisibility(input, hint);
  },
  shouldShowHint(input) {
    return !input.value && document.activeElement !== input;
  },
  updateHintVisibility(input, hint) {
    hint.classList.toggle("is-hidden", !this.shouldShowHint(input));
  },
  destroy() {
    this.abortController?.abort();
    this.abortController = null;
  },
  async executeSearch(query) {
    query = query.trim().replace(/\s+/g, " ");
    const carousel = document.getElementById("featured-carousel");
    const sectionTitle = document.getElementById("grid-section-title");
    const filters = document.getElementById("grid-filters");
    homeGrid.isSearchMode = query.length > 0;
    homeGrid.searchQuery = query;
    homeGrid.currentPage = 1;
    if (query.length > 0) {
      homeSearchDropdown.saveRecent(query);
      if (carousel) carousel.style.display = "none";
      if (filters) filters.style.display = "none";
      if (sectionTitle) sectionTitle.textContent = `Results for "${query}"`;
    } else {
      if (carousel) carousel.style.display = "flex";
      if (filters) filters.style.display = "flex";
      if (sectionTitle) sectionTitle.textContent = "Mods";
    }
    await homeGrid.renderGrid(true);
  }
};

// app/src/ui/js/home/index.js
import { networkStatus as networkStatus8 } from "../../backend/core/index-core.js";
var homeView = {
  hasVisited: false,
  ready: Promise.resolve(),
  async init() {
    if (!networkStatus8.online) {
      this.renderOffline();
      this.hasVisited = true;
      return;
    }
    homeScroll.init();
    homeSearch.init();
    homeSearchDropdown.init();
    await Promise.all([
      homeCarousel.init(),
      homeGrid.init({ prefetchNextPage: !this.hasVisited })
    ]);
    if (!networkStatus8.online) {
      homeScroll.destroy();
      homeGrid.destroy();
      this.renderOffline();
      return;
    }
    this.hasVisited = true;
  },
  renderOffline() {
    const container = document.querySelector(".home-container");
    if (!container) return;
    container.replaceChildren();
    const panel = document.createElement("section");
    panel.className = "home-offline-panel";
    panel.setAttribute("role", "status");
    panel.innerHTML = `
      <i class="fa-solid fa-wifi" aria-hidden="true"></i>
      <h2>You are offline</h2>
      <p>Discover, search, downloads, and engine release checks need an internet connection. Your local mods and engines are still available from their managers.</p>
    `;
    container.appendChild(panel);
  },
  destroy() {
    homeScroll.destroy();
    homeCarousel.stopAutoSlide();
    homeGrid.destroy();
    homeSearch.destroy();
  }
};
function registerHomeView() {
  appEvents2.addEventListener("view:loaded", (event) => {
    if (event.detail === "home") homeView.ready = homeView.init();
    else {
      homeView.destroy();
      homeView.ready = Promise.resolve();
    }
  });
  networkStatus8.addEventListener("change", () => {
    if (!document.querySelector(".home-container")) return;
    homeView.destroy();
    homeView.ready = homeView.init();
  });
}
__name(registerHomeView, "registerHomeView");

// app/src/ui/js/storageRecommendationModal.js
var storageRecommendationModal = {
  ensure() {
    let modal = document.getElementById("storage-recommendation-modal");
    if (modal) return modal;
    modal = document.createElement("section");
    modal.id = "storage-recommendation-modal";
    modal.className = "error-overlay storage-recommendation-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "storage-recommendation-title");
    modal.innerHTML = `
      <div class="error-content" role="document">
        <div class="error-rail" aria-hidden="true"><i class="fa-solid fa-hard-drive"></i></div>
        <div class="error-main">
          <header class="error-header">
            <div><h2 id="storage-recommendation-title">Move WeekBox to a safer location?</h2></div>
            <button type="button" class="error-close" aria-label="Remind me later"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <p class="error-summary"></p>
          <p class="storage-recommendation-path"></p>
          <footer class="error-actions">
            <button type="button" class="error-action storage-dismiss">Don't remind me</button>
            <button type="button" class="error-action storage-later">Not now</button>
            <button type="button" class="error-action error-settings storage-move"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i><span>Move now</span></button>
          </footer>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  },
  show({ currentPath, defaultPath }) {
    const modal = this.ensure();
    modal.querySelector(".error-summary").textContent = `WeekBox is currently stored in ${currentPath}. Cloud-synced and Documents folders can cause file-locking or sync problems with engines and mods.`;
    modal.querySelector(".storage-recommendation-path").textContent = `Recommended: ${defaultPath}/WeekBox`;
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));
    return new Promise((resolve) => {
      const close = /* @__PURE__ */ __name((choice) => {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.style.display = "none";
          resolve(choice);
        }, 220);
      }, "close");
      modal.querySelector(".error-close").onclick = () => close("later");
      modal.querySelector(".storage-later").onclick = () => close("later");
      modal.querySelector(".storage-dismiss").onclick = () => close("dismiss");
      modal.querySelector(".storage-move").onclick = () => close("move");
      modal.onclick = (event) => {
        if (event.target === modal) close("later");
      };
    });
  }
};

// app/src/ui/js/updates/appUpdateModal.js
import { appUpdater as appUpdater2 } from "../../backend/core/index-core.js";
var appUpdateModal = {
  close() {
    const modal = document.getElementById("app-update-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 220);
  },
  show(update) {
    if (document.getElementById("app-update-modal")) return;
    const modal = document.createElement("section");
    modal.id = "app-update-modal";
    modal.className = "app-update-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "app-update-title");
    modal.innerHTML = `
      <div class="app-update-content">
        <div class="app-update-icon"><i class="fa-solid fa-arrow-up-right-dots" aria-hidden="true"></i></div>
        <div class="app-update-main">
          <p class="app-update-label">New version available</p>
          <h2 id="app-update-title">Update WeekBox</h2>
          <p class="app-update-copy">WeekBox <strong data-update-version></strong> is ready. The app will close, apply the update, and reopen automatically.</p>
          <p class="app-update-progress" aria-live="polite"></p>
          <div class="app-update-actions">
            <button class="app-update-manual" type="button"><i class="fa-brands fa-github" aria-hidden="true"></i> Download manually</button>
            <button class="app-update-later" type="button">Later</button>
            <button class="app-update-install" type="button"><i class="fa-solid fa-download" aria-hidden="true"></i> Install and close</button>
          </div>
        </div>
      </div>`;
    modal.querySelector("[data-update-version]").textContent = update.latestVersion;
    const manualUrl = update.releaseUrl || "https://github.com/Crew-Awesome/Weekbox/releases/latest";
    const close = /* @__PURE__ */ __name(() => this.close(), "close");
    modal.querySelector(".app-update-later").addEventListener("click", close);
    modal.querySelector(".app-update-manual").addEventListener("click", () => {
      Neutralino.os.open(manualUrl).catch(() => {
      });
    });
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });
    modal.querySelector(".app-update-install").addEventListener("click", async (event) => {
      const button = event.currentTarget;
      const progress = modal.querySelector(".app-update-progress");
      button.disabled = true;
      modal.querySelector(".app-update-later").disabled = true;
      try {
        await appUpdater2.install(
          update,
          (message) => {
            progress.textContent = message;
          },
          () => {
            this.close();
            document.body.classList.remove("window-unfocused");
          }
        );
      } catch (error) {
        progress.textContent = `${error?.message || "Could not install the update."} Download it manually instead.`;
        button.disabled = false;
        modal.querySelector(".app-update-later").disabled = false;
        modal.querySelector(".app-update-manual").disabled = false;
      }
    });
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));
    modal.querySelector(".app-update-install").focus();
  }
};
export {
  AppUpdateController,
  StorageMoveFeedback,
  appUpdateModal,
  cardRenderer,
  configModal,
  createCard,
  dependenciesRenderer,
  dependencyReviewModal,
  describeExtractedFiles,
  diagnosticsConsentModal,
  downloadChoiceModal,
  downloadEngine,
  downloadMod,
  engineDropdown,
  engineInstallToast,
  engineManagerModal,
  engineUpdateModal,
  engineUpdateService,
  engineUpdateToast,
  enginesView,
  ensureModal4 as ensureModal,
  errorHandler,
  escapeHtml,
  existingStorageModal,
  extractVersionFallback,
  fetchAndRenderReleaseNotes,
  filterManager,
  firstRunStorageModal,
  flattenEngineDirectory,
  getGameBananaId,
  getGameBananaSource,
  getModCover,
  getTargetLink,
  getTargetPlatform,
  gridRender,
  gridState,
  hideModal,
  homeCarousel,
  homeGrid,
  homeScroll,
  homeSearch,
  homeSearchDropdown,
  homeView,
  loadModCardImage,
  loadingContent,
  localModImportModal,
  modManagerModal,
  modModal,
  modModalCarousel,
  modSettingsModal,
  modsMaster,
  openFilterSortModal,
  primeModCover,
  registerEnginesView,
  registerHomeView,
  rememberInstalledEngineBuild,
  replaceProcessExitListener,
  resetModal,
  scrollManager,
  settingsContent,
  setupModSettingsDropdowns,
  showModData,
  showModal,
  sidebar,
  storageRecommendationModal,
  syncLaunchButton,
  toastDownloadMod,
  toastSystem,
  updateDownloadStatus,
  wineModal
};
