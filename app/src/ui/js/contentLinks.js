import { modCatalogService } from "../../backend/services/mod-catalog.service.js";
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
  return modCatalogService.parseSubmissionUrl(url);
}

function openExternal(url) {
  return Neutralino.os.open(url).catch(() => {});
}

function getProviderName(kind) {
  return (
    {
      peo: t("home.psychOnline"),
      backstage: "FunkinBackstage",
      gamejolt: "GameJolt",
    }[kind] || "mod service"
  );
}

function setPillLabel(pill, label, title) {
  pill.querySelector("span").textContent = label;
  pill.title = title;
  pill.setAttribute("aria-label", title);
}

function createSubmissionPill(
  link,
  recognized,
  onGameBanana,
  onProviderMod,
  loadGameBananaDetails,
) {
  const originalLabel =
    link.textContent.trim() || link.querySelector("img")?.alt.trim() || "";
  const pill = document.createElement("button");
  pill.type = "button";
  pill.className = "modal-description-submission-link";
  pill.dataset.provider = recognized.kind;
  if (
    (recognized.kind === "gamebanana" && onGameBanana) ||
    (recognized.modId && onProviderMod)
  ) {
    pill.setAttribute("aria-haspopup", "dialog");
  }

  const icon = document.createElement("img");
  icon.src = {
    gamebanana: "assets/icons/gamebanana.png",
    peo: "assets/icons/psychonline.png",
    backstage: "assets/icons/backstage.png",
    gamejolt: "assets/icons/gamejolt.png",
  }[recognized.kind];
  icon.alt = "";

  const label = document.createElement("span");
  pill.append(icon, label);

  if (recognized.kind === "gamebanana") {
    const label = loadGameBananaDetails
      ? t("modModal.loadingGameBananaDetails")
      : originalLabel || t("modModal.gameBananaSubmission");
    setPillLabel(pill, label, label);
  } else {
    const providerName = getProviderName(recognized.kind);
    const title = originalLabel || providerName;
    setPillLabel(pill, title, `Open ${title} in WeekBox (${providerName})`);
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
    if (recognized.modId && onProviderMod) {
      Promise.resolve(onProviderMod(recognized.modId)).catch((error) =>
        console.warn("Could not open provider mod reference", error),
      );
      return;
    }
    void openExternal(link.href);
  });

  return { pill, originalLabel };
}

export function enhanceContentLinks(
  container,
  {
    onGameBanana,
    onProviderMod,
    loadGameBananaDetails = true,
    loadGameBananaTitle = false,
  } = {},
) {
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
      onProviderMod,
      loadGameBananaDetails,
    );
    link.replaceWith(pill);

    if (recognized.kind !== "gamebanana") {
      if (recognized.modId) {
        modCatalogService
          .getModDetails(recognized.modId)
          .then((details) => {
            if (!isCurrent() || !details?.title) return;
            const title = details.title;
            setPillLabel(
              pill,
              title,
              `Open ${title} in WeekBox (${getProviderName(recognized.kind)})`,
            );
          })
          .catch(() => {});
      }
      return;
    }
    if (!loadGameBananaDetails && !loadGameBananaTitle) return;
    const { submission } = recognized;
    const getDetails = modCatalogService.getSubmissionDetails(submission, {
      loadDetails: loadGameBananaDetails,
      loadTitle: loadGameBananaTitle,
    });
    getDetails
      .then((details) => {
        if (!isCurrent()) return;
        const title =
          details?.title || originalLabel || t("modModal.gameBananaSubmission");
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
