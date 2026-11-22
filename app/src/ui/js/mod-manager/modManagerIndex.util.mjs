const modSearchKeys = new WeakMap();

function getModSearchKey(mod) {
  const tags = Array.isArray(mod.tags) ? mod.tags : [];
  const cached = modSearchKeys.get(mod);
  if (
    cached?.name === mod.name &&
    cached.tags.length === tags.length &&
    cached.tags.every((tag, index) => tag === tags[index])
  ) {
    return cached.key;
  }

  const key = [mod.name, ...tags.map((tag) => `#${tag}`)]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  modSearchKeys.set(mod, { name: mod.name, tags: [...tags], key });
  return key;
}

export function filterModsBySearch(mods, query) {
  const normalizedQuery = String(query || "")
    .trim()
    .toLocaleLowerCase();
  return normalizedQuery
    ? mods.filter((mod) => getModSearchKey(mod).includes(normalizedQuery))
    : mods;
}

export function getFilteredMods(mods, standaloneMods, filters, sortMode) {
  const modList = Array.isArray(mods) ? mods : [];
  const standaloneIds = new Set(
    (Array.isArray(standaloneMods) ? standaloneMods : []).map((mod) =>
      String(mod.id),
    ),
  );
  const order = new Map(modList.map((mod, index) => [String(mod.id), index]));
  const filterMatches = (mod, filter) => {
    const isExecutable = standaloneIds.has(String(mod.id));
    if (filter.startsWith("engine:"))
      return mod.engineId === filter.slice("engine:".length);
    if (filter === "kind:mod")
      return !["dependency", "addon"].includes(mod.kind) && !isExecutable;
    if (filter === "kind:dependency") return mod.kind === "dependency";
    if (filter === "kind:addon") return mod.kind === "addon";
    if (filter === "executable") return isExecutable;
    if (filter === "unassigned") return !mod.engineId && !isExecutable;
    return false;
  };
  const included = filters?.include || [];
  const excluded = filters?.exclude || [];
  return modList
    .filter(
      (mod) =>
        !excluded.some((filter) => filterMatches(mod, filter)) &&
        (!included.length ||
          included.some((filter) => filterMatches(mod, filter))),
    )
    .sort((left, right) => {
      let difference = 0;
      if (sortMode === "name-asc")
        difference = String(left.name || "").localeCompare(
          String(right.name || ""),
        );
      else if (sortMode === "name-desc")
        difference = String(right.name || "").localeCompare(
          String(left.name || ""),
        );
      else if (sortMode === "engine-asc")
        difference = String(left.engineId || "").localeCompare(
          String(right.engineId || ""),
        );
      else if (sortMode === "engine-desc")
        difference = String(right.engineId || "").localeCompare(
          String(left.engineId || ""),
        );
      else {
        const positionDifference =
          order.get(String(left.id)) - order.get(String(right.id));
        difference =
          sortMode === "added-asc" ? positionDifference : -positionDifference;
      }
      return difference || String(left.id).localeCompare(String(right.id));
    });
}
