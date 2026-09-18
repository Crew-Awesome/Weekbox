import { Marked } from "marked";
import { appSettings } from "../../../backend/core/system/settings.service.js";
import { t } from "../i18n/index.js";
import { sanitizeReleaseHtml } from "../engines/releaseNotes.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";

const CHANGELOG_URL = "dist/CHANGELOG.md";
const changelogMarkdown = new Marked({ gfm: true, breaks: false });

function normalizeVersion(value) {
  return String(value || "")
    .trim()
    .replace(/^v/i, "");
}

function findRelease(markdown, version) {
  const lines = String(markdown || "")
    .replace(/\r\n?/g, "\n")
    .split("\n");
  const target = normalizeVersion(version);
  let start = -1;
  let date = "";
  for (const [index, line] of lines.entries()) {
    const match = line.match(/^## \[([^\]]+)](?:\s*-\s*(.+))?\s*$/);
    if (match && normalizeVersion(match[1]) === target) {
      start = index + 1;
      date = match[2]?.trim() || "";
      break;
    }
  }
  if (start < 0) return null;
  const end = lines.findIndex(
    (line, index) => index >= start && /^## \[/.test(line),
  );
  return {
    date,
    body: lines
      .slice(start, end < 0 ? lines.length : end)
      .join("\n")
      .trim(),
  };
}

function findLatestReleaseVersion(markdown) {
  const match = String(markdown || "").match(/^## \[([^\]]+)](?:\s*-|\s*$)/m);
  return normalizeVersion(match?.[1]);
}

function renderMarkdown(markdown) {
  return sanitizeReleaseHtml(changelogMarkdown.parse(markdown || ""));
}

async function readChangelog() {
  const response = await fetch(CHANGELOG_URL, { cache: "no-store" });
  if (!response.ok) throw new Error("Changelog returned " + response.status);
  return response.text();
}

async function getAppVersion(markdown) {
  const configured = normalizeVersion(globalThis.NL_APPVERSION);
  if (configured) return configured;
  try {
    const version = normalizeVersion(
      (await Neutralino.app.getConfig())?.version,
    );
    if (version) return version;
  } catch {}
  return findLatestReleaseVersion(markdown);
}

const whatsNewModal = {
  async showIfNeeded({ force = false } = {}) {
    const markdown = await readChangelog();
    const version = await getAppVersion(markdown);
    const release = findRelease(markdown, version);
    if (
      !release ||
      (!force && appSettings.get("lastSeenWhatsNewVersion") === version)
    )
      return false;
    appSettings.set("lastSeenWhatsNewVersion", version);

    const modal = document.createElement("div");
    modal.className = "modal-overlay news-detail-modal whats-new-modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "whats-new-title");
    modal.innerHTML = [
      '<div class="modal-content news-detail-modal__content whats-new-modal__content">',
      '  <article class="news-detail-modal__body" tabindex="-1">',
      '    <div class="news-detail-modal__meta whats-new-modal__meta"></div>',
      '    <h2 id="whats-new-title"></h2>',
      '    <div class="news-detail-modal__text markdown-body" id="whats-new-body"></div>',
      "  </article>",
      "</div>",
    ].join("\n");
    document.body.appendChild(modal);
    modal.querySelector("#whats-new-title").textContent = t("whatsNew.title", {
      version,
    });
    const meta = modal.querySelector(".whats-new-modal__meta");
    if (release.date) {
      const date = document.createElement("span");
      date.textContent = release.date;
      meta.appendChild(date);
    }
    modal.querySelector("#whats-new-body").innerHTML = renderMarkdown(
      release.body,
    );

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        deactivateCheckoutDialog(modal);
        modal.classList.remove("show");
        setTimeout(() => {
          modal.remove();
          resolve(true);
        }, 260);
      };
      modal.onclick = (event) => {
        if (event.target === modal) finish();
      };
      modal.style.display = "flex";
      requestAnimationFrame(() => {
        if (settled) return;
        modal.classList.add("show");
        activateCheckoutDialog(
          modal,
          modal.querySelector(".news-detail-modal__body"),
          modal.querySelector(".news-detail-modal__body"),
          finish,
        );
      });
    });
  },
};

export { whatsNewModal };
