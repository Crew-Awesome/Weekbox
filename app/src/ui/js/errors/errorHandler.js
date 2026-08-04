import "./wineModal.js";
import { t } from "../i18n/index.js";

const DIAGNOSTIC_REPORT_ENDPOINT =
  "https://fnfweekbox.vercel.app/api/diagnostic-report";

function nonEmptyString(value, fallback = "Unknown") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function getNativeErrorDetails(error) {
  if (!error || typeof error !== "object") return "";
  const fields = ["message", "code", "error", "stdErr", "stdOut", "reason"]
    .map((key) => String(error[key] ?? "").trim())
    .filter(Boolean);
  if (fields.length) return [...new Set(fields)].join(" | ");
  try {
    return JSON.stringify(error, null, 2);
  } catch {
    return String(error);
  }
}

async function getOperatingSystem() {
  try {
    const info = await Neutralino.computer.getOSInfo();
    return nonEmptyString(info.description || info.name, window.NL_OS);
  } catch {
    return nonEmptyString(window.NL_OS);
  }
}

async function getArchitecture() {
  try {
    return nonEmptyString(await Neutralino.computer.getArch(), window.NL_ARCH);
  } catch {
    return nonEmptyString(window.NL_ARCH);
  }
}

function getMessage(error) {
  if (error instanceof Error) return error.stack || error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    return getNativeErrorDetails(error) || "An unexpected error occurred";
  }
  return String(error || "An unexpected error occurred");
}

function getDiagnosticErrorMessage(error) {
  if (error instanceof Error) return error.message || "An unexpected error";
  return getNativeErrorDetails(error) || getMessage(error);
}

function getDiagnosticStackTrace(error) {
  if (error instanceof Error && error.stack) return error.stack;
  if (error && typeof error === "object" && typeof error.stack === "string") {
    return error.stack;
  }

  let nativeDetails = "No extra native error details were provided.";
  if (error && typeof error === "object") {
    nativeDetails = getNativeErrorDetails(error) || nativeDetails;
  }
  return `No JavaScript stack trace was provided by Neutralino.\nNative error details:\n${nativeDetails}`;
}

function describeIssue(error) {
  const message = getMessage(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("crypt_e_no_revocation_check") ||
    (lower.includes("schannel") && lower.includes("exit code 35")) ||
    lower.includes("exit code 60") ||
    lower.includes("certificate could not be trusted") ||
    lower.includes("untrusted_root")
  ) {
    return {
      title: t("errors.certificateTitle"),
      summary: t("errors.certificateSummary"),
      tag: t("errors.certificateTag"),
      reportable: false,
    };
  }
  if (lower.includes("onedrive") || lower.includes("exit code 23")) {
    return {
      title: t("errors.oneDriveTitle"),
      summary: t("errors.oneDriveSummary"),
      actionLabel: t("errors.openStorageSettings"),
      action: "storage",
      tag: t("errors.storageLocationTag"),
    };
  }
  if (
    lower.includes("access is denied") ||
    lower.includes("permission") ||
    lower.includes("file is in use") ||
    lower.includes("directory is not empty")
  ) {
    return {
      title: t("errors.writeFolderTitle"),
      summary: t("errors.writeFolderSummary"),
      actionLabel: t("errors.openStorageSettings"),
      action: "storage",
      tag: t("errors.folderAccessTag"),
    };
  }
  if (
    lower.includes("could not access the engine folder") ||
    lower.includes("filesystem error")
  ) {
    return {
      title: t("errors.storageDriveTitle"),
      summary: t("errors.storageDriveSummary"),
      actionLabel: t("errors.openStorageSettings"),
      action: "storage",
      tag: t("errors.storageDriveTag"),
    };
  }
  if (lower.includes("exit code 22") || /\b(?:403|404)\b/.test(lower)) {
    return {
      title: t("errors.downloadUnavailableTitle"),
      summary: t("errors.downloadUnavailableSummary"),
      tag: t("errors.downloadUnavailableTag"),
    };
  }
  if (
    lower.includes("download link is missing") ||
    lower.includes("download link is invalid") ||
    lower.includes("download does not have a valid link") ||
    lower.includes("could not find the google drive file id") ||
    lower.includes("does not point to a downloadable file")
  ) {
    return {
      title: t("errors.invalidLinkTitle"),
      summary: t("errors.invalidLinkSummary"),
      tag: t("errors.invalidLinkTag"),
      reportable: false,
    };
  }
  if (
    !lower.includes("end-of-central-directory signature not found") &&
    !lower.includes("cannot find zipfile directory") &&
    (lower.includes("extraction failed") ||
      lower.includes("invalid archive") ||
      lower.includes("archive file"))
  ) {
    return {
      title: t("errors.unpackTitle"),
      summary: t("errors.unpackSummary"),
      tag: t("errors.archiveProblemTag"),
    };
  }
  if (
    lower.includes("downloaded archive is empty") ||
    lower.includes("downloaded archive did not contain any files")
  ) {
    return {
      title: t("errors.emptyDownloadTitle"),
      summary: t("errors.emptyDownloadSummary"),
      tag: t("errors.emptyDownloadTag"),
      // This is a bad or empty upload, not an application failure. Do not send
      // a stack trace to diagnostics (or its webhook) for it.
      reportable: false,
    };
  }
  if (lower.includes("disk image does not contain a macos application")) {
    return {
      title: t("errors.invalidMacInstallerTitle"),
      summary: t("errors.invalidMacInstallerSummary"),
      tag: t("errors.invalidMacInstallerTag"),
    };
  }
  if (
    lower.includes("end-of-central-directory signature not found") ||
    lower.includes("cannot find zipfile directory")
  ) {
    return {
      title: t("errors.notZipTitle"),
      summary: t("errors.notZipSummary"),
      tag: t("errors.invalidDownloadFileTag"),
    };
  }
  if (lower.includes("does not contain a runnable engine")) {
    return {
      title: t("errors.unsupportedBuildTitle"),
      summary: t("errors.unsupportedBuildSummary", {
        os:
          window.NL_OS === "Darwin"
            ? "macOS"
            : window.NL_OS === "Linux"
              ? "Linux"
              : "Windows",
      }),
      tag: t("errors.unsupportedBuildTag"),
    };
  }
  return {
    title: t("errors.unexpectedTitle"),
    summary: t("errors.unexpectedSummary"),
    tag: t("errors.unexpectedTag"),
  };
}

