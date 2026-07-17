import { FS } from "../../utils/filesystem.js";
import { sanitizePathSegment } from "../../utils/filesystem/pathUtils.js";
import { modManagerTemplates } from "../../html/components/mod-manager.js";

export const dependenciesRenderer = {
  render(container, dependencies, allMods, onDependencyRemoved) {
    if (!dependencies.length) return;
    const fragment = document.createDocumentFragment();
    const section = document.createElement("section");
    section.className = "mod-manager-dependencies";
    const list = document.createElement("div");
    list.className = "mod-manager-dependency-list";
    for (const dependency of dependencies) {
      const row = document.createElement("article");
      row.className = "mod-manager-dependency";
      const copy = document.createElement("div");
      const name = document.createElement("strong");
      name.textContent = dependency.name;
      const users = allMods.filter(
        (mod) =>
          mod.kind !== "dependency" &&
          Array.isArray(mod.dependencies) &&
          mod.dependencies.includes(dependency.id),
      );
      const details = document.createElement("small");
      details.textContent = users.length
        ? `Used by ${users.map((mod) => mod.name).join(", ")}`
        : dependency.sourceType === "tool"
          ? "GameBanana tool dependency"
          : "GameBanana mod dependency";
      copy.append(name, details);
      const actions = document.createElement("div");
      actions.className = "mod-manager-dependency-actions";
      const directory = document.createElement("button");
      directory.type = "button";
      directory.title = "Open Directory";
      directory.innerHTML = modManagerTemplates.openDirectoryIcon();
      directory.addEventListener("click", () =>
        Neutralino.os
          .open(
            `${FS.modsPath}/${dependency.folderName || sanitizePathSegment(dependency.name)}`,
          )
          .catch(() => {}),
      );
      const remove = document.createElement("button");
      remove.type = "button";
      remove.title = users.length
        ? "Remove dependent mods first"
        : "Remove Dependency";
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
      actions.append(directory, remove);
      row.append(copy, actions);
      list.append(row);
    }
    section.append(list);
    fragment.append(section);
    container.append(fragment);
  }
};