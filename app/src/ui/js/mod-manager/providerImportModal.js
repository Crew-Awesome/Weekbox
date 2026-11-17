import { gameBananaApi } from "../../../backend/providers/gamebanana/gamebanana.provider.js";
import { peoApi } from "../../../backend/providers/peo/peo.provider.js";
import { backstageApi } from "../../../backend/providers/backstage/backstage.provider.js";
import { gameJoltApi } from "../../../backend/providers/gamejolt/gamejolt.provider.js";
import { t } from "../i18n/index.js";
import { activateCheckoutDialog, deactivateCheckoutDialog } from "../home/modal/dialogFocus.js";
import { escapeHtml } from "./modSettingsTemplates.js";

const PROVIDERS = {
  gamebanana: { label: "GameBanana", icon: "assets/icons/gamebanana.png" },
  peo: { label: "Psych Online", icon: "assets/icons/psychonline.png" },
  backstage: { label: "FunkinBackstage", icon: "assets/icons/backstage.png" },
  gamejolt: { label: "GameJolt", icon: "assets/icons/gamejolt.png" },
};

function parseProviderUrl(value) {
  if (/^\d+$/.test(value)) return { provider: "gamebanana", id: value, type: "mod", url: `https://gamebanana.com/mods/${value}` };
  let url;
  try { url = new URL(value); } catch { return null; }
  if (!/^https?:$/.test(url.protocol)) return null;
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  if (host === "gamebanana.com" || host.endsWith(".gamebanana.com")) {
    const source = gameBananaApi.getGameBananaSubmission(url.href);
    const match = url.pathname.match(/^\/(mods|tools)\/(\d+)(?:\/|$)/i);
    const parsed = source || (match ? { type: match[1].slice(0, -1), id: Number(match[2]) } : null);
    return parsed?.id ? { provider: "gamebanana", id: String(parsed.id), type: parsed.type === "tool" ? "tool" : "mod", url: url.href } : null;
  }
  if (host === "funkin.sniro.boo") {
    const match = url.pathname.match(/^\/mod\/([^/]+)\/?$/i);
    return match ? { provider: "peo", id: decodeURIComponent(match[1]), type: "mod", url: url.href } : null;
  }
  if (host === "funkinbackstage.net" || host === "api.funkinbackstage.net") {
    const match = url.pathname.match(/^\/mods\/([a-z0-9_-]+)\/?$/i);
    return match ? { provider: "backstage", id: decodeURIComponent(match[1]), type: "mod", url: url.href } : null;
  }
  if (host === "gamejolt.com" || host.endsWith(".gamejolt.com")) {
    const match = url.pathname.match(/^\/games\/[^/]+\/(\d+)(?:\/|$)/i);
    return match ? { provider: "gamejolt", id: match[1], type: "mod", url: `https://gamejolt.com/games/${url.pathname.split("/").filter(Boolean).slice(-2).join("/")}` } : null;
  }
  return null;
}

async function fetchDetails(source) {
  if (source.provider === "gamebanana") {
    return source.type === "tool"
      ? gameBananaApi.getToolDetails(source.id, { requireDownload: false })
      : gameBananaApi.getModDetails(source.id, { includeRequirements: false });
  }
  if (source.provider === "peo") return peoApi.getModDetails(source.id);
  if (source.provider === "backstage") return backstageApi.getModDetails(source.id);
  if (source.provider === "gamejolt") return gameJoltApi.getGameDetails(source.id);
  return null;
}

function getArtwork(details, provider) {
  const galleryImage = details.images?.find((image) => image && !image.includes("placeholder-mini"));
  if (provider === "backstage" || provider === "gamejolt") {
    return details.image || details.thumbnail || galleryImage || null;
  }
  return galleryImage || details.thumbnail || null;
}

