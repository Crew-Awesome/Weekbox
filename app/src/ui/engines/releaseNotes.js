const ALLOWED_TAGS = new Set([
    "a", "b", "blockquote", "br", "code", "del", "details", "em", "h1", "h2", "h3", "h4",
    "h5", "h6", "hr", "img", "li", "ol", "p", "pre", "strong", "summary", "table", "tt",
    "tbody", "td", "th", "thead", "tr", "ul"
]);

const ALLOWED_ATTRIBUTES = {
    a: new Set(["href", "title"]),
    img: new Set(["alt", "height", "src", "title", "width"]),
    ol: new Set(["start"])
};

function isSafeUrl(value) {
    try {
        const url = new URL(value, window.location.href);
        return url.protocol === "https:" || url.protocol === "http:";
    } catch {
        return false;
    }
}

function sanitizeReleaseHtml(html) {
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
            if (!allowedAttributes.has(attribute.name.toLowerCase())) {
                element.removeAttribute(attribute.name);
            }
        });

        if ((tagName === "a" || tagName === "img") && !isSafeUrl(element.getAttribute(tagName === "a" ? "href" : "src"))) {
            element.removeAttribute(tagName === "a" ? "href" : "src");
        }

        if (tagName === "a" && element.hasAttribute("href")) {
            element.target = "_blank";
            element.rel = "noopener noreferrer";
        }
    });

    return documentNode.body.innerHTML;
}

function showPlainTextNotes(container, text) {
    container.classList.add("release-notes-plain");
    container.textContent = text;
}

export async function fetchAndRenderReleaseNotes(versionData, targetLink) {
    const notesContainer = document.getElementById("engine-release-notes");
    if (!notesContainer) return;

    notesContainer.classList.remove("release-notes-plain");
    notesContainer.innerHTML = '<p style="color: var(--text-muted);">Fetching release notes...</p>';

    const link = targetLink || versionData.win || versionData.lin || versionData.mac || "";
    const match = link.match(/github\.com\/([^/]+)\/([^/]+)\/releases\/download\/([^/]+)\//);

    if (!match) {
        notesContainer.innerHTML = "<p><em>No release notes available.</em></p>";
        return;
    }

    const [owner, repository, tag] = match.slice(1);

    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repository}/releases/tags/${encodeURIComponent(tag)}`, {
            headers: {
                Accept: "application/vnd.github.full+json",
                "X-GitHub-Api-Version": "2026-03-10"
            }
        });

        if (!response.ok) throw new Error(`Release lookup failed: ${response.status}`);
        const release = await response.json();
        const text = release.body || "No description.";

        const html = sanitizeReleaseHtml(release.body_html || "");
        if (html) {
            notesContainer.innerHTML = html;
        } else {
            showPlainTextNotes(notesContainer, text);
        }
    } catch {
        notesContainer.innerHTML = "<p><em>Failed to fetch release notes.</em></p>";
    }
}
