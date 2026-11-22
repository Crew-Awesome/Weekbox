import { enhanceContentLinks } from "../contentLinks.js";
import {
  newsDate,
  normalizePostLink,
  toSafeExternalUrl,
  uniqueMediaUrls,
} from "./news-model.js";
import { createVideoThumbnail } from "./media-preview.js";
export function openNewsExternal(url) {
  if (typeof Neutralino !== "undefined" && Neutralino.os?.open) {
    void Neutralino.os.open(url).catch(() => {});
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export function appendPostText(root, value) {
  const pattern =
    /((?:https?:\/\/|www\.)[^\s]+|(?:[\w-]+\.)+(?:com|org|net|io|video)\/[^\s]+|(?<![\w])@\/?[A-Za-z0-9_]{1,15})/gi;
  let cursor = 0;
  for (const match of String(value || "").matchAll(pattern)) {
    const start = match.index;
    const raw = match[0];
    const trailing = raw.match(/[.,!?;:)\]]+$/)?.[0] || "";
    const visibleUrl = trailing ? raw.slice(0, -trailing.length) : raw;
    root.append(document.createTextNode(String(value).slice(cursor, start)));
    const mention = visibleUrl.match(/^@\/?([A-Za-z0-9_]{1,15})$/);
    const href = mention
      ? `https://x.com/${mention[1]}`
      : toSafeExternalUrl(
          visibleUrl.startsWith("http") ? visibleUrl : `https://${visibleUrl}`,
        );
    if (href) {
      const link = document.createElement("a");
      link.href = normalizePostLink(href);
      link.rel = "noopener noreferrer";
      link.textContent = visibleUrl;
      link.addEventListener("click", (event) => {
        event.preventDefault();
        openNewsExternal(link.href);
      });
      root.append(link);
    } else {
      root.append(document.createTextNode(visibleUrl));
    }
    if (trailing) root.append(document.createTextNode(trailing));
    cursor = start + raw.length;
  }
  root.append(document.createTextNode(String(value || "").slice(cursor)));
}

export function createQuotePreview(
  quote,
  enhance = false,
  onOpen = null,
  openSubmission = () => {},
) {
  const block = document.createElement("div");
  block.className = "news-view__quote";
  if (onOpen) {
    block.dataset.newsQuote = "true";
    block.tabIndex = 0;
    block.setAttribute("role", "button");
    block.setAttribute(
      "aria-label",
      `Open ${quote.sourceName || "quoted"} post details`,
    );
    const openDetails = (event) => {
      if (event.target.closest("a")) return;
      event.preventDefault();
      event.stopPropagation();
      onOpen();
    };
    block.addEventListener("click", openDetails);
    block.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      openDetails(event);
    });
  }

  const header = document.createElement("div");
  header.className = "news-view__quote-header";
  const avatar = document.createElement("span");
  avatar.className = "news-view__quote-avatar";
  if (quote.avatarUrl) {
    const image = document.createElement("img");
    image.src = quote.avatarUrl;
    image.alt = "";
    image.loading = "lazy";
    image.addEventListener("error", () => image.remove(), { once: true });
    avatar.appendChild(image);
  } else {
    avatar.textContent = String(quote.sourceName || "Q").charAt(0);
  }
  const identity = document.createElement("span");
  identity.className = "news-view__quote-identity";
  const name = document.createElement("strong");
  name.textContent = quote.sourceName || "Quoted post";
  const handle = document.createElement("small");
  handle.textContent = quote.username ? `@${quote.username}` : "";
  identity.append(name, handle);
  header.append(avatar, identity);
  block.appendChild(header);

  if (quote.text) {
    const text = document.createElement("p");
    text.className = "news-view__quote-text";
    appendPostText(text, quote.text);
    if (enhance) {
      enhanceContentLinks(text, {
        loadGameBananaDetails: false,
        loadGameBananaTitle: true,
        onGameBanana: openSubmission,
      });
    }
    block.appendChild(text);
  }

  const mediaUrls = uniqueMediaUrls([
    ...(quote.videos || []).map((video) => video.thumbnailUrl),
    ...(quote.images || []),
  ]).slice(0, 4);
  if (mediaUrls.length) {
    const media = document.createElement("div");
    media.className = `news-view__media news-view__quote-media news-view__media--${Math.min(mediaUrls.length, 4)}`;
    mediaUrls.forEach((src) => {
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      media.appendChild(image);
    });
    block.appendChild(media);
  }
  return block;
}