export function openProviderImport({ onImported } = {}) {
  const overlay = document.createElement("div");
  overlay.className = "mod-settings-overlay local-mod-provider-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-labelledby", "provider-import-title");
  overlay.innerHTML = `
    <form class="mod-settings-modal local-mod-provider-modal">
      <header class="mod-settings-header">
        <div><h2 id="provider-import-title">Import from Provider</h2><p>Link this mod to a supported mod service.</p></div>
        <button type="button" class="mod-settings-close" aria-label="${escapeHtml(t("common.close"))} provider import"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
      </header>
      <div class="mod-settings-body local-mod-provider-body">
        <label for="provider-import-url">Mod URL</label>
        <input id="provider-import-url" type="text" inputmode="url" required placeholder="Paste a GameBanana, Psych Online, or FunkinBackstage mod URL" autocomplete="url">
        <div class="provider-import-preview" hidden aria-live="polite"></div>
        <p class="mod-settings-status local-mod-provider-status" role="status" aria-live="polite"></p>
      </div>
      <footer class="mod-settings-footer">
        <button type="button" class="mod-settings-cancel" data-cancel>${escapeHtml(t("common.cancel"))}</button>
        <button type="submit" class="mod-settings-save"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i> Preview mod</button>
        <button type="button" class="mod-settings-save provider-import-use" hidden>Use provider details</button>
      </footer>
    </form>`;
  document.body.append(overlay);

  const form = overlay.querySelector("form");
  const input = overlay.querySelector("#provider-import-url");
  const status = overlay.querySelector(".local-mod-provider-status");
  const preview = overlay.querySelector(".provider-import-preview");
  const submit = form.querySelector('[type="submit"]');
  const useDetails = overlay.querySelector(".provider-import-use");
  let detailsDraft = null;
  let requestVersion = 0;
  const close = () => {
    deactivateCheckoutDialog(overlay);
    overlay.classList.remove("show");
    setTimeout(() => overlay.remove(), 260);
  };
  overlay.querySelector(".mod-settings-close").addEventListener("click", close);
  overlay.querySelector("[data-cancel]").addEventListener("click", close);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  input.addEventListener("input", () => {
    requestVersion += 1;
    detailsDraft = null;
    preview.hidden = true;
    preview.replaceChildren();
    useDetails.hidden = true;
    submit.hidden = false;
    submit.disabled = false;
    status.textContent = "";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const version = ++requestVersion;
    const source = parseProviderUrl(input.value.trim());
    if (!source) {
      status.textContent = "Unsupported or invalid mod URL. Use a GameBanana, Psych Online, or FunkinBackstage mod URL.";
      return;
    }
    submit.disabled = true;
    status.textContent = `Loading ${PROVIDERS[source.provider].label} details…`;
    preview.hidden = true;
    useDetails.hidden = true;
    try {
      const details = await fetchDetails(source);
      if (version !== requestVersion) return;
      if (!details?.title) throw new Error("The provider did not return mod details.");
      detailsDraft = { details, source };
      const provider = PROVIDERS[source.provider];
      const artwork = getArtwork(details, source.provider);
      const identity = document.createElement("div");
      identity.className = "provider-import-identity";
      const providerBadge = document.createElement("span");
      providerBadge.className = "provider-import-provider";
      const icon = document.createElement("img");
      icon.src = provider.icon;
      icon.alt = "";
      const providerName = document.createElement("strong");
      providerName.textContent = provider.label;
      providerBadge.append(icon, providerName);
      const title = document.createElement("strong");
      title.className = "provider-import-title";
      title.textContent = details.title;
      const author = document.createElement("span");
      author.textContent = details.author || "Author not provided";
      identity.append(providerBadge, title, author);
      preview.replaceChildren();
      if (artwork) {
        const image = document.createElement("img");
        image.className = "provider-import-artwork";
        image.src = artwork;
        image.alt = `${details.title} artwork`;
        image.addEventListener("error", () => image.remove(), { once: true });
        preview.append(image);
      }
      preview.append(identity);
      preview.hidden = false;
      status.textContent = details.downloadOptions?.length ? `${details.downloadOptions.length} downloadable file option(s) found.` : "Mod details found. No downloadable files are listed by this provider.";
      submit.hidden = true;
      submit.disabled = false;
      useDetails.hidden = false;
    } catch (error) {
      if (version !== requestVersion) return;
      status.textContent = error?.message || "Could not load mod details from that provider.";
      submit.disabled = false;
    }
  });
  useDetails.addEventListener("click", async () => {
    if (!detailsDraft) return;
    useDetails.disabled = true;
    try {
      await onImported?.(detailsDraft);
      close();
    } catch (error) {
      status.textContent = error?.message || "Could not apply provider details.";
    } finally {
      useDetails.disabled = false;
    }
  });
  activateCheckoutDialog(overlay, overlay, input, close);
  requestAnimationFrame(() => overlay.classList.add("show"));
}
