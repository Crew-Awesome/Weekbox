import { gameBananaApi } from "../../backend/providers/gamebanana/gamebanana.provider.js";
import { t } from "./i18n/index.js";

const containerVersions = new WeakMap();

function safeHttpUrl(value) {
  try {
    const url = new URL(String(value || "").trim(), window.location.href);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function getRecognizedSubmission(url) {
  const gameBananaSubmission = gameBananaApi.getGameBananaSubmission(url);
  if (gameBananaSubmission) {
    return { kind: "gamebanana", submission: gameBananaSubmission };
  }

  const parsedUrl = new URL(url);
  if (
    /(?:^|\.)sniro\.boo$/i.test(parsedUrl.hostname) &&
    /^\/mod\/[^/]+(?:\/|$)/i.test(parsedUrl.pathname)
  ) {
    return { kind: "sniro" };
  }

  return null;
}

function openExternal(url) {
  return Neutralino.os.open(url).catch(() => {});
}

function setPillLabel(pill, label, title) {
  pill.querySelector("span").textContent = label;
  pill.title = title;
  pill.setAttribute("aria-label", title);
}

function createSubmissionPill(link, recognized, onGameBanana) {
  const originalLabel = link.textContent.trim();
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "modal-description-submission-link";

  const icon = document.createElement("img");
  icon.src =
    recognized.kind === "gamebanana"
      ? "https://images.gamebanana.com/static/img/banana.png"
      : "assets/icons/psychonline.png";
  icon.alt = "";

  const label = document.createElement("span");
  pill.append(icon, label);

  if (recognized.kind === "gamebanana") {
    setPillLabel(
      pill,
      t("modModal.loadingGameBananaDetails"),
      t("modModal.loadingGameBananaDetails"),
    );
  } else {
    const title = originalLabel || "Psych Online";
    setPillLabel(pill, title, t("modModal.openOnPsychOnline", { title }));
  }

  pill.addEventListener("click", () => {
    if (recognized.kind === "gamebanana" && onGameBanana) {
      Promise.resolve()
        .then(() => onGameBanana(recognized.submission, pill))
        .catch((error) =>
          console.warn("Could not open GameBanana submission reference", error),
        );
      return;
    }
    void openExternal(link.href);
  });

  return { pill, originalLabel };
}

export function enhanceContentLinks(container, { onGameBanana } = {}) {
  if (!container) return;
  const version = (containerVersions.get(container) || 0) + 1;
  containerVersions.set(container, version);
  const isCurrent = () =>
    container.isConnected && containerVersions.get(container) === version;

  container.querySelectorAll("a[href]").forEach((link) => {
    const url = safeHttpUrl(link.getAttribute("href"));
    if (!url) {
      link.removeAttribute("href");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      return;
    }
    link.href = url;

    const recognized = getRecognizedSubmission(url);
    if (!recognized) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        void openExternal(url);
      });
      return;
    }

    const { pill, originalLabel } = createSubmissionPill(
      link,
      recognized,
      onGameBanana,
    );
    link.replaceWith(pill);

    if (recognized.kind !== "gamebanana") return;
    const { submission } = recognized;
    const getDetails =
      submission.type === "tool"
        ? gameBananaApi.getToolDetails(submission.id, {
            requireDownload: false,
          })
        : gameBananaApi.getModDetails(submission.id, {
            includeRequirements: false,
          });
    getDetails
      .then((details) => {
        if (!isCurrent()) return;
        const kind = submission.type === "tool" ? "tool" : "mod";
        const title = details?.title || originalLabel || `GameBanana ${kind}`;
        setPillLabel(
          pill,
          title,
          t("modModal.openSubmissionDetails", { title }),
        );
      })
      .catch(() => {
        if (!isCurrent()) return;
        const label = originalLabel || t("modModal.gameBananaSubmission");
        setPillLabel(pill, label, t("modModal.openGameBananaSubmission"));
      });
  });
}
