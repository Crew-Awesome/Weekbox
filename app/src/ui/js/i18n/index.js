import en from "../../locales/en.json";
import es from "../../locales/es.json";
import de from "../../locales/de.json";
import id from "../../locales/id.json";
import it from "../../locales/it.json";
import pt from "../../locales/pt.json";
import fr from "../../locales/fr.json";
import shared from "../../locales/shared.json";
import { appSettings } from "../../../backend/core/system/settings.service.js";

const catalogs = { en, es, de, id, it, pt, fr };
const fallbackLocale = "en";
export const LANGUAGES = [
  { id: "en", flag: "us", name: "English" },
  { id: "es", flag: "es", name: "Espa\u00f1ol" },
  { id: "de", flag: "de", name: "Deutsch" },
  { id: "id", flag: "id", name: "Bahasa Indonesia" },
  { id: "it", flag: "it", name: "Italiano" },
  { id: "pt", flag: "pt", name: "Portugu\u00eas" },
  { id: "fr", flag: "fr", name: "Fran\u00e7ais" },
];
const engineLabelKeys = {
  vslice: "home.baseGame",
  psych: "home.psychEngine",
  pslice: "home.pSlice",
  fpsplus: "home.fpsPlus",
  psychonline: "home.psychOnline",
  codename: "home.codenameEngine",
  executable: "home.executables",
};

function interpolate(value, variables = {}) {
  return String(value).replace(/\{\{\s*([\w.-]+)\s*\}\}/g, (_, name) =>
    variables[name] === undefined ? `{{${name}}}` : String(variables[name]),
  );
}

export const i18n = {
  locale: fallbackLocale,
  fallbackLocale,
  catalogs,
  shared,

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
    const common = this.shared[key];
    const fallback = this.catalogs[this.fallbackLocale]?.[key];
    const value =
      typeof translated === "string"
        ? translated
        : typeof common === "string"
          ? common
          : fallback;
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

export function getLocaleCoverage(locale) {
  if (locale === fallbackLocale) return 100;
  const englishKeys = Object.keys(en);
  const catalog = catalogs[locale] || {};
  const translated = englishKeys.filter(
    (key) =>
      typeof catalog[key] === "string" &&
      catalog[key].trim() &&
      catalog[key] !== en[key],
  ).length;
  return Number(((translated / englishKeys.length) * 100).toFixed(1));
}

export function getEngineLabelKey(engineId) {
  return engineLabelKeys[engineId] || "";
}

export function getEngineLabel(engineId, fallback = engineId) {
  const key = getEngineLabelKey(engineId);
  return key ? i18n.t(key) : fallback;
}

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
