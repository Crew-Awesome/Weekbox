import { nativeFetch } from "../../../backend/services/network/native-http.js";
import { appEvents } from "../../../backend/core/routing/events.service.js";
import { modCatalogService } from "../../../backend/services/mod-catalog.service.js";
import { t } from "../i18n/index.js";
import { modModal } from "../home/modal/index.js";

const API_BASE_URL = "https://weekbox-events-api.lefehanims.workers.dev";
const dialogClosePromises = new WeakMap();

function safeImageUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
}

function prettyDate(value) {
  if (!value) return t("events.unknownDate");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return t("events.unknownDate");
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

async function openModLink(url) {
  let source;
  try {
    source = modCatalogService.parseSubmissionUrl(url);
  } catch {}
  const isGameBananaSubmission =
    source?.kind === "gamebanana" && source.submission;
  if (!isGameBananaSubmission && !source?.modId) return false;

  const eventDialog = document.querySelector("[data-events-dialog]");
  const returnToEvent = eventDialog?.open
    ? () => {
        if (eventDialog.isConnected && !eventDialog.open)
          eventDialog.showModal();
      }
    : null;
  if (returnToEvent) await closeEventsDialog(eventDialog);

  if (isGameBananaSubmission) {
    void modModal.openSubmission(source.submission, { onClosed: returnToEvent });
  } else {
    void modModal.open(source.modId, { onClosed: returnToEvent });
  }
  return true;
}

async function getJson(path, signal) {
  const response = await nativeFetch(`${API_BASE_URL}${path}`, { signal });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(
      body?.error?.message || `Request failed (${response.status})`,
    );
  }
  return body;
}

function setStatus(element, message, state = "") {
  if (!element) return;
  element.textContent = message;
  element.dataset.state = state;
}

function closeEventsDialog(dialog) {
  if (!dialog?.open) return Promise.resolve();
  const activeClose = dialogClosePromises.get(dialog);
  if (activeClose) return activeClose;

  const closing = (async () => {
    dialog.dataset.closing = "";
    const animations = dialog
      .getAnimations()
      .filter((animation) =>
        ["opacity", "transform"].includes(animation.transitionProperty),
      );
    await Promise.allSettled(animations.map((animation) => animation.finished));
    if (dialog.open) dialog.close();
    dialog.removeAttribute("data-closing");
  })();
  dialogClosePromises.set(dialog, closing);
  return closing.finally(() => dialogClosePromises.delete(dialog));
}

function createEventCard(event, onSelect) {
  const card = document.createElement("button");
  card.type = "button";
  card.className = "events-card";
  card.setAttribute(
    "aria-label",
    `${event.name}, ${t(`events.status.${event.status}`) || event.status}`,
  );

  const media = document.createElement("span");
  media.className = "events-card__media";
  const imageUrl = safeImageUrl(event.bannerUrl);
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.onerror = () => image.remove();
    media.appendChild(image);
  } else {
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-calendar-days";
    icon.setAttribute("aria-hidden", "true");
    media.appendChild(icon);
  }

  const details = document.createElement("span");
  details.className = "events-card__details";
  const name = document.createElement("strong");
  name.className = "events-card__name";
  name.textContent = event.name;
  const date = document.createElement("span");
  date.className = "events-card__date";
  date.textContent = prettyDate(event.startsAt);
  const status = document.createElement("span");
  status.className = `events-card__status events-card__status--${event.status}`;
  status.textContent = t(`events.status.${event.status}`) || event.status;
  details.append(name, date, status);
  card.append(media, details);
  card.addEventListener("click", () => onSelect(event));
  return card;
}

function createModCard(mod) {
  if (mod.revealed === false) {
    const card = document.createElement("article");
    card.className = "events-mod-card";
    card.classList.add("events-mod-card--hidden");
    card.setAttribute("aria-label", t("events.unrevealedMod"));
    const question = document.createElement("span");
    question.className = "events-mod-card__question";
    question.textContent = "???";
    card.appendChild(question);
    return card;
  }

  const externalUrl = safeImageUrl(mod.externalUrl);
  const card = document.createElement(externalUrl ? "a" : "article");
  card.className = "events-mod-card";
  if (externalUrl) {
    card.classList.add("events-mod-card--link");
    card.href = externalUrl;
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    card.addEventListener("click", async (event) => {
      event.preventDefault();
      if (await openModLink(externalUrl)) return;
      if (typeof Neutralino !== "undefined" && Neutralino.os?.open) {
        void Neutralino.os.open(externalUrl);
      } else {
        window.open(externalUrl, "_blank", "noopener,noreferrer");
      }
    });
  }

  const imageUrl = safeImageUrl(mod.artworkUrl);
  const media = document.createElement("div");
  media.className = "events-mod-card__media";
  if (imageUrl) {
    const image = document.createElement("img");
    image.src = imageUrl;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    image.onerror = () => image.remove();
    media.appendChild(image);
  } else {
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-music";
    icon.setAttribute("aria-hidden", "true");
    media.appendChild(icon);
  }

  const title = document.createElement("h3");
  title.className = "events-mod-card__title";
  title.textContent = mod.title;
  card.append(media, title);
  return card;
}

