import { FS } from "../../utils/filesystem.js";
import { sanitizePathSegment } from "../../utils/filesystem/pathUtils.js";
import { gameBananaApi } from "../../api/gamebanana.js";
import { modSettingsModal } from "./modSettingsModal.js";
import { getGameBananaSource } from "./modSettingsTemplates.js";
import { modManagerTemplates } from "../../html/components/mod-manager.js";

function getDependencyUsers(dependency, allMods) {
  return allMods.filter(
    (mod) =>
      mod.kind !== "dependency" &&
      Array.isArray(mod.dependencies) &&
      mod.dependencies.includes(dependency.id),
  );
}

function getDependencyDetails(dependency, users) {
  if (users.length) return `Used by ${users.map((mod) => mod.name).join(", ")}`;
  if (dependency.engineId) {
    return `For ${dependency.engineId}${dependency.engineVersion ? ` ${dependency.engineVersion}` : ""}`;
  }
  return dependency.sourceType === "tool"
    ? "GameBanana tool dependency"
    : "GameBanana mod dependency";
}

function loadDependencyCover(dependency, image) {
  Promise.resolve()
    .then(async () => {
      const source = getGameBananaSource(dependency);
      if (!source) return FS.ensureModCover(dependency.id, async () => null);

      const details =
        source.type === "tool"
          ? await gameBananaApi.getToolDetails(source.id)
          : await gameBananaApi.getModDetails(source.id, {
              includeRequirements: false,
            });
      const imageUrl =
        source.type === "tool" ? details?.thumbnail : details?.images?.[0];
      if (!imageUrl || imageUrl === "assets/icons/launcher-icon.png") {
        return FS.ensureModCover(dependency.id, async () => null);
      }

      const coverSource = `${source.type}:${source.id}`;
      if (dependency.coverSource !== coverSource) {
        await FS.updateModAppearance(dependency.id, {
          coverUrl: imageUrl,
          coverSource,
        });
        dependency.coverSource = coverSource;
      }
      return FS.getModCover(dependency.id);
    })
    .then((localCover) => {
      if (localCover) image.src = localCover;
    })
    .catch(() => {});
}

export const dependenciesRenderer = {
  async render(
    container,
    dependencies,
    allMods,
    installedEngines,
    isListView,
    onDependencyRemoved,
    onSettingsSaved,
  ) {
    if (!dependencies.length) return;
    const covers = await Promise.all(
      dependencies.map((dependency) => FS.getModCover(dependency.id)),
    );
    const section = document.createElement("section");
    section.className = "mod-manager-dependencies";
    const list = document.createElement("div");
    list.id = "mod-manager-grid-container";
    list.className = "mod-manager-dependency-list";
    if (isListView) list.classList.add("list-view");

    dependencies.forEach((dependency, index) => {
      const users = getDependencyUsers(dependency, allMods);
      const row = document.createElement("article");
      row.className = "mod-manager-dependency";
      const cover = document.createElement("img");
      cover.className = "mod-manager-dependency-cover";
      cover.src = covers[index] || "assets/icons/launcher-icon.png";
      cover.alt = "";
      cover.loading = "lazy";
      cover.addEventListener("error", () => {
        cover.src = "assets/icons/launcher-icon.png";
      });
      loadDependencyCover(dependency, cover);

      const copy = document.createElement("div");
      copy.className = "mod-manager-dependency-copy";
      const name = document.createElement("strong");
      name.textContent = dependency.name;
      name.title = dependency.name;
      const details = document.createElement("small");
      details.textContent = getDependencyDetails(dependency, users);
      copy.append(name, details);

      const actions = document.createElement("div");
      actions.className = "mod-manager-dependency-actions";
      const directory = document.createElement("button");
      directory.type = "button";
      directory.title = "Open Dependency Folder";
      directory.innerHTML = modManagerTemplates.openDirectoryIcon();
      directory.addEventListener("click", () =>
        Neutralino.os
          .open(
            `${FS.modsPath}/${dependency.folderName || sanitizePathSegment(dependency.name)}`,
          )
          .catch(() => {}),
      );
      const settings = document.createElement("button");
      settings.type = "button";
      settings.title = "Dependency Settings";
      settings.innerHTML =
        '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
      settings.addEventListener("click", async () => {
        settings.disabled = true;
        settings.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>';
        try {
          await modSettingsModal.open({
            mod: dependency,
            isExecutable: false,
            installedEngines,
            onSaved: onSettingsSaved,
          });
        } finally {
          settings.disabled = false;
          settings.innerHTML =
            '<i class="fa-solid fa-gear" aria-hidden="true"></i>';
        }
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.title = users.length
        ? "Remove dependent mods first"
        : "Delete Dependency";
      remove.disabled = users.length > 0;
      remove.innerHTML = modManagerTemplates.deleteIcon();
      remove.addEventListener("click", async () => {
        remove.disabled = true;
        try {
          await FS.removeInstalledMod(dependency.id);
          onDependencyRemoved(dependency.id);
        } catch (error) {
          remove.disabled = false;
        }
      });
      actions.append(directory, settings, remove);
      row.append(cover, copy, actions);
      list.append(row);
    });
    section.append(list);
    container.append(section);
  },
};
