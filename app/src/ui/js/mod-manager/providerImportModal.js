import { t } from "../i18n/index.js";
import { modCatalogService } from "../../../backend/services/mod-catalog.service.js";
import {
  activateCheckoutDialog,
  deactivateCheckoutDialog,
} from "../home/modal/dialogFocus.js";
import { escapeHtml } from "./modSettingsTemplates.js";

const PROVIDERS = {
  gamebanana: { label: "GameBanana", icon: "assets/icons/gamebanana.png" },
  peo: { label: "Psych Online", icon: "assets/icons/psychonline.png" },
  backstage: { label: "FunkinBackstage", icon: "assets/icons/backstage.png" },
  gamejolt: { label: "GameJolt", icon: "assets/icons/gamejolt.png" },
};

function getArtwork(details, provider) {
  const galleryImage = details.images?.find(
    (image) => image && !image.includes("placeholder-mini"),
  );
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
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
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
    const source = modCatalogService.parseProviderImportUrl(input.value.trim());
    if (!source) {
      status.textContent =
        "Unsupported or invalid mod URL. Use a GameBanana, Psych Online, or FunkinBackstage mod URL.";
      return;
    }
    submit.disabled = true;
    status.textContent = `Loading ${PROVIDERS[source.provider].label} details…`;
    preview.hidden = true;
    useDetails.hidden = true;
    try {
      const details = await modCatalogService.getProviderImportDetails(source);
      if (version !== requestVersion) return;
      if (!details?.title)
        throw new Error("The provider did not return mod details.");
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
      status.textContent = details.downloadOptions?.length
        ? `${details.downloadOptions.length} downloadable file option(s) found.`
        : "Mod details found. No downloadable files are listed by this provider.";
      submit.hidden = true;
      submit.disabled = false;
      useDetails.hidden = false;
    } catch (error) {
      if (version !== requestVersion) return;
      status.textContent =
        error?.message || "Could not load mod details from that provider.";
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
      status.textContent =
        error?.message || "Could not apply provider details.";
    } finally {
      useDetails.disabled = false;
    }
  });
  activateCheckoutDialog(overlay, overlay, input, close);
  requestAnimationFrame(() => overlay.classList.add("show"));
}
