import { appEvents } from "../../backend/core/routing/events.service.js";
import { setupDropdown } from "../utils/components/dropdown.component.js";
import { enhanceContentLinks } from "./contentLinks.js";
import { modModal } from "./home/modal/index.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";
import { setModalBackdrop } from "./home/modal/modalBackdrop.js";
import { createLoadingState } from "./hourglass.js";
import { t } from "./i18n/index.js";
import {
  appendPostText,
  createNewsCard,
  createQuotePreview,
  openNewsExternal,
} from "./news/post-renderer.js";
import {
  appendVideoMedia,
  closeNewsMediaPreview,
  makeMediaPreviewable,
  stopModalVideos,
} from "./news/media-preview.js";
import { hasNewsContent, newsDate } from "./news/news-model.js";
import {
  fetchNewsPayload,
  fetchNewsSource,
  fetchPostDetails,
  mergePostDetails,
  NEWS_MAX_PAGES_PER_ACCOUNT,
  NEWS_PAGE_SIZE,
  NEWS_REQUEST_TIMEOUT,
  NEWS_SOURCES,
} from "./news/news-data.service.js";

const NEWS_SEEN_KEY = "weekbox_news_seen_v1";
const NEWS_HIDDEN_ACCOUNTS_KEY = "weekbox_news_hidden_accounts_v1";

function renderModalLoading(modal) {
  const image = modal.querySelector("#news-detail-image");
  const title = modal.querySelector("#news-detail-title");
  const meta = modal.querySelector("#news-detail-meta");
  const excerpt = modal.querySelector("#news-detail-excerpt");
  const body = modal.querySelector("#news-detail-body");
  stopModalVideos(modal);
  title.textContent = "";
  meta.replaceChildren();
  meta.className = "news-detail-modal__meta";
  excerpt.hidden = true;
  body.replaceChildren();
  const loading = document.createElement("p");
  loading.className = "news-detail-modal__post-text";
  loading.textContent = t("news.loadingArticle");
  body.appendChild(loading);
  image.hidden = true;
  setModalBackdrop(modal, "");
}

function handleNewsLoadError(view, error) {
  if (error?.name === "AbortError") return;
  view.render({ posts: [] });
  view.setStatus(t("news.unavailable"), "error");
  console.warn("WeekBox news feed unavailable", error);
}

