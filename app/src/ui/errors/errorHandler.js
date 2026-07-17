function getMessage(error) {
  return String(error?.message || error || "An unexpected error occurred");
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
        "WeekBox did not download anything. Check your Windows date and time, then try a different network or temporarily disable HTTPS scanning in antivirus software. A proxy, VPN, or blocked certificate-revocation service can cause this error.",
      tag: "Windows certificate check",
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
