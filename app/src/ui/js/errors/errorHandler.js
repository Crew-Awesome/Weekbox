import "./wineModal.js";
import { t } from "../i18n/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";
import { isGoogleDriveQuotaError } from "../../../backend/services/downloads/download-validation.util.js";
import { nativeFetch } from "../../../backend/services/network/native-http.js";

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

async function getLocaleInfo() {
  try {
    return await Neutralino.os.getLocaleInfo();
  } catch {
    return null;
  }
}

async function getDiskDiagnostics() {
  try {
    const disks = await Neutralino.computer.getDisks();
    const list = Array.isArray(disks) ? disks : disks ? [disks] : [];
    return {
      count: list.length,
      totalBytes: list.reduce(
        (sum, disk) => sum + (Number(disk.total) || 0),
        0,
      ),
      freeBytes: list.reduce((sum, disk) => sum + (Number(disk.free) || 0), 0),
    };
  } catch {
    return null;
  }
}

async function getNetworkDiagnostics() {
  try {
    const interfaces = await Neutralino.computer.getNetworkInterfaces();
    const names = Object.keys(interfaces || {});
    const list = Object.values(interfaces || {})
      .flatMap((addresses) => (Array.isArray(addresses) ? addresses : []))
      .filter((address) => !address?.isInternal);
    return {
      count: names.length,
      ipv4: list.reduce(
        (count, entry) => count + (entry?.family === "ipv4" ? 1 : 0),
        0,
      ),
      ipv6: list.reduce(
        (count, entry) => count + (entry?.family === "ipv6" ? 1 : 0),
        0,
      ),
    };
  } catch {
    return null;
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

function getDownloadDiagnostics(error) {
  const details = {};
  for (const [name, source] of [
    ["download", error?.downloadDiagnostics],
    ["archive", error?.archiveDiagnostics],
  ]) {
    if (!source || typeof source !== "object") continue;
    details[name] = Object.fromEntries(
      Object.entries(source)
        .filter(
          ([, value]) => value !== undefined && value !== null && value !== "",
        )
        .map(([key, value]) => [
          key,
          typeof value === "string" ? value.slice(0, 2_000) : value,
        ]),
    );
  }
  return Object.keys(details).length ? details : null;
}

function formatDownloadDiagnostics(error) {
  const diagnostics = getDownloadDiagnostics(error);
  if (!diagnostics) return null;
  return `Download diagnostics:\n${JSON.stringify(diagnostics, null, 2)}`;
}

function hasAny(text, values) {
  return values.some((value) => text.includes(value));
}

function issueText(title, summary, tag, extra = {}) {
  return { title: t(title), summary: t(summary), tag: t(tag), ...extra };
}

const DOWNLOAD_UNAVAILABLE = () =>
  issueText(
    "errors.downloadUnavailableTitle",
    "errors.downloadUnavailableSummary",
    "errors.downloadUnavailableTag",
    { reportable: false },
  );

const ISSUE_RULES = [
  {
    matches: (lower) =>
      hasAny(lower, [
        "integrity verification",
        "not a recognized archive",
        "web page instead of the archive",
        "devolvió una página web",
        "devolviÃ³ una pÃ¡gina web",
        "file sharing and storage made simple",
      ]),
    create: (lower) =>
      issueText(
        "errors.unpackTitle",
        "errors.unpackSummary",
        "errors.archiveProblemTag",
        {
          reportable: lower.includes("integrity verification")
            ? undefined
            : false,
        },
      ),
  },
  {
    matches: (lower) =>
      hasAny(lower, [
        "crypt_e_no_revocation_check",
        "exit code 60",
        "certificate could not be trusted",
        "untrusted_root",
      ]) ||
      (lower.includes("schannel") && lower.includes("exit code 35")),
    create: () =>
      issueText(
        "errors.certificateTitle",
        "errors.certificateSummary",
        "errors.certificateTag",
        { reportable: false },
      ),
  },
  {
    matches: (lower) =>
      lower.includes("onedrive") || lower.includes("exit code 23"),
    create: () =>
      issueText(
        "errors.oneDriveTitle",
        "errors.oneDriveSummary",
        "errors.storageLocationTag",
        { actionLabel: t("errors.openStorageSettings"), action: "storage" },
      ),
  },
  {
    matches: (lower) =>
      !lower.includes("bundled archive extractor") &&
      hasAny(lower, [
        "access is denied",
        "permission",
        "file is in use",
        "directory is not empty",
        "could not be written to storage",
        "could not write ",
        "could not create its storage folder",
        "could not prepare the download destination",
        "could not finalize the temporary download",
      ]),
    create: () =>
      issueText(
        "errors.writeFolderTitle",
        "errors.writeFolderSummary",
        "errors.folderAccessTag",
        { actionLabel: t("errors.openStorageSettings"), action: "storage" },
      ),
  },
  {
    matches: (lower) =>
      hasAny(lower, [
        "could not access the engine folder",
        "filesystem error",
        "storage migration paused",
      ]),
    create: () =>
      issueText(
        "errors.storageDriveTitle",
        "errors.storageDriveSummary",
        "errors.storageDriveTag",
        { actionLabel: t("errors.openStorageSettings"), action: "storage" },
      ),
  },
  {
    matches: (lower) =>
      hasAny(lower, [
        "download server is unavailable",
        "download server is temporarily unavailable",
        "download server rejected this file",
        "could not find the download server",
        "could not connect to the gamebanana download server",
        "connection to the download server",
        "download server closed the connection",
        "download process ended unexpectedly",
        "download was interrupted",
        "download was incomplete",
        "downloaded archive was incomplete",
        "complete temporary download after it completed",
      ]),
    create: DOWNLOAD_UNAVAILABLE,
  },
  {
    matches: (lower) =>
      lower.includes("exit code 22") || /\b(?:403|404)\b/.test(lower),
    create: DOWNLOAD_UNAVAILABLE,
  },
  {
    matches: (_lower, message) => isGoogleDriveQuotaError(message),
    create: () =>
      issueText(
        "errors.quotaExceededTitle",
        "errors.quotaExceededSummary",
        "errors.quotaExceededTag",
        { reportable: false },
      ),
  },
  {
    matches: (lower) =>
      hasAny(lower, [
        "mediafire:",
        "no se encuentra disponible en mediafire",
        "este archivo fue eliminado",
        "this mediafire link could not be opened",
        "this mediafire link is not supported",
      ]),
    create: DOWNLOAD_UNAVAILABLE,
  },
  {
    matches: (lower) =>
      hasAny(lower, [
        "already installed",
        "ya está instalado",
        "bereits installiert",
      ]),
    create: () =>
      issueText(
        "modModal.alreadyInstalled",
        "downloads.alreadyInstalled",
        "modModal.alreadyInstalled",
        { reportable: false },
      ),
  },
  {
    matches: (lower) =>
      hasAny(lower, [
        "download link is missing",
        "download link is invalid",
        "download does not have a valid link",
        "could not find the google drive file id",
        "does not point to a downloadable file",
      ]),
    create: () =>
      issueText(
        "errors.invalidLinkTitle",
        "errors.invalidLinkSummary",
        "errors.invalidLinkTag",
        { reportable: false },
      ),
  },
  {
    matches: (lower) =>
      hasAny(lower, [
        "cannot be unpacked by this version of macos",
        "bundled archive extractor",
      ]),
    create: () =>
      issueText(
        "errors.unpackTitle",
        "errors.unpackSummary",
        "errors.archiveProblemTag",
      ),
  },
  {
    matches: (lower) =>
      !hasAny(lower, [
        "end-of-central-directory signature not found",
        "cannot find zipfile directory",
      ]) &&
      hasAny(lower, ["extraction failed", "invalid archive", "archive file"]),
    create: () =>
      issueText(
        "errors.unpackTitle",
        "errors.unpackSummary",
        "errors.archiveProblemTag",
      ),
  },
  {
    matches: (lower) =>
      hasAny(lower, [
        "downloaded archive is empty",
        "downloaded archive did not contain any files",
      ]),
    create: () =>
      issueText(
        "errors.emptyDownloadTitle",
        "errors.emptyDownloadSummary",
        "errors.emptyDownloadTag",
        { reportable: false },
      ),
  },
  {
    matches: (lower) =>
      lower.includes("disk image does not contain a macos application"),
    create: () =>
      issueText(
        "errors.invalidMacInstallerTitle",
        "errors.invalidMacInstallerSummary",
        "errors.invalidMacInstallerTag",
      ),
  },
  {
    matches: (lower) =>
      hasAny(lower, [
        "web page instead of an archive",
        "end-of-central-directory signature not found",
        "cannot find zipfile directory",
      ]),
    create: () =>
      issueText(
        "errors.notZipTitle",
        "errors.notZipSummary",
        "errors.invalidDownloadFileTag",
      ),
  },
  {
    matches: (lower) => lower.includes("does not contain a runnable engine"),
    create: () => {
      const os = { Darwin: "macOS", Linux: "Linux" }[window.NL_OS] || "Windows";
      return issueText(
        "errors.unsupportedBuildTitle",
        "errors.unsupportedBuildSummary",
        "errors.unsupportedBuildTag",
        { summary: t("errors.unsupportedBuildSummary", { os }) },
      );
    },
  },
];

function describeIssue(error) {
  const message = getMessage(error);
  const lower = message.toLowerCase();
  const rule = ISSUE_RULES.find((candidate) =>
    candidate.matches(lower, message),
  );
  return rule
    ? rule.create(lower, message)
    : issueText(
        "errors.unexpectedTitle",
        "errors.unexpectedSummary",
        "errors.unexpectedTag",
      );
}

function createReport({
  error,
  action,
  item,
  version,
  storagePath,
  issue,
  locale,
  disks,
  network,
}) {
  return [
    "WeekBox support report",
    `Time: ${new Date().toLocaleString()}`,
    `OS: ${window.NL_OS || "Unknown"}`,
    `Neutralino: ${window.NL_CVERSION || "Unknown"}`,
    locale?.locale ? `Locale: ${locale.locale}` : null,
    disks
      ? `Disks: ${disks.count} (${disks.freeBytes} free / ${disks.totalBytes} total)`
      : null,
    network
      ? `Network interfaces: ${network.count} (${network.ipv4} IPv4 / ${network.ipv6} IPv6)`
      : null,
    `Action: ${action || "Unknown"}`,
    item ? `Item: ${item}` : null,
    version ? `Version: ${version}` : null,
    storagePath ? `Storage path: ${storagePath}` : null,
    `Issue: ${issue.tag}`,
    `What happened: ${issue.summary}`,
    formatDownloadDiagnostics(error),
    `Error: ${getDiagnosticErrorMessage(error)}`,
    `Stack trace:\n${getDiagnosticStackTrace(error)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function submitDiagnosticReport(context, issue) {
  const errorMessage = getDiagnosticErrorMessage(context.error);
  const stackTrace = getDiagnosticStackTrace(context.error);
  const downloadDiagnostics = getDownloadDiagnostics(context.error);
  const [operatingSystem, architecture, locale, disks, network] =
    await Promise.all([
      getOperatingSystem(),
      getArchitecture(),
      getLocaleInfo(),
      getDiskDiagnostics(),
      getNetworkDiagnostics(),
    ]);
  const response = await nativeFetch(DIAGNOSTIC_REPORT_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      appVersion: nonEmptyString(window.NL_APPVERSION),
      neutralinoVersion: nonEmptyString(window.NL_CVERSION),
      operatingSystem,
      architecture,
      locale,
      disks,
      network,
      action: context.action || issue.tag,
      item: context.item || "",
      version: context.version || "",
      storagePath: context.storagePath || "",
      issue: issue.tag,
      title: issue.title,
      summary: issue.summary,
      errorMessage,
      stackTrace,
      diagnostics: downloadDiagnostics
        ? { download: downloadDiagnostics }
        : null,
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
    modal.addEventListener("keydown", (event) => {
      if (event.key === "Escape") this.close();
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
    requestAnimationFrame(() => {
      modal.classList.add("show");
      activateCheckoutDialog(
        modal,
        modal.querySelector(".error-content"),
        modal.querySelector(".error-close"),
        () => this.close(),
      );
    });
  },

  close() {
    const modal = document.getElementById("weekbox-error-modal");
    if (!modal) return;
    deactivateCheckoutDialog(modal);
    modal.classList.remove("show");
    setTimeout(() => {
      modal.style.display = "none";
    }, 300);
  },
};
