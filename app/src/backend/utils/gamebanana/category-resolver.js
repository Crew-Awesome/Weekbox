const RELATED_CATEGORY_FIELDS = [
  "_aCategory",
  "_aRootCategory",
  "_aSubCategory",
  "_aParentCategory",
  "_aSuperCategory",
];

export class GameBananaCategoryResolver {
  constructor({
    engineCategories,
    legacyEngineCategories,
    modKindCategories,
    excludedCategoryIds,
  }) {
    this.engineCategories = engineCategories;
    this.legacyEngineCategories = legacyEngineCategories;
    this.modKindCategories = modKindCategories || {};
    this.excludedCategoryIds = excludedCategoryIds;
  }

  getCategoryId(category) {
    if (!category || typeof category !== "object") return null;
    const id =
      category._idRow ||
      category._idCategory ||
      category._sProfileUrl?.match(/\/mods\/cats\/(\d+)/)?.[1];
    return Number.isFinite(Number(id)) ? Number(id) : null;
  }

  getEngineIdForCategory(categoryId) {
    const id = Number(categoryId);
    return this.engineCategories[id] || this.legacyEngineCategories[id] || null;
  }

  getModKindForCategory(categoryId) {
    return this.modKindCategories[Number(categoryId)] || null;
  }

  getEngineIdForCategoryName(...categories) {
    const names = categories
      .filter((category) => category && typeof category === "object")
      .map((category) => String(category._sName || "").toLocaleLowerCase());
    if (names.some((name) => /\bpsych(?:[\s-]+)?online\b/.test(name))) {
      return "psychonline";
    }
    if (names.some((name) => /\bpsych\b/.test(name))) return "psych";
    if (names.some((name) => /\bcodename\b/.test(name))) return "codename";
    if (names.some((name) => /\bexecutable\b/.test(name))) return "executable";
    if (names.some((name) => /\bbase\b/.test(name))) return "vslice";
    return null;
  }

  isExcludedCategory(...categories) {
    const pending = categories.filter(Boolean);
    const seen = new Set();
    while (pending.length) {
      const category = pending.shift();
      if (typeof category === "number" || typeof category === "string") {
        if (this.excludedCategoryIds.has(Number(category))) return true;
        continue;
      }
      if (typeof category !== "object" || seen.has(category)) continue;
      seen.add(category);
      if (
        category._bIsObsolete ||
        this.excludedCategoryIds.has(this.getCategoryId(category))
      )
        return true;
      pending.push(...RELATED_CATEGORY_FIELDS.map((field) => category[field]));
    }
    return false;
  }

  isInCategory(categoryId, ...categories) {
    const requestedId = Number(categoryId);
    if (!Number.isFinite(requestedId)) return false;
    const pending = categories.filter(Boolean);
    const seen = new Set();
    while (pending.length) {
      const category = pending.shift();
      if (Number(category) === requestedId) return true;
      if (typeof category !== "object" || seen.has(category)) continue;
      seen.add(category);
      if (this.getCategoryId(category) === requestedId) return true;
      pending.push(...RELATED_CATEGORY_FIELDS.map((field) => category[field]));
    }
    return false;
  }

  getEngineIdForCategories(...categories) {
    const pending = categories.filter((category) => category != null);
    const seen = new Set();
    const detected = [];
    while (pending.length) {
      const category = pending.shift();
      if (typeof category === "number" || typeof category === "string") {
        const engineId = this.getEngineIdForCategory(category);
        if (engineId) detected.push(engineId);
        continue;
      }
      if (typeof category !== "object" || seen.has(category)) continue;
      seen.add(category);
      const engineId = this.getEngineIdForCategory(
        this.getCategoryId(category),
      );
      if (engineId) detected.push(engineId);
      pending.push(...RELATED_CATEGORY_FIELDS.map((field) => category[field]));
    }
    return detected.includes("psychonline")
      ? "psychonline"
      : detected[0] || null;
  }

  getModKindForCategories(...categories) {
    const pending = categories.filter((category) => category != null);
    const seen = new Set();
    const detected = [];
    while (pending.length) {
      const category = pending.shift();
      if (typeof category === "number" || typeof category === "string") {
        const kind = this.getModKindForCategory(category);
        if (kind) detected.push(kind);
        continue;
      }
      if (typeof category !== "object" || seen.has(category)) continue;
      seen.add(category);
      const kind = this.getModKindForCategory(this.getCategoryId(category));
      if (kind) detected.push(kind);
      pending.push(...RELATED_CATEGORY_FIELDS.map((field) => category[field]));
    }
    return detected.includes("addon") ||
      (detected.includes("dependency") &&
        this.getEngineIdForCategories(...categories) === "codename")
      ? "addon"
      : detected.includes("dependency")
        ? "dependency"
        : null;
  }
}