function createReport({ error, action, item, version, storagePath, issue }) {
  return [
    "WeekBox support report",
    `Time: ${new Date().toLocaleString()}`,
    `OS: ${window.NL_OS || "Unknown"}`,
    `Action: ${action || "Unknown"}`,
    item ? `Item: ${item}` : null,
    version ? `Version: ${version}` : null,
    storagePath ? `Storage path: ${storagePath}` : null,
    `Issue: ${issue.tag}`,
    `What happened: ${issue.summary}`,
    `Error: ${getDiagnosticErrorMessage(error)}`,
    `Stack trace:\n${getDiagnosticStackTrace(error)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function submitDiagnosticReport(context, issue) {
  const errorMessage = getDiagnosticErrorMessage(context.error);
  const stackTrace = getDiagnosticStackTrace(context.error);
  const [operatingSystem, architecture] = await Promise.all([
    getOperatingSystem(),
    getArchitecture(),
  ]);
  const response = await fetch(DIAGNOSTIC_REPORT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appVersion: nonEmptyString(window.NL_APPVERSION),
      operatingSystem,
      architecture,
      action: context.action || issue.tag,
      item: context.item || "",
      version: context.version || "",
      storagePath: context.storagePath || "",
      issue: issue.tag,
      title: issue.title,
      summary: issue.summary,
      errorMessage,
      stackTrace,
      reportedAt: new Date().toISOString(),
    }),
  });

  if (response.status !== 202) {
    console.warn(`Diagnostic reporting failed with status ${response.status}`);
  }
}

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

export const errorHandler = {
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
            <button type="button" class="error-close" aria-label="${t("errors.closeMessage")}"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <p class="error-summary"></p>
          <details class="error-details"><summary>${t("errors.technicalDetails")}</summary><pre></pre></details>
          <footer class="error-actions">
            <button type="button" class="error-action error-settings" hidden><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span></span></button>
            <button type="button" class="error-action error-copy"><i class="fa-regular fa-copy" aria-hidden="true"></i><span>${t("errors.copyReport")}</span></button>
          </footer>
        </div>
      </div>`;
    document.body.appendChild(modal);
    modal
      .querySelector(".error-close")
      .addEventListener("click", () => this.close());
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
      copyButton.querySelector("span").textContent = copied
        ? t("errors.reportCopied")
        : t("errors.copyFailed");
      setTimeout(() => {
        copyButton.querySelector("span").textContent = t("errors.copyReport");
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
  },
};
