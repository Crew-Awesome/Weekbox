import { appEvents } from "../../backend/core/routing/events.service.js";
import { nativeFetch } from "../../backend/services/network/native-http.js";
import { enhanceContentLinks } from "./contentLinks.js";
import { Marked } from "marked";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";
import { setModalBackdrop } from "./home/modal/modalBackdrop.js";
import { modModal } from "./home/modal/index.js";
import { sanitizeReleaseHtml } from "./engines/releaseNotes.js";
import { t } from "./i18n/index.js";
import { applyDominantColor } from "../utils/media/extract-color.util.js";

const NEWS_SITE_URL = "https://fnfweekbox.vercel.app";
const NEWS_FEED_URL = `${NEWS_SITE_URL}/api/news`;
const NEWS_CACHE_KEY = "weekbox_news_feed_v1";
const NEWS_SEEN_KEY = "weekbox_news_seen_v1";
const NEWS_REQUEST_TIMEOUT = 8000;

function safeNewsUrl(value) {
  try {
    const url = new URL(String(value || "").trim(), NEWS_SITE_URL);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function newsDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function newsLink(post) {
  return `${NEWS_SITE_URL}/news/${encodeURIComponent(String(post.slug || ""))}`;
}

const newsMarkdown = new Marked({ gfm: true, breaks: false });

function renderNewsMarkdown(value) {
  const source = String(value || "").replace(/\r\n?/g, "\n");
  if (!source.trim()) return "";
  const html = newsMarkdown.parse(source, {
    walkTokens(token) {
      if (token.type !== "link" && token.type !== "image") return;
      token.href = token.href ? safeNewsUrl(token.href) : "";
    },
  });
  return sanitizeReleaseHtml(html);
}

export const newsView = {
  request: null,
  detailRequest: null,
  modal: null,

  init() {
    this.grid = document.querySelector("[data-news-grid]");
    this.status = document.querySelector("[data-news-status]");
    this.refreshButton = document.querySelector("[data-news-refresh]");
    if (!this.grid || !this.status) return;
    this.ensureModal();
    this.refreshButton?.addEventListener("click", () => void this.load());
    void this.load();
  },

  destroy() {
    this.request?.abort();
    this.detailRequest?.abort();
    this.request = null;
    this.detailRequest = null;
    this.closeModal(false);
    this.grid = null;
    this.status = null;
    this.refreshButton = null;
  },

  ensureModal() {
    let modal = document.getElementById("news-detail-modal");
    if (!modal) {
      const tpl = document.getElementById("tpl-news-modal");
      if (!tpl) return null;
      const wrapper = document.createElement("div");
      wrapper.innerHTML = tpl.innerHTML;
      modal = wrapper.firstElementChild;
      if (!modal) return null;
      document.body.appendChild(modal);
      modal
        .querySelector("#news-detail-close")
        ?.addEventListener("click", () => this.closeModal());
      modal.addEventListener("click", (event) => {
        if (event.target === modal) this.closeModal();
      });
    }
    this.modal = modal;
    return modal;
  },

  async open(post) {
    const modal = this.ensureModal();
    if (!modal) return;
    this.detailRequest?.abort();
    const image = modal.querySelector("#news-detail-image");
    const title = modal.querySelector("#news-detail-title");
    const meta = modal.querySelector("#news-detail-meta");
    const excerpt = modal.querySelector("#news-detail-excerpt");
    const body = modal.querySelector("#news-detail-body");
    const link = modal.querySelector("#news-detail-link");
    const renderBody = (value) => {
      body.innerHTML = renderNewsMarkdown(value);
      enhanceContentLinks(body, {
        onGameBanana: (submission) => modModal.openSubmission(submission),
      });
    };
    title.textContent = String(post.title || t("nav.news"));
    meta.replaceChildren();
    const date = newsDate(post.publishedAt);
    if (date)
      meta.appendChild(
        Object.assign(document.createElement("span"), { textContent: date }),
      );
    if (post.tags?.length)
      meta.appendChild(
        Object.assign(document.createElement("span"), {
          textContent: String(post.tags[0]),
        }),
      );
    excerpt.textContent = String(post.excerpt || "");
    excerpt.hidden = !post.excerpt;
    body.textContent = post.excerpt || t("news.loadingArticle");
    link.href = newsLink(post);
    link.onclick = (event) => {
      event.preventDefault();
      Neutralino.os.open(link.href).catch(() => {});
    };
    const coverUrl = safeNewsUrl(post.coverUrl);
    modal.style.setProperty("--card-color", "rgba(255, 255, 255, 0.08)");
    modal.style.setProperty("--news-accent", "var(--primary)");
    image.hidden = !coverUrl;
    image.src = coverUrl;
    image.alt = post.title ? `${post.title} cover` : "";
    setModalBackdrop(modal, coverUrl);
    if (coverUrl) {
      const colorProbe = new Image();
      colorProbe.crossOrigin = "anonymous";
      colorProbe.src = coverUrl;
      applyDominantColor(colorProbe, modal, {
        alpha: 0.2,
        fallback: "rgba(255, 255, 255, 0.08)",
        accentVar: "--news-accent",
      });
    }
    modal.style.display = "flex";
    requestAnimationFrame(() => {
      modal.classList.add("show");
      activateCheckoutDialog(
        modal,
        modal.querySelector(".news-detail-modal__body"),
        modal.querySelector("#news-detail-close"),
        () => this.closeModal(),
      );
    });
    const controller = new AbortController();
    this.detailRequest = controller;
    const timeout = setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT);
    try {
      const response = await nativeFetch(
        `${NEWS_SITE_URL}/api/news/${encodeURIComponent(String(post.slug))}`,
        { headers: { Accept: "application/json" }, signal: controller.signal },
      );
      if (!response.ok)
        throw new Error(`News post returned ${response.status}`);
      const payload = await response.json();
      if (!controller.signal.aborted && typeof payload?.body === "string") {
        renderBody(payload.body || post.excerpt || "");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        renderBody(post.excerpt || t("news.articleUnavailable"));
      }
    } finally {
      clearTimeout(timeout);
      if (this.detailRequest === controller) this.detailRequest = null;
    }
  },

  closeModal(restoreFocus = true) {
    const modal = this.modal;
    if (!modal) return;
    this.detailRequest?.abort();
    this.detailRequest = null;
    deactivateCheckoutDialog(modal, restoreFocus);
    modal.classList.remove("show");
    setTimeout(() => {
      if (!modal.classList.contains("show")) modal.style.display = "none";
    }, 300);
  },

  setStatus(message, state = "") {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.dataset.state = state;
  },

  readCache() {
    try {
      const cached = JSON.parse(localStorage.getItem(NEWS_CACHE_KEY) || "null");
      return Array.isArray(cached?.posts) ? cached : null;
    } catch {
      return null;
    }
  },

  writeCache(payload) {
    try {
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Storage can be unavailable in a locked-down webview; the feed still works.
    }
  },

  updateUnreadBadge(posts) {
    const badge = document.getElementById("newsletter-unread");
    const validPosts = (Array.isArray(posts) ? posts : []).filter(
      (post) => post && post.slug && post.title,
    );
    if (!badge || !validPosts.length) return;

    let seenSlug = "";
    try {
      seenSlug = localStorage.getItem(NEWS_SEEN_KEY) || "";
      if (!seenSlug) {
        localStorage.setItem(NEWS_SEEN_KEY, String(validPosts[0].slug));
        badge.hidden = true;
        return;
      }
    } catch {
      badge.hidden = true;
      return;
    }

    const unread = validPosts.findIndex(
      (post) => String(post.slug) === seenSlug,
    );
    const count = unread < 0 ? validPosts.length : unread;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  },

  markNewsRead(posts) {
    const firstPost = (Array.isArray(posts) ? posts : []).find(
      (post) => post?.slug,
    );
    if (!firstPost) return;
    try {
      localStorage.setItem(NEWS_SEEN_KEY, String(firstPost.slug));
    } catch {}
    this.updateUnreadBadge(posts);
  },

  render(payload) {
    if (!this.grid) return;
    this.grid.replaceChildren();
    const posts = payload.posts.filter(
      (post) => post && post.slug && post.title,
    );
    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "news-view__empty";
      empty.textContent = t("news.noNews");
      this.grid.appendChild(empty);
      return;
    }
    for (const post of posts) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "news-view__card";
      card.setAttribute(
        "aria-label",
        t("news.openArticle", { title: post.title }),
      );
      card.addEventListener("click", () => void this.open(post));
      const coverUrl = safeNewsUrl(post.coverUrl);
      if (coverUrl) {
        const image = document.createElement("img");
        image.className = "news-view__card-image";
        image.src = coverUrl;
        image.alt = "";
        image.loading = "lazy";
        image.addEventListener("error", () => image.remove(), { once: true });
        card.appendChild(image);

        const colorProbe = new Image();
        colorProbe.crossOrigin = "anonymous";
        colorProbe.src = coverUrl;
        applyDominantColor(colorProbe, card, {
          alpha: 0.28,
          fallback: "rgba(255, 255, 255, 0.08)",
          accentVar: "--news-accent",
        });
      }
      const body = document.createElement("div");
      body.className = "news-view__card-body";
      const meta = document.createElement("div");
      meta.className = "news-view__card-meta";
      const date = newsDate(post.publishedAt);
      if (date)
        meta.appendChild(
          Object.assign(document.createElement("span"), { textContent: date }),
        );
      if (post.tags?.[0]) {
        meta.appendChild(
          Object.assign(document.createElement("span"), {
            className: "news-view__card-tag",
            textContent: String(post.tags[0]),
          }),
        );
      }
      body.appendChild(meta);
      body.appendChild(
        Object.assign(document.createElement("h2"), {
          className: "news-view__card-title",
          textContent: String(post.title),
        }),
      );
      if (post.excerpt) {
        body.appendChild(
          Object.assign(document.createElement("p"), {
            className: "news-view__card-excerpt",
            textContent: String(post.excerpt),
          }),
        );
      }
      card.appendChild(body);
      this.grid.appendChild(card);
    }
  },

  async load({ badgeOnly = false } = {}) {
    if (!badgeOnly && (!this.grid || !this.status)) return;
    const cached = this.readCache();
    if (cached) {
      this.updateUnreadBadge(cached.posts);
      if (!badgeOnly) {
        this.render(cached);
        this.markNewsRead(cached.posts);
      }
    } else if (!badgeOnly) this.setStatus(t("news.loading"));
    this.request?.abort();
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT);
    if (this.refreshButton) this.refreshButton.disabled = true;
    try {
      const response = await nativeFetch(NEWS_FEED_URL, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`News feed returned ${response.status}`);
      const payload = await response.json();
      if (payload?.schemaVersion !== 1 || !Array.isArray(payload.posts)) {
        throw new Error("Unsupported news feed");
      }
      this.writeCache(payload);
      this.updateUnreadBadge(payload.posts);
      if (!badgeOnly) {
        this.render(payload);
        this.markNewsRead(payload.posts);
        this.setStatus("");
      }
    } catch (error) {
      if (badgeOnly) {
        console.warn("WeekBox news badge unavailable", error);
      } else if (cached) {
        this.setStatus(t("news.refreshFailedCached"), "error");
      } else {
        this.render({ posts: [] });
        this.setStatus(t("news.unavailable"), "error");
      }
      console.warn("WeekBox news feed unavailable", error);
    } finally {
      clearTimeout(timeout);
      if (this.request === controller) this.request = null;
      if (this.refreshButton) this.refreshButton.disabled = false;
    }
  },
};

export function registerNewsView() {
  appEvents.addEventListener("news:refresh-badge", () =>
    void newsView.load({ badgeOnly: true }),
  );
  appEvents.addEventListener("view:loaded", (event) => {
    if (event.detail === "news") newsView.init();
    else newsView.destroy();
  });
}
