import en from "../../locales/en.json";
import es from "../../locales/es.json";
import de from "../../locales/de.json";
import { appSettings } from "../../../backend/core/system/settings.service.js";

const catalogs = { en, es, de };
const fallbackLocale = "en";

function interpolate(value, variables = {}) {
  return String(value).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, name) =>
    variables[name] === undefined ? `{{${name}}}` : String(variables[name]),
  );
}

export const i18n = {
  locale: fallbackLocale,
  fallbackLocale,
  catalogs,

  init() {
    const savedLocale = appSettings.get("language");
    this.locale = catalogs[savedLocale] ? savedLocale : fallbackLocale;
    document.documentElement.lang = this.locale;
    this.apply(document);
  },

  setLocale(locale) {
    const nextLocale = catalogs[locale] ? locale : fallbackLocale;
    this.locale = nextLocale;
    appSettings.set("language", nextLocale);
    document.documentElement.lang = nextLocale;
    this.apply(document);
    document.dispatchEvent(
      new CustomEvent("locale-changed", { detail: nextLocale }),
    );
  },

  t(key, variables) {
    const translated = this.catalogs[this.locale]?.[key];
    const fallback = this.catalogs[this.fallbackLocale]?.[key];
    const value = typeof translated === "string" ? translated : fallback;
    return typeof value === "string" ? interpolate(value, variables) : "";
  },

  apply(root = document) {
    const textElements = [];
    if (root?.matches?.("[data-i18n]")) textElements.push(root);
    root
      ?.querySelectorAll?.("[data-i18n]")
      .forEach((element) => textElements.push(element));
    textElements.forEach((element) => {
      let variables;
      try {
        variables = element.dataset.i18nVars
          ? JSON.parse(element.dataset.i18nVars)
          : undefined;
      } catch {
        variables = undefined;
      }
      element.textContent = this.t(element.dataset.i18n, variables);
    });

    const attributeElements = [];
    if (root?.matches?.("[data-i18n-attr]")) attributeElements.push(root);
    root
      ?.querySelectorAll?.("[data-i18n-attr]")
      .forEach((element) => attributeElements.push(element));
    attributeElements.forEach((element) => {
      element.dataset.i18nAttr.split(",").forEach((entry) => {
        const [attribute, key] = entry.split(":");
        if (attribute && key)
          element.setAttribute(attribute.trim(), this.t(key.trim()));
      });
    });
  },
};

export const t = (key, variables) => i18n.t(key, variables);

export function localizeProgressStatus(status) {
  const value = String(status || "");
  const normalized = value.replace(/(?:\.\.\.|\u2026)$/, "");
  const dynamic = [
    [/^Downloading\s+(.+)$/, "downloads.downloadingDetails"],
    [/^Extracting:\s+(.+)$/, "engines.extractingFile"],
    [/^Extracting nested -\s+(.+)$/, "downloads.extractingNestedFile"],
  ];
  for (const [pattern, key] of dynamic) {
    const match = normalized.match(pattern);
    if (match) return t(key, { details: match[1], file: match[1] });
  }

  const fixed = {
    Working: "engines.working",
    "Preparing environment": "engines.preparingEnvironment",
    "Download process started": "downloads.downloadStarted",
    "Receiving download data": "downloads.receiving",
    "Preparing download destination": "downloads.preparingDestination",
    "Preparing external download": "downloads.preparingExternal",
    "Connecting to download server": "downloads.connectingServer",
    Connecting: "downloads.connecting",
  };
  return fixed[normalized] ? t(fixed[normalized]) : value;
}
