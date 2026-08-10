import { i18n, t } from "../i18n/index.js";
import { nativeFetch } from "../../../backend/services/network/native-http.js";

const ALLOWED_TAGS = new Set([
  "a",
  "b",
  "blockquote",
  "br",
  "code",
  "del",
  "details",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "img",
  "input",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "summary",
  "span",
  "table",
  "tt",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);

const ALLOWED_ATTRIBUTES = {
  a: new Set(["href", "title"]),
  img: new Set(["alt", "height", "src", "title", "width"]),
  input: new Set(["checked", "disabled", "type"]),
  ol: new Set(["start"]),
  span: new Set(["style"]),
};

function isSafeUrl(value) {
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function sanitizeReleaseDom(html) {
  const documentNode = new DOMParser().parseFromString(html, "text/html");

  documentNode.body.querySelectorAll("*").forEach((element) => {
    const tagName = element.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tagName)) {
      if (["script", "style", "template"].includes(tagName)) {
        element.remove();
        return;
      }

      element.replaceWith(...element.childNodes);
      return;
    }

    const allowedAttributes = ALLOWED_ATTRIBUTES[tagName] || new Set();
    [...element.attributes].forEach((attribute) => {
      if (
        tagName === "span" &&
        attribute.name.toLowerCase() === "style"
      ) {
        const color = element.style.color;
        element.removeAttribute("style");
        if (color && CSS.supports("color", color))
          element.style.setProperty("color", color);
        return;
      }
      if (!allowedAttributes.has(attribute.name.toLowerCase())) {
        element.removeAttribute(attribute.name);
      }
    });

    if (
      (tagName === "a" || tagName === "img") &&
      !isSafeUrl(element.getAttribute(tagName === "a" ? "href" : "src"))
    ) {
      element.removeAttribute(tagName === "a" ? "href" : "src");
    }

    if (tagName === "a" && element.hasAttribute("href")) {
      element.target = "_blank";
      element.rel = "noopener noreferrer";
    }
  });

  return documentNode.body;
}

export function parseSanitizedReleaseHtml(html) {
  const body = sanitizeReleaseDom(html);
  return [...body.childNodes];
}

export function sanitizeReleaseHtml(html) {
  const body = sanitizeReleaseDom(html);
  return body.innerHTML;
}

function renderMarkdownLinks(text) {
  const fragment = document.createDocumentFragment();
  const pattern = /\[([^\]]+)]\((https?:\/\/[^\s)]+)\)/g;
  let cursor = 0;
  let match;

  while ((match = pattern.exec(text))) {
    fragment.append(document.createTextNode(text.slice(cursor, match.index)));
    const link = document.createElement("a");
    link.href = match[2];
    link.textContent = match[1];
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    fragment.append(link);
    cursor = match.index + match[0].length;
  }
  fragment.append(document.createTextNode(text.slice(cursor)));
  return fragment;
}

function showPlainTextNotes(container, text) {
  container.classList.add("release-notes-plain");
  container.replaceChildren(renderMarkdownLinks(text));
}

function renderNotesStatus(container, templateId, fallbackFn) {
  const tpl = document.getElementById(templateId);
  if (tpl) {
    container.replaceChildren(tpl.content.cloneNode(true));
    i18n.apply(container);
  } else if (fallbackFn) {
    container.replaceChildren(fallbackFn());
  }
}

function renderNightlyNotes(container, versionData, targetLink) {
  const platform = Object.keys(versionData?.nightlyInfo || {}).find(
    (key) => versionData[key] === targetLink,
  );
  const info =
    versionData?.nightlyInfo?.[platform] ||
    Object.values(versionData?.nightlyInfo || {})[0] ||
    {};
  const wrapper = document.createElement("div");
  const title = document.createElement("p");
  title.textContent = t("engines.nightlyBuild");
  wrapper.append(title);

  const details = document.createElement("p");
  details.textContent = t("engines.nightlyNotes", {
    commit: info.commit?.slice(0, 8) || "unknown",
    date: versionData.releasedAt
      ? new Date(versionData.releasedAt).toLocaleString()
      : "unknown",
  });
  wrapper.append(details);

  if (info.message) {
    const message = document.createElement("p");
    message.textContent = info.message;
    wrapper.append(message);
  }

  const links = document.createElement("p");
  for (const [url, label] of [
    [info.runUrl, t("engines.viewWorkflowRun")],
    [info.commitUrl, t("engines.viewCommit")],
  ]) {
    if (!url) continue;
    if (links.childNodes.length) links.append(" · ");
    const link = document.createElement("a");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = label;
    links.append(link);
  }
  if (links.childNodes.length) wrapper.append(links);
  container.replaceChildren(wrapper);
}

export async function fetchAndRenderReleaseNotes(versionData, targetLink) {
  const notesContainer = document.getElementById("engine-release-notes");
  if (!notesContainer) return;

  notesContainer.classList.remove("release-notes-plain");
  renderNotesStatus(notesContainer, "tpl-release-notes-loading", () => {
    const p = document.createElement("p");
    p.style.color = "var(--text-muted)";
    p.textContent = t("engines.releaseNotesLoading");
    return p;
  });

  if (versionData?.isNightly) {
    renderNightlyNotes(notesContainer, versionData, targetLink);
    return;
  }

  const link =
    targetLink || versionData.win || versionData.lin || versionData.mac || "";
  const match = link.match(
    /github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\//,
  );

  if (!match) {
    renderNotesStatus(notesContainer, "tpl-release-notes-empty", () => {
      const p = document.createElement("p");
      const em = document.createElement("em");
      em.textContent = t("engines.noReleaseNotes");
      p.appendChild(em);
      return p;
    });
    return;
  }

  const [owner, repository, tag] = match.slice(1);

  try {
    const response = await nativeFetch(
      `https://api.github.com/repos/${owner}/${repository}/releases/tags/${encodeURIComponent(tag)}`,
      {
        headers: {
          Accept: "application/vnd.github.full+json",
          "X-GitHub-Api-Version": "2026-03-10",
        },
      },
    );

    if (!response.ok)
      throw new Error(`Release lookup failed: ${response.status}`);
    const release = await response.json();
    const text = release.body || "No description.";

    const nodes = release.body_html
      ? parseSanitizedReleaseHtml(release.body_html)
      : [];
    if (nodes.length > 0) {
      notesContainer.replaceChildren(...nodes);
    } else {
      showPlainTextNotes(notesContainer, text);
    }
  } catch {
    renderNotesStatus(notesContainer, "tpl-release-notes-failed", () => {
      const p = document.createElement("p");
      const em = document.createElement("em");
      em.textContent = t("engines.releaseNotesFailed");
      p.appendChild(em);
      return p;
    });
  }
}