export const eventsView = {
  initialized: false,
  init() {
    if (this.initialized) return;
    this.initialized = true;
    appEvents.addEventListener("view:loaded", (event) => {
      if (event.detail === "events") void this.loadEvents();
    });
  },

  async loadEvents() {
    const grid = document.querySelector("[data-events-grid]");
    if (!grid) return;
    this.listController?.abort();
    const controller = new AbortController();
    this.listController = controller;
    grid.setAttribute("aria-busy", "true");
    grid.replaceChildren();
    setStatus(
      document.querySelector("[data-events-status]"),
      t("events.loading"),
    );
    try {
      const result = await getJson(
        "/api/v1/events",
        controller.signal,
      );
      if (!grid.isConnected || this.listController !== controller) return;
      const events = Array.isArray(result.data) ? result.data : [];
      grid.replaceChildren(
        ...events.map((event) =>
          createEventCard(event, (selected) => this.openEvent(selected)),
        ),
      );
      setStatus(
        document.querySelector("[data-events-status]"),
        events.length ? "" : t("events.publicEmpty"),
        events.length ? "" : "empty",
      );
    } catch (error) {
      if (
        error?.name === "AbortError" ||
        !grid.isConnected ||
        this.listController !== controller
      )
        return;
      console.error("[WeekBox] Could not load events", error);
      setStatus(
        document.querySelector("[data-events-status]"),
        t("events.loadError"),
        "error",
      );
    } finally {
      if (grid.isConnected && this.listController === controller)
        grid.setAttribute("aria-busy", "false");
    }
  },

  async openEvent(event) {
    const dialog = document.querySelector("[data-events-dialog]");
    const banner = dialog?.querySelector("[data-events-banner]");
    const title = dialog?.querySelector("[data-events-title]");
    const description = dialog?.querySelector("[data-events-description]");
    const status = dialog?.querySelector("[data-events-modal-status]");
    const grid = dialog?.querySelector("[data-events-mods-grid]");
    if (!dialog || !banner || !grid || !title || !description || !status)
      return;

    title.textContent = event.name;
    const bannerUrl = safeImageUrl(event.bannerUrl);
    banner.hidden = true;
    banner.removeAttribute("src");
    banner.dataset.sourceUrl = bannerUrl;
    if (bannerUrl) {
      banner.onload = () => {
        if (banner.dataset.sourceUrl === bannerUrl) banner.hidden = false;
      };
      banner.onerror = () => {
        if (banner.dataset.sourceUrl === bannerUrl) banner.hidden = true;
      };
      banner.src = bannerUrl;
    }
    description.textContent = event.description || "";
    grid.replaceChildren();
    grid.setAttribute("aria-busy", "true");
    setStatus(status, t("events.loadingMods"));
    if (!dialog.open) dialog.showModal();

    this.modsController?.abort();
    const controller = new AbortController();
    this.modsController = controller;
    try {
      const result = await getJson(
        `/api/v1/events/${encodeURIComponent(event.id)}/mods?includeHiddenSlots=true`,
        controller.signal,
      );
      if (!dialog.open || this.modsController !== controller) return;
      const mods = Array.isArray(result.data) ? result.data : [];
      grid.replaceChildren(...mods.map(createModCard));
      setStatus(status, mods.length ? "" : t("events.noMods"));
    } catch (error) {
      if (
        error?.name === "AbortError" ||
        !dialog.open ||
        this.modsController !== controller
      )
        return;
      console.error("[WeekBox] Could not load event mods", error);
      setStatus(status, t("events.modsLoadError"), "error");
    } finally {
      if (dialog.open && this.modsController === controller)
        grid.setAttribute("aria-busy", "false");
    }
  },

  setupControls() {
    document
      .querySelector("[data-events-refresh]")
      ?.addEventListener("click", () => {
        void this.loadEvents();
      });
    const dialog = document.querySelector("[data-events-dialog]");
    if (dialog) {
      dialog
        .querySelector("[data-events-close]")
        ?.addEventListener("click", () => void closeEventsDialog(dialog));
      dialog.addEventListener("cancel", (event) => {
        event.preventDefault();
        void closeEventsDialog(dialog);
      });
      const isOutsideDialog = (event) => {
        const rect = dialog.getBoundingClientRect();
        return (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        );
      };
      let pressedOutside = false;
      dialog.addEventListener("pointerdown", (event) => {
        pressedOutside = isOutsideDialog(event);
      });
      dialog.addEventListener("pointerup", (event) => {
        if (pressedOutside && isOutsideDialog(event))
          void closeEventsDialog(dialog);
        pressedOutside = false;
      });
      dialog.addEventListener("pointercancel", () => {
        pressedOutside = false;
      });
    }
  },
};

eventsView.init();
appEvents.addEventListener("view:loaded", (event) => {
  if (event.detail === "events") eventsView.setupControls();
});
