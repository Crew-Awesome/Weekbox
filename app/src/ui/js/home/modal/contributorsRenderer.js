import { backstageApi } from "../../../../backend/providers/backstage/backstage.provider.js";
import { t } from "../../i18n/index.js";
export function renderModalContributors(
  data,
  { safeExternalUrl, setAvatarImage, openAuthor },
) {
  const groups = document.getElementById("modal-credit-groups");
  const empty = document.getElementById("modal-no-credits");
  if (!groups) return;
  groups.replaceChildren();
  if (data.source === "gamejolt") {
    const songs = Array.isArray(data.songs)
      ? data.songs.filter((song) => song?.title || song?.filename)
      : [];
    if (empty) empty.hidden = songs.length > 0;
    for (const song of songs) {
      const row = document.createElement("div");
      row.className = "gamejolt-track-row";
      const heading = document.createElement("div");
      heading.className = "gamejolt-track-heading";
      const copy = document.createElement("span");
      copy.className = "gamejolt-track-copy";
      const title = document.createElement("strong");
      title.textContent = song.title || song.filename || "Untitled track";
      copy.append(title);
      heading.append(copy);
      row.appendChild(heading);
      const url = safeExternalUrl(song.url);
      if (url) {
        const audio = document.createElement("audio");
        audio.className = "gamejolt-track-player";
        audio.controls = true;
        audio.preload = "none";
        audio.src = url;
        audio.setAttribute("aria-label", `Play ${title.textContent}`);
        audio.addEventListener("play", () => {
          document
            .querySelectorAll("#mod-modal .gamejolt-track-player")
            .forEach((other) => {
              if (other !== audio) other.pause();
            });
        });
        row.appendChild(audio);
      }
      groups.appendChild(row);
    }
    return;
  }
  const credits = Array.isArray(data.credits) ? data.credits : [];
  if (empty) empty.hidden = credits.length > 0;
  const fragment = document.createDocumentFragment();
  const creditAvatars = new Map();
  credits.forEach((group) => {
    const section = document.createElement("section");
    section.className = "modal-credit-group";
    const heading = document.createElement("h4");
    heading.className = "modal-credit-group-title";
    heading.textContent = group.name;
    const list = document.createElement("div");
    list.className = "modal-credit-list";
    group.authors.forEach((author) => {
      const row = document.createElement("div");
      row.className = "modal-credit-row";
      const avatar = document.createElement("img");
      avatar.className = "modal-credit-avatar";
      avatar.alt = "";
      avatar.loading = "lazy";
      if (!author.id && !author.url) avatar.classList.add("is-unlinked");
      setAvatarImage(avatar, author.avatar);
      if (data.source === "backstage" && author.id != null) {
        const userId = String(author.id);
        if (!creditAvatars.has(userId)) creditAvatars.set(userId, []);
        creditAvatars.get(userId).push(avatar);
      }
      let avatarContent = avatar;
      if (author.id) {
        const avatarButton = document.createElement("button");
        avatarButton.type = "button";
        avatarButton.className = "modal-credit-avatar-button";
        avatarButton.setAttribute(
          "aria-label",
          `Open ${author.name}'s profile`,
        );
        avatarButton.onclick = () =>
          openAuthor(author.id, author.source || "gamebanana");
        avatarButton.appendChild(avatar);
        avatarContent = avatarButton;
      }
      const info = document.createElement("div");
      info.className = "modal-credit-info";
      const nameRow = document.createElement("div");
      nameRow.className = "modal-credit-name-row";
      const name = author.id
        ? document.createElement("button")
        : document.createElement("span");
      name.className = "modal-credit-name";
      name.textContent = author.name;
      nameRow.appendChild(name);
      if (author.id) {
        name.type = "button";
        name.onclick = () =>
          openAuthor(author.id, author.source || "gamebanana");
      } else if (data.source !== "backstage" && safeExternalUrl(author.url)) {
        const authorUrl = safeExternalUrl(author.url);
        const link = document.createElement("a");
        link.className = "modal-credit-link";
        link.href = authorUrl;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.setAttribute("aria-label", t("common.openOnWebsite"));
        link.title = t("common.openOnWebsite");
        link.innerHTML = '<i class="fa-solid fa-link" aria-hidden="true"></i>';
        link.onclick = (event) => {
          event.preventDefault();
          Neutralino.os.open(authorUrl).catch(() => {});
        };
        nameRow.appendChild(link);
      }
      info.appendChild(nameRow);
      if (author.role) {
        const role = document.createElement("span");
        role.className = "modal-credit-role";
        role.textContent = author.role;
        info.appendChild(role);
      }
      row.append(avatarContent, info);
      list.appendChild(row);
    });
    section.append(heading, list);
    fragment.appendChild(section);
  });
  groups.appendChild(fragment);
  creditAvatars.forEach((avatars, userId) => {
    void backstageApi
      .getUserProfile(userId)
      .then((profile) => {
        if (!profile?.avatar) return;
        avatars.forEach((avatar) => {
          if (avatar.isConnected) setAvatarImage(avatar, profile.avatar);
        });
      })
      .catch(() => {});
  });
}
