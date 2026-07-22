import { appSettings } from "../../core/settings.js";

const DIAGNOSTIC_REPORT_ENDPOINT =
  "https://fnfweekbox.vercel.app/api/diagnostic-report";

function nonEmptyString(value, fallback = "Unknown") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function sanitizeDiagnosticText(value) {
  return nonEmptyString(value, "No details available")
    .replace(
      /https?:\/\/(?:canary\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[^\s"']+/gi,
      "[REDACTED DISCORD WEBHOOK]",
    )
    .replace(
      /\b(?:authorization|cookie|set-cookie|token|api[_-]?key|secret|password)\s*[:=]\s*(?:bearer\s+)?[^\s,;]+/gi,
      "[REDACTED SECRET]",
    )
    .replace(/\bbearer\s+[a-z0-9._~-]+/gi, "[REDACTED SECRET]")
    .replace(/[a-z]:\\users\\[^\\\r\n]+/gi, "[REDACTED WINDOWS PATH]")
    .replace(/\/(?:users|home)\/[^\s\r\n:)}\]]+/gi, "[REDACTED USER PATH]")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED EMAIL]")
    .slice(0, 12000);
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
    try {
      return JSON.stringify(error, null, 2);
    } catch {
      return error.message || "An unexpected error occurred";
    }
  }
  return String(error || "An unexpected error occurred");
}

function getDiagnosticErrorMessage(error) {
  if (error instanceof Error) return error.message || "An unexpected error";
  if (error && typeof error === "object" && error.message) {
    return String(error.message);
  }
  return getMessage(error);
}

function getDiagnosticStackTrace(error) {
  if (error instanceof Error && error.stack) return error.stack;
  if (error && typeof error === "object" && typeof error.stack === "string") {
    return error.stack;
  }

  let nativeDetails = "No extra native error details were provided.";
  if (error && typeof error === "object") {
    try {
      nativeDetails = JSON.stringify(error, null, 2);
    } catch {}
  }
  return `No JavaScript stack trace was provided by Neutralino.\nNative error details:\n${nativeDetails}`;
}

function describeIssue(error) {
  const message = getMessage(error);
  const lower = message.toLowerCase();

  if (
    lower.includes("crypt_e_no_revocation_check") ||
    (lower.includes("schannel") && lower.includes("exit code 35"))
  ) {
    return {
      title: "Windows could not verify the download certificate",
      summary:
        "WeekBox was blocked by Windows before the download started. Check your date and time, then try another network. A VPN, proxy, or antivirus HTTPS scanning can also block the certificate check.",
      tag: "Windows certificate check",
      reportable: false,
    };
  }
  if (lower.includes("onedrive") || lower.includes("exit code 23")) {
    return {
      title: "Choose a local storage folder",
      summary:
        "WeekBox cannot safely download engines into OneDrive. Use a local folder such as C:\\WeekBoxData instead.",
      actionLabel: "Open storage settings",
      action: "storage",
      tag: "Storage location",
    };
  }
  if (lower.includes("access is denied") || lower.includes("permission")) {
    return {
      title: "WeekBox cannot write to this folder",
      summary:
        "Check that your storage folder is local, writable, and not being used by another program.",
      actionLabel: "Open storage settings",
      action: "storage",
      tag: "Folder access",
    };
  }
  if (
    lower.includes("could not access the engine folder") ||
    lower.includes("filesystem error")
  ) {
    return {
      title: "WeekBox cannot access the storage drive",
      summary:
        "The folder containing this engine is unavailable or cannot be read. Check that the selected drive is connected and writable.",
      actionLabel: "Open storage settings",
      action: "storage",
      tag: "Storage drive unavailable",
    };
  }
  if (lower.includes("exit code 22") || /\b(?:403|404)\b/.test(lower)) {
    return {
      title: "This download is no longer available",
      summary:
        "The selected engine file could not be downloaded. Try another version or try again later.",
      tag: "Download unavailable",
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
      title: "WeekBox could not unpack the download",
      summary:
        "The downloaded file may be incomplete or invalid. Retry the download with a local storage folder.",
      tag: "Archive problem",
    };
  }
  if (lower.includes("downloaded archive did not contain any files")) {
    return {
      title: "The download was empty",
      summary:
        "The archive opened, but it did not contain installable files. This is usually an empty or incorrectly packaged upload from the download source. Try again later or choose another download option.",
      tag: "Empty download",
    };
  }
  if (lower.includes("disk image does not contain a macos application")) {
    return {
      title: "The macOS installer contains no app",
      summary:
        "WeekBox mounted the downloaded disk image but could not find an application inside it. Try another version or report this release to the engine author.",
      tag: "Invalid macOS installer",
    };
  }
  if (
    lower.includes("end-of-central-directory signature not found") ||
    lower.includes("cannot find zipfile directory")
  ) {
    return {
      title: "The download was not a ZIP file",
      summary:
        "The download source returned something other than the expected archive, often an expired link or a server error page. WeekBox kept it from being installed. Try again later or choose another version.",
      tag: "Invalid download file",
    };
  }
  if (lower.includes("does not contain a runnable engine")) {
    return {
      title: "This engine build is not supported",
      summary: `The download finished, but WeekBox could not find a runnable ${window.NL_OS === "Darwin" ? "macOS" : window.NL_OS === "Linux" ? "Linux" : "Windows"} app file. Copy the report so we can investigate this version.`,
      tag: "Unsupported build",
    };
  }
  return {
    title: "Something went wrong",
    summary:
      "WeekBox could not finish this action. Copy the error report if you need help.",
    tag: "Unexpected error",
  };
}

function createReport({ error, action, item, version, storagePath, issue }) {
  return [
    "WeekBox error report",
    `Time: ${new Date().toLocaleString()}`,
    `OS: ${window.NL_OS || "Unknown"}`,
    `Action: ${action || "Unknown"}`,
    item ? `Item: ${item}` : null,
    version ? `Version: ${version}` : null,
    storagePath ? `Storage path: ${storagePath}` : null,
    `Friendly issue: ${issue.tag}`,
    `Original error: ${getMessage(error)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function submitDiagnosticReport(context, issue) {
  if (
    !appSettings.get("diagnosticReportingConsentAnswered") ||
    !appSettings.get("diagnosticReportingEnabled")
  ) {
    return;
  }

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
      operatingSystem: sanitizeDiagnosticText(operatingSystem),
      architecture: sanitizeDiagnosticText(architecture),
      action: sanitizeDiagnosticText(context.action || issue.tag),
      errorMessage: sanitizeDiagnosticText(errorMessage),
      stackTrace: sanitizeDiagnosticText(stackTrace),
    }),
  });

  if (response.status !== 202) {
    throw new Error(
      `Diagnostic reporting failed with status ${response.status}`,
    );
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
        ? "Report copied"
        : "Copy failed";
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
  },
};