export const newsView = {
  request: null,
  bodyRequest: null,
  modal: null,
  account: "",
  hiddenAccounts: new Set(),
  accountMeta: new Map(),
  availableSources: new Set(),
  posts: [],
  sessionLoaded: false,
  visibleCount: NEWS_PAGE_SIZE,
  sourcePages: new Map(),
  loadingMore: false,
  loadMoreFailed: false,
  loadMoreRequest: null,
  initialized: false,
  accountDropdownCtrl: null,
  accountClickHandler: null,
  infiniteObserver: null,
  scrollContainer: null,
  controls: null,
  accountSidebar: null,

  init() {
    const grid = document.querySelector("[data-news-grid]");
    if (this.initialized && this.grid === grid) return;
    this.grid = grid;
    this.status = document.querySelector("[data-news-status]");
    this.refreshButton = document.querySelector("[data-news-refresh]");
    this.controls = document.querySelector("[data-news-controls]");
    this.accountSidebar = document.querySelector("[data-news-account-sidebar]");
    if (!this.grid || !this.status) return;
    this.initialized = true;
    this.setControlsReady(false);
    this.readHiddenAccounts();
    this.setupAccountPicker();
    this.scrollContainer = this.grid.closest(".app-layout__content");
    this.infiniteObserver = new IntersectionObserver(
      (entries) => {
        if (
          entries.some((entry) => entry.isIntersecting) &&
          !this.loadMoreFailed
        ) {
          void this.loadMore();
        }
      },
      { root: this.scrollContainer || null, rootMargin: "600px" },
    );
    this.refreshButton?.addEventListener("click", () => void this.load());
    if (this.sessionLoaded) {
      this.visibleCount = NEWS_PAGE_SIZE;
      this.render({
        posts: this.posts,
        sourcePages: this.sourcePages,
        availableSources: this.availableSources,
      });
      this.setStatus("");
      this.setControlsReady(this.availableSources.size > 0);
      return;
    }
    void this.load();
  },

  destroy() {
    this.request?.abort();
    this.request = null;
    this.loadMoreRequest?.abort();
    this.loadMoreRequest = null;
    this.bodyRequest?.abort();
    this.bodyRequest = null;
    this.closeModal(false);
    this.infiniteObserver?.disconnect();
    this.infiniteObserver = null;
    if (this.accountClickHandler) {
      document.removeEventListener("click", this.accountClickHandler);
      this.accountClickHandler = null;
    }
    this.accountDropdownCtrl?.destroy?.();
    this.accountDropdownCtrl = null;
    this.grid = null;
    this.status = null;
    this.refreshButton = null;
    this.controls = null;
    this.accountSidebar = null;
    this.scrollContainer = null;
    this.initialized = false;
    this.loadingMore = false;
    this.loadMoreFailed = false;
  },

  setControlsReady(ready) {
    this.controls?.toggleAttribute("hidden", !ready);
    this.accountSidebar?.toggleAttribute("hidden", !ready);
  },

  setupAccountPicker() {
    const dropdown = document.getElementById("news-account-dropdown");
    const trigger = document.getElementById("news-account-trigger");
    if (!dropdown || !trigger) return;
    this.accountDropdownCtrl = setupDropdown(trigger, dropdown);
    this.accountClickHandler = (event) => {
      const visibility = event.target.closest(
        ".news-account-options .news-account-option__visibility",
      );
      if (visibility) {
        event.preventDefault();
        event.stopPropagation();
        this.toggleAccountVisibility(visibility.dataset.account);
        return;
      }
      const reset = event.target.closest(
        ".news-account-options .news-account-reset",
      );
      if (reset) {
        event.preventDefault();
        event.stopPropagation();
        this.account = "";
        this.accountDropdownCtrl?.close();
        this.visibleCount = NEWS_PAGE_SIZE;
        this.loadMoreFailed = false;
        this.renderAccountOptions();
        this.renderVisiblePosts();
        return;
      }
      const option = event.target.closest(
        ".news-account-options .news-account-option__select",
      );
      if (!option) return;
      this.account =
        this.account === option.dataset.account
          ? ""
          : option.dataset.account || "";
      this.accountDropdownCtrl?.close();
      this.visibleCount = NEWS_PAGE_SIZE;
      this.loadMoreFailed = false;
      this.renderAccountOptions();
      this.renderVisiblePosts();
    };
    document.addEventListener("click", this.accountClickHandler);
    this.renderAccountOptions();
  },

  readHiddenAccounts() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(NEWS_HIDDEN_ACCOUNTS_KEY) || "[]",
      );
      this.hiddenAccounts = new Set(
        Array.isArray(saved)
          ? saved.filter((value) => typeof value === "string")
          : [],
      );
    } catch {
      this.hiddenAccounts = new Set();
    }
  },

  writeHiddenAccounts() {
    try {
      localStorage.setItem(
        NEWS_HIDDEN_ACCOUNTS_KEY,
        JSON.stringify([...this.hiddenAccounts]),
      );
    } catch {}
  },

  toggleAccountVisibility(username) {
    if (!username) return;
    if (this.hiddenAccounts.has(username)) this.hiddenAccounts.delete(username);
    else this.hiddenAccounts.add(username);
    this.writeHiddenAccounts();
    this.renderAccountOptions();
    this.renderVisiblePosts();
  },

  getFilteredPosts() {
    return this.posts.filter(
      (post) =>
        (!this.account || post.username === this.account) &&
        (this.account || !this.hiddenAccounts.has(post.username)),
    );
  },

  renderAccountOptions() {
    const optionLists = document.querySelectorAll(".news-account-options");
    const trigger = document.getElementById("news-account-trigger");
    if (!optionLists.length || !trigger) return;
    if (this.account && !this.availableSources.has(this.account)) {
      this.account = "";
    }
    const accounts = NEWS_SOURCES.filter((source) =>
      this.availableSources.has(source.username),
    ).map((source) => ({
      ...source,
      ...this.accountMeta.get(source.username),
    }));
    optionLists.forEach((options) => {
      options.replaceChildren();
      if (this.account) {
        const reset = document.createElement("button");
        reset.className = "news-account-reset";
        reset.type = "button";
        reset.dataset.account = "";
        reset.textContent = "Show visible feeds";
        options.appendChild(reset);
      }
      accounts.forEach((account) => {
        const row = document.createElement("div");
        row.className = `news-account-option${this.account === account.username ? " selected" : ""}`;
        row.setAttribute("role", "option");
        row.setAttribute(
          "aria-selected",
          String(this.account === account.username),
        );
        const select = document.createElement("button");
        select.className = "news-account-option__select";
        select.type = "button";
        select.dataset.account = account.username;
        const avatar = document.createElement("span");
        avatar.className = "news-account-option__avatar";
        if (account.avatarUrl) {
          const image = document.createElement("img");
          image.src = account.avatarUrl;
          image.alt = "";
          avatar.appendChild(image);
        } else avatar.textContent = account.name.charAt(0);
        const text = document.createElement("span");
        text.className = "news-account-option__text";
        text.innerHTML = `<strong></strong><small></small>`;
        text.querySelector("strong").textContent = account.name;
        text.querySelector("small").textContent = `@${account.username}`;
        select.append(avatar, text);
        const visibility = document.createElement("button");
        visibility.className = "news-account-option__visibility";
        visibility.type = "button";
        visibility.dataset.account = account.username;
        const visible = !this.hiddenAccounts.has(account.username);
        visibility.setAttribute(
          "aria-label",
          `${visible ? "Hide" : "Show"} ${account.name}`,
        );
        visibility.setAttribute("aria-pressed", String(visible));
        visibility.innerHTML = `<i class="fa-solid fa-eye${visible ? "" : "-slash"}" aria-hidden="true"></i>`;
        row.append(select, visibility);
        options.appendChild(row);
      });
    });
    const selected = this.account
      ? accounts.find((account) => account.username === this.account)
      : null;
    const icon = trigger.querySelector(".news-account-trigger-icon");
    if (icon && selected?.avatarUrl) {
      const avatar = document.createElement("img");
      icon.className =
        "filter-engine-icon news-account-trigger-icon news-account-current-avatar";
      avatar.src = selected.avatarUrl;
      avatar.alt = "";
      icon.replaceChildren(avatar);
    } else if (icon) {
      icon.className = "filter-engine-icon news-account-trigger-icon";
      icon.innerHTML = selected
        ? '<i class="fa-solid fa-user" aria-hidden="true"></i>'
        : '<i class="fa-solid fa-users" aria-hidden="true"></i>';
    }
    const label = document.getElementById("news-account-selected");
    if (label) label.textContent = selected?.name || "News feeds";
  },

  async loadMore() {
    if (this.request || this.loadingMore) return;
    const filteredCount = this.getFilteredPosts().length;
    if (this.visibleCount < filteredCount) {
      this.visibleCount = Math.min(
        this.visibleCount + NEWS_PAGE_SIZE,
        filteredCount,
      );
      console.info(
        `[WeekBox News] Loading more posts: ${this.visibleCount}/${filteredCount}`,
      );
      this.renderVisiblePosts();
      return;
    }
    const pages = [...this.sourcePages.entries()].filter(
      ([username, page]) =>
        (!this.account || username === this.account) &&
        page.cursor &&
        page.page < NEWS_MAX_PAGES_PER_ACCOUNT,
    );
    if (!pages.length) {
      console.info("[WeekBox News] No older FxTwitter cursors available");
      return;
    }
    this.loadingMore = true;
    this.loadMoreFailed = false;
    this.setLoadMoreIndicator(true, true);
    const controller = new AbortController();
    this.loadMoreRequest = controller;
    const timeout = setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT);
    try {
      const olderPosts = [];
      for (const [username, page] of pages) {
        try {
          const result = await fetchNewsSource(
            NEWS_SOURCES.find((source) => source.username === username),
            controller.signal,
            page,
          );
          olderPosts.push(...result.posts);
          this.sourcePages.set(username, {
            cursor:
              result.cursor && result.cursor !== page.cursor
                ? result.cursor
                : "",
            page: page.page + 1,
          });
        } catch (error) {
          if (error?.name === "AbortError") throw error;
          this.loadMoreFailed = true;
          console.warn(
            `[WeekBox News] ${username} older FxTwitter page unavailable`,
            error,
          );
        }
      }
      const merged = new Map(this.posts.map((post) => [post.id, post]));
      olderPosts.forEach((post) => merged.set(post.id, post));
      this.posts = [...merged.values()].sort(
        (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
      );
      if (olderPosts.length) this.visibleCount += NEWS_PAGE_SIZE;
      console.info(`[WeekBox News] Loaded ${olderPosts.length} older posts`);
      this.renderVisiblePosts();
    } catch (error) {
      if (error?.name !== "AbortError") {
        this.loadMoreFailed = true;
        console.warn("[WeekBox News] Loading older posts failed", error);
        this.renderVisiblePosts();
      }
    } finally {
      clearTimeout(timeout);
      this.loadingMore = false;
      if (this.loadMoreRequest === controller) this.loadMoreRequest = null;
    }
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

  renderModalPost(modal, post) {
    const image = modal.querySelector("#news-detail-image");
    const title = modal.querySelector("#news-detail-title");
    const meta = modal.querySelector("#news-detail-meta");
    const excerpt = modal.querySelector("#news-detail-excerpt");
    const body = modal.querySelector("#news-detail-body");
    title.textContent = post.authorName || post.sourceName;
    title.className = "visually-hidden";
    meta.replaceChildren();
    meta.className = "news-detail-modal__author";
    const avatar = document.createElement("img");
    avatar.src = post.avatarUrl || "";
    avatar.alt = "";
    avatar.hidden = !post.avatarUrl;
    meta.appendChild(avatar);
    const identity = document.createElement("span");
    identity.className = "news-detail-modal__identity";
    const name = document.createElement("strong");
    name.textContent = post.authorName || post.sourceName;
    const handle = document.createElement("span");
    handle.textContent = `@${post.username}`;
    identity.append(name, handle);
    meta.appendChild(identity);
    excerpt.hidden = true;
    stopModalVideos(modal);
    body.replaceChildren();
    if (post.text) {
      const text = document.createElement("p");
      text.className = "news-detail-modal__post-text";
      appendPostText(text, String(post.text).trimEnd());
      enhanceContentLinks(text, {
        loadGameBananaDetails: false,
        loadGameBananaTitle: true,
        onGameBanana: (submission) => modModal.openSubmission(submission),
      });
      body.appendChild(text);
    }
    if (post.quote) {
      body.appendChild(
        createQuotePreview(
          post.quote,
          true,
          post.quote.link ? () => openNewsExternal(post.quote.link) : null,
          (submission) => modModal.openSubmission(submission),
        ),
      );
    }
    const mediaGrid = document.createElement("div");
    const videos = post.videos || [];
    videos.forEach((media) =>
      appendVideoMedia(mediaGrid, media, post, openNewsExternal),
    );
    post.images.forEach((src) => {
      const cell = document.createElement("div");
      cell.className =
        "news-detail-modal__media-cell news-detail-modal__image-cell";
      const media = document.createElement("img");
      media.src = src;
      media.alt = "";
      media.loading = "lazy";
      makeMediaPreviewable(media, src, "image");
      cell.appendChild(media);
      mediaGrid.appendChild(cell);
    });
    const mediaCount = mediaGrid.childElementCount;
    mediaGrid.className = `news-detail-modal__media-grid news-detail-modal__media-grid--${mediaCount === 1 ? "single" : "collage"}`;
    if (mediaGrid.childElementCount) body.appendChild(mediaGrid);
    const timestamp = document.createElement("time");
    timestamp.className = "news-detail-modal__timestamp";
    timestamp.dateTime = new Date(post.publishedAt).toISOString();
    timestamp.textContent = newsDate(post.publishedAt);
    body.appendChild(timestamp);
    const stats = document.createElement("div");
    stats.className = "news-detail-modal__stats";
    for (const [label, value] of [
      ["Replies", post.stats?.replies],
      ["Reposts", post.stats?.reposts],
      ["Likes", post.stats?.likes],
      ["Quotes", post.stats?.quotes],
      ["Views", post.stats?.views],
    ]) {
      if (value === undefined || value === null) continue;
      const stat = document.createElement("span");
      stat.innerHTML = `<strong>${Number(value).toLocaleString()}</strong> ${label}`;
      stats.appendChild(stat);
    }
    if (stats.childElementCount) body.appendChild(stats);
    const original = document.createElement("a");
    original.href = post.link;
    original.rel = "noopener noreferrer";
    original.textContent = "Open original post on Twitter";
    original.addEventListener("click", (event) => {
      event.preventDefault();
      openNewsExternal(original.href);
    });
    body.appendChild(original);
    image.hidden = true;
    setModalBackdrop(modal, "");
  },

  open(post) {
    const modal = this.ensureModal();
    if (!modal) return;
    this.bodyRequest?.abort();
    const controller = new AbortController();
    this.bodyRequest = controller;
    renderModalLoading(modal);
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
    fetchPostDetails(post, controller.signal)
      .then((detail) => {
        if (
          !detail ||
          controller.signal.aborted ||
          this.bodyRequest !== controller
        )
          return;
        this.renderModalPost(modal, mergePostDetails(post, detail));
      })
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.warn("[WeekBox News] FxTwitter post detail unavailable", {
          postId: post.id,
          error,
        });
      });
  },

  closeModal(restoreFocus = true) {
    this.bodyRequest?.abort();
    this.bodyRequest = null;
    const modal = this.modal;
    if (!modal) return;
    closeNewsMediaPreview();
    stopModalVideos(modal);
    deactivateCheckoutDialog(modal, restoreFocus);
    modal.classList.remove("show");
    setTimeout(() => {
      if (!modal.classList.contains("show")) modal.style.display = "none";
    }, 260);
  },

  setStatus(message, state = "") {
    if (!this.status) return;
    this.status.textContent = message;
    this.status.dataset.state = state;
  },

  setLoading() {
    if (!this.grid) return;
    this.grid.replaceChildren(
      createLoadingState(t("news.loading"), 32, "news-view__loading"),
    );
    this.setStatus(t("news.loading"));
  },

  updateUnreadBadge(posts) {
    const badge = document.getElementById("newsletter-unread");
    const validPosts = (Array.isArray(posts) ? posts : []).filter(
      (post) => post && post.id && post.text,
    );
    if (!badge) return;
    if (!validPosts.length) {
      badge.textContent = "";
      badge.hidden = true;
      return;
    }

    let seenId = "";
    try {
      seenId = localStorage.getItem(NEWS_SEEN_KEY) || "";
      if (!seenId) {
        localStorage.setItem(NEWS_SEEN_KEY, String(validPosts[0].id));
        badge.hidden = true;
        return;
      }
    } catch {
      badge.hidden = true;
      return;
    }

    const unread = validPosts.findIndex((post) => String(post.id) === seenId);
    const count = unread < 0 ? validPosts.length : unread;
    badge.textContent = count > 99 ? "99+" : String(count);
    badge.hidden = count === 0;
  },

  markNewsRead(posts) {
    const firstPost = (Array.isArray(posts) ? posts : []).find(
      (post) => post?.id,
    );
    if (!firstPost) return;
    try {
      localStorage.setItem(NEWS_SEEN_KEY, String(firstPost.id));
    } catch {}
    this.updateUnreadBadge(posts);
  },

  render(payload) {
    this.posts = payload.posts
      .filter(hasNewsContent)
      .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt));
    this.availableSources =
      payload.availableSources instanceof Set
        ? new Set(payload.availableSources)
        : new Set(payload.availableSources || []);
    this.accountMeta = new Map(
      this.posts.map((post) => [
        post.username,
        { name: post.sourceName, avatarUrl: post.avatarUrl },
      ]),
    );
    this.renderAccountOptions();
    this.sourcePages =
      payload.sourcePages instanceof Map
        ? payload.sourcePages
        : new Map(Object.entries(payload.sourcePages || {}));
    this.renderVisiblePosts();
  },

  renderVisiblePosts() {
    if (!this.grid) return;
    const filteredPosts = this.getFilteredPosts();
    const posts = filteredPosts.slice(0, this.visibleCount);
    console.info(`[WeekBox News] Rendering ${posts.length} visible posts`);

    for (const child of this.grid.children) {
      if (!child.classList.contains("news-view__card")) child.remove();
    }
    const existing = new Map(
      [...this.grid.querySelectorAll(":scope > .news-view__card")].map(
        (card) => [card.dataset.postId, card],
      ),
    );
    const visibleIds = new Set(posts.map((post) => post.id));
    const hasOlderPages = [...this.sourcePages.entries()].some(
      ([username, page]) =>
        (!this.account || username === this.account) &&
        page.cursor &&
        page.page < NEWS_MAX_PAGES_PER_ACCOUNT,
    );

    if (!posts.length) {
      this.grid.replaceChildren();
      const empty = document.createElement("p");
      empty.className = "news-view__empty";
      empty.textContent = t("news.noNews");
      this.grid.appendChild(empty);
      this.setLoadMoreIndicator(hasOlderPages);
      return;
    }

    let anchor = this.grid.firstElementChild;
    for (const [index, post] of posts.entries()) {
      const card =
        existing.get(post.id) ||
        createNewsCard(
          post,
          index,
          (selected) => this.open(selected),
          (submission) => modModal.openSubmission(submission),
        );
      card.style.setProperty("--card-index", String(Math.min(index, 7)));
      if (card !== anchor) this.grid.insertBefore(card, anchor);
      anchor = card.nextElementSibling;
    }
    for (const [id, card] of existing) {
      if (!visibleIds.has(id)) card.remove();
    }

    this.setLoadMoreIndicator(
      posts.length < filteredPosts.length || hasOlderPages,
    );
  },

  setLoadMoreIndicator(visible = false, loading = false) {
    const previous = this.grid?.querySelector(".news-view__load-sentinel");
    if (previous) {
      this.infiniteObserver?.unobserve(previous);
      previous.remove();
    }
    if (!visible || !this.grid) return;
    const sentinel = document.createElement("div");
    sentinel.className = "news-view__load-sentinel";
    sentinel.setAttribute("aria-live", "polite");
    const button = document.createElement("button");
    button.className = "news-view__load-more";
    button.type = "button";
    button.disabled = loading;
    button.textContent = t(loading ? "news.loadingMore" : "news.loadMore");
    button.addEventListener("click", () => {
      this.loadMoreFailed = false;
      void this.loadMore();
    });
    sentinel.appendChild(button);
    this.grid.appendChild(sentinel);
    this.infiniteObserver?.observe(sentinel);
  },

  async load() {
    if (!this.grid || !this.status) return;
    this.sessionLoaded = false;
    this.visibleCount = NEWS_PAGE_SIZE;
    this.posts = [];
    this.sourcePages = new Map();
    this.availableSources = new Set();
    this.accountMeta = new Map();
    this.loadMoreFailed = false;
    this.setControlsReady(false);
    this.setLoading();
    this.request?.abort();
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT);
    if (this.refreshButton) this.refreshButton.disabled = true;
    try {
      const payload = await fetchNewsPayload(controller.signal, (partial) => {
        if (this.request === controller) this.render(partial);
      });
      if (this.request !== controller) return;
      this.sessionLoaded = !payload.unavailable;
      this.updateUnreadBadge(payload.posts);
      this.render(payload);
      this.markNewsRead(payload.posts);
      this.setStatus(
        payload.unavailable ? t("news.unavailable") : "",
        payload.unavailable ? "error" : "",
      );
      this.setControlsReady(this.availableSources.size > 0);
    } catch (error) {
      if (this.request !== controller) return;
      handleNewsLoadError(this, error);
    } finally {
      clearTimeout(timeout);
      if (this.request === controller) this.request = null;
      if (this.refreshButton) this.refreshButton.disabled = false;
    }
  },
};

export function registerNewsView() {
  appEvents.addEventListener("view:loaded", (event) => {
    if (event.detail === "news") newsView.init();
    else newsView.destroy();
  });
}
