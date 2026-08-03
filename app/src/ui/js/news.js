import { appEvents } from "../../backend/core/routing/events.service.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "./home/modal/dialogFocus.js";
import { sanitizeReleaseHtml } from "./engines/releaseNotes.js";

const NEWS_SITE_URL = "https://fnfweekbox.vercel.app";
const NEWS_FEED_URL = `${NEWS_SITE_URL}/api/news`;
const NEWS_CACHE_KEY = "weekbox_news_feed_v1";
const NEWS_REQUEST_TIMEOUT = 8000;

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>\"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );
}

function safeNewsUrl(value) {
  try {
    const url = new URL(String(value || "").trim(), NEWS_SITE_URL);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : "";
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

function renderNewsInline(value) {
  const tokens = [];
  const stash = (html) => {
    const token = `\0${tokens.length}\0`;
    tokens.push(html);
    return token;
  };
  let source = String(value || "");
  source = source.replace(
    /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (match, alt, url, title) => {
      const src = safeNewsUrl(url);
      return src
        ? stash(
            `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ""}>`,
          )
        : alt;
    },
  );
  source = source.replace(
    /\[([^\]]+)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g,
    (match, label, url, title) => {
      const href = safeNewsUrl(url);
      return href
        ? stash(
            `<a href="${escapeHtml(href)}"${title ? ` title="${escapeHtml(title)}"` : ""}>${escapeHtml(label)}</a>`,
          )
        : label;
    },
  );
  let html = escapeHtml(source);
  html = html.replace(/`([^`\n]+)`/g, (match, content) =>
    stash(`<code>${content}</code>`),
  );
  html = html.replace(/\*\*(.+?)\*\*|__(.+?)__/g, (match, strong, underscored) =>
    stash(`<strong>${strong || underscored}</strong>`),
  );
  html = html.replace(/~~(.+?)~~/g, (match, content) => stash(`<del>${content}</del>`));
  html = html.replace(/\*([^*\n]+)\*|_([^_\n]+)_/g, (match, italic, underscored) =>
    stash(`<em>${italic || underscored}</em>`),
  );
  return html.replace(/\0(\d+)\0/g, (match, index) => tokens[Number(index)] || "");
}

function renderNewsMarkdown(value) {
  const source = String(value || "").replace(/\r\n?/g, "\n");
  if (!source.trim()) return "";
  if (/<(?:p|h[1-6]|ul|ol|li|strong|em|a|blockquote|img|br|hr|pre|code)\b/i.test(source)) {
    return sanitizeReleaseHtml(source);
  }
  const lines = source.split("\n");
  const output = [];
  const paragraph = [];
  let listType = "";
  let codeLines = null;
  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${renderNewsInline(paragraph.join(" "))}</p>`);
    paragraph.length = 0;
  };
  const closeList = () => {
    if (listType) output.push(`</${listType}>`);
    listType = "";
  };
  for (const line of lines) {
    if (codeLines) {
      if (/^\s*```/.test(line)) {
        output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
        codeLines = null;
      } else {
        codeLines.push(line);
      }
      continue;
    }
    if (/^\s*```/.test(line)) {
      flushParagraph();
      closeList();
      codeLines = [];
      continue;
    }
    if (!line.trim()) {
      flushParagraph();
      closeList();
      continue;
    }
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (heading) {
      flushParagraph();
      closeList();
      output.push(
        `<h${heading[1].length}>${renderNewsInline(heading[2])}</h${heading[1].length}>`,
      );
      continue;
    }
    if (/^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) {
      flushParagraph();
      closeList();
      output.push("<hr>");
      continue;
    }
    const unordered = line.match(/^\s{0,3}[-*+]\s+(.+)$/);
    const ordered = line.match(/^\s{0,3}\d+[.]\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const nextListType = ordered ? "ol" : "ul";
      if (listType !== nextListType) {
        closeList();
        listType = nextListType;
        output.push(`<${listType}>`);
      }
      output.push(`<li>${renderNewsInline((ordered || unordered)[1])}</li>`);
      continue;
    }
    const quote = line.match(/^\s{0,3}>\s?(.*)$/);
    if (quote) {
      flushParagraph();
      closeList();
      output.push(`<blockquote><p>${renderNewsInline(quote[1])}</p></blockquote>`);
      continue;
    }
    closeList();
    paragraph.push(line.trim());
  }
  if (codeLines) output.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
  flushParagraph();
  closeList();
  return sanitizeReleaseHtml(output.join(""));
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
      modal.querySelector("#news-detail-close")?.addEventListener("click", () => this.closeModal());
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
    title.textContent = String(post.title || "News");
    meta.replaceChildren();
    const date = newsDate(post.publishedAt);
    if (date) meta.appendChild(Object.assign(document.createElement("span"), { textContent: date }));
    if (post.tags?.length) meta.appendChild(Object.assign(document.createElement("span"), { textContent: String(post.tags[0]) }));
    excerpt.textContent = String(post.excerpt || "");
    excerpt.hidden = !post.excerpt;
    body.textContent = post.excerpt || "Loading article…";
    link.href = newsLink(post);
    link.onclick = (event) => {
      event.preventDefault();
      Neutralino.os.open(link.href).catch(() => {});
    };
    const coverUrl = safeNewsUrl(post.coverUrl);
    image.hidden = !coverUrl;
    image.src = coverUrl;
    image.alt = post.title ? `${post.title} cover` : "";
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
      const response = await fetch(
        `${NEWS_SITE_URL}/api/news/${encodeURIComponent(String(post.slug))}`,
        { headers: { Accept: "application/json" }, signal: controller.signal },
      );
      if (!response.ok) throw new Error(`News post returned ${response.status}`);
      const payload = await response.json();
      if (!controller.signal.aborted && typeof payload?.body === "string") {
        body.innerHTML = renderNewsMarkdown(payload.body || post.excerpt || "");
      }
    } catch (error) {
      if (!controller.signal.aborted) {
        body.innerHTML = renderNewsMarkdown(
          post.excerpt || "This article could not be loaded.",
        );
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

  render(payload) {
    if (!this.grid) return;
    this.grid.replaceChildren();
    const posts = payload.posts.filter((post) => post && post.slug && post.title);
    if (!posts.length) {
      const empty = document.createElement("p");
      empty.className = "news-view__empty";
      empty.textContent = "No news yet.";
      this.grid.appendChild(empty);
      return;
    }
    for (const post of posts) {
      const card = document.createElement("button");
      card.type = "button";
      card.className = "news-view__card";
      card.setAttribute("aria-label", `Open ${post.title}`);
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
      }
      const body = document.createElement("div");
      body.className = "news-view__card-body";
      const meta = document.createElement("div");
      meta.className = "news-view__card-meta";
      const date = newsDate(post.publishedAt);
      if (date) meta.appendChild(Object.assign(document.createElement("span"), { textContent: date }));
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

  async load() {
    if (!this.grid || !this.status) return;
    const cached = this.readCache();
    if (cached) this.render(cached);
    else this.setStatus("Loading news…");
    this.request?.abort();
    const controller = new AbortController();
    this.request = controller;
    const timeout = setTimeout(() => controller.abort(), NEWS_REQUEST_TIMEOUT);
    if (this.refreshButton) this.refreshButton.disabled = true;
    try {
      const response = await fetch(NEWS_FEED_URL, {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
      if (!response.ok) throw new Error(`News feed returned ${response.status}`);
      const payload = await response.json();
      if (payload?.schemaVersion !== 1 || !Array.isArray(payload.posts)) {
        throw new Error("Unsupported news feed");
      }
      this.writeCache(payload);
      this.render(payload);
      this.setStatus("");
    } catch (error) {
      if (cached) {
        this.setStatus("Could not refresh news. Showing saved articles.", "error");
      } else {
        this.render({ posts: [] });
        this.setStatus(
          "News is unavailable right now. Check your connection and try again.",
          "error",
        );
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
  appEvents.addEventListener("view:loaded", (event) => {
    if (event.detail === "news") newsView.init();
    else newsView.destroy();
  });
}
