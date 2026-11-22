let activePreview = null;
let activePreviewKeydown = null;

export function closeNewsMediaPreview() {
  if (activePreviewKeydown) {
    document.removeEventListener("keydown", activePreviewKeydown);
    activePreviewKeydown = null;
  }
  activePreview?.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
  activePreview?.remove();
  activePreview = null;
}

export function openNewsMediaPreview(source, type, poster = "") {
  const sources = Array.isArray(source)
    ? source.filter(Boolean)
    : [source].filter(Boolean);
  if (!sources.length) return;
  closeNewsMediaPreview();
  const overlay = document.createElement("div");
  overlay.className = "news-media-preview";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-label", "Media preview");
  const close = document.createElement("button");
  close.className = "news-media-preview__close";
  close.type = "button";
  close.setAttribute("aria-label", "Close media preview");
  close.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
  close.addEventListener("click", closeNewsMediaPreview);
  const media = document.createElement(type === "video" ? "video" : "img");
  media.className = "news-media-preview__content";
  if (type === "video") {
    media.controls = true;
    media.autoplay = true;
    media.playsInline = true;
    media.preload = "metadata";
    media.poster = poster;
    media.addEventListener("error", () => {
      const nextSource =
        sources[sources.indexOf(media.currentSrc || media.src) + 1];
      if (nextSource) {
        media.src = nextSource;
        media.load();
        void media.play().catch(() => {});
      }
    });
  } else {
    media.alt = "Media preview";
  }
  media.src = sources[0];
  overlay.append(close, media);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeNewsMediaPreview();
  });
  activePreview = overlay;
  activePreviewKeydown = (event) => {
    if (event.key === "Escape") closeNewsMediaPreview();
  };
  document.addEventListener("keydown", activePreviewKeydown);
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("show"));
}

export function makeMediaPreviewable(element, source, type, poster = "") {
  if (!source) return;
  element.classList.add("news-detail-modal__media-previewable");
  element.tabIndex = 0;
  element.setAttribute("role", "button");
  element.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (element instanceof HTMLVideoElement) element.pause();
    openNewsMediaPreview(source, type, poster);
  });
  element.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openNewsMediaPreview(source, type, poster);
  });
}

export function createVideoThumbnail(thumbnailUrl, label, onClick) {
  const button = document.createElement("button");
  button.className = "news-video-thumbnail";
  button.type = "button";
  button.setAttribute("aria-label", label);
  if (thumbnailUrl) {
    const image = document.createElement("img");
    image.src = thumbnailUrl;
    image.alt = "Video thumbnail";
    image.loading = "lazy";
    button.appendChild(image);
  }
  const icon = document.createElement("span");
  icon.className = "news-video-thumbnail__play";
  icon.innerHTML = '<i class="fa-solid fa-play" aria-hidden="true"></i>';
  button.appendChild(icon);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });
  return button;
}

export function appendVideoMedia(container, media, post, openExternal) {
  const frame = document.createElement("div");
  frame.className =
    "news-detail-modal__media-cell news-detail-modal__video-frame";
  const sources = [
    ...new Set([media.url, ...(media.sources || [])].filter(Boolean)),
  ];
  const showFallback = () => {
    if (media.thumbnailUrl) {
      const image = document.createElement("img");
      image.src = media.thumbnailUrl;
      image.alt = "Video thumbnail";
      image.loading = "lazy";
      makeMediaPreviewable(image, media.thumbnailUrl, "image");
      frame.appendChild(image);
    }
    const link = document.createElement("a");
    link.href = post.link;
    link.rel = "noopener noreferrer";
    link.textContent = "Open video on Twitter";
    link.addEventListener("click", (event) => {
      event.preventDefault();
      openExternal(link.href);
    });
    frame.appendChild(link);
  };
  if (media.thumbnailUrl && sources.length) {
    frame.appendChild(
      createVideoThumbnail(media.thumbnailUrl, "Play video", () =>
        openNewsMediaPreview(sources, "video", media.thumbnailUrl),
      ),
    );
  } else {
    showFallback();
  }
  container.appendChild(frame);
}

export function stopModalVideos(modal) {
  modal.querySelectorAll("video").forEach((video) => {
    video.pause();
    video.removeAttribute("src");
    video.load();
  });
}