export function createNewsCard(post, index, openPost, openSubmission) {
  const card = document.createElement("article");
  card.className = "news-view__card";
  card.dataset.postId = post.id;
  card.style.setProperty("--card-index", String(Math.min(index, 7)));
  card.tabIndex = 0;
  card.setAttribute("aria-label", `Open ${post.sourceName} post details`);
  card.addEventListener(
    "click",
    (event) => {
      if (
        event.target.closest("button") ||
        event.target.closest("[data-news-quote]")
      ) {
        return;
      }
      if (event.target.closest("a")) return;
      openPost(post);
    },
    true,
  );
  card.addEventListener("keydown", (event) => {
    if (
      event.target.closest("button") ||
      event.target.closest("[data-news-quote]")
    ) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openPost(post);
  });

  const header = document.createElement("header");
  header.className = "news-view__post-header";
  const avatar = document.createElement("span");
  avatar.className = "news-view__avatar";
  avatar.setAttribute("aria-hidden", "true");
  if (post.avatarUrl) {
    const image = document.createElement("img");
    image.src = post.avatarUrl;
    image.alt = "";
    image.addEventListener(
      "error",
      () => {
        image.remove();
        avatar.textContent = post.sourceName.charAt(0);
      },
      { once: true },
    );
    avatar.appendChild(image);
  } else avatar.textContent = post.sourceName.charAt(0);
  header.appendChild(avatar);
  const identity = document.createElement("div");
  identity.className = "news-view__identity";
  const author = document.createElement("strong");
  author.textContent = post.sourceName;
  const handle = document.createElement("span");
  handle.textContent = `@${post.username}`;
  identity.append(author, handle);
  header.appendChild(identity);
  const date = document.createElement("time");
  date.className = "news-view__date";
  date.dateTime = new Date(post.publishedAt).toISOString();
  date.textContent = newsDate(post.publishedAt);
  header.appendChild(date);
  card.appendChild(header);

  const body = document.createElement("div");
  body.className = "news-view__card-body";
  if (post.text) {
    const textWrap = document.createElement("div");
    textWrap.className = "news-view__text-wrap";
    const text = document.createElement("p");
    text.className = "news-view__card-text is-collapsed";
    appendPostText(text, post.text);
    textWrap.appendChild(text);
    const showMore = document.createElement("button");
    showMore.className = "news-view__show-more";
    showMore.type = "button";
    showMore.textContent = "Show more";
    showMore.hidden = true;
    showMore.setAttribute("aria-haspopup", "dialog");
    showMore.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      openPost(post);
    });
    textWrap.appendChild(showMore);
    requestAnimationFrame(() => {
      showMore.hidden = text.scrollHeight <= text.clientHeight + 1;
    });
    body.appendChild(textWrap);
  }
  if (post.quote) {
    body.appendChild(
      createQuotePreview(
        post.quote,
        false,
        () => openPost(post),
        openSubmission,
      ),
    );
  }
  const videos = (post.videos || []).filter((video) => video.thumbnailUrl);
  const mediaCount = videos.length + post.images.length;
  if (mediaCount) {
    const media = document.createElement("div");
    media.className = `news-view__media news-view__media--${Math.min(mediaCount, 4)}`;
    videos.forEach((video) => {
      media.appendChild(
        createVideoThumbnail(video.thumbnailUrl, "Open video details", () =>
          openPost(post),
        ),
      );
    });
    post.images.forEach((src) => {
      const image = document.createElement("img");
      image.src = src;
      image.alt = "";
      image.loading = "lazy";
      image.addEventListener("error", () => image.remove(), { once: true });
      media.appendChild(image);
    });
    body.appendChild(media);
  }
  const link = document.createElement("a");
  link.className = "news-view__open-link";
  link.href = post.link;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = "Open post on Twitter";
  body.appendChild(link);
  card.appendChild(body);
  return card;
}
