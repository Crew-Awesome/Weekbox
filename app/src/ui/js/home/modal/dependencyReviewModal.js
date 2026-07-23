function ensureModal() {
  let overlay = document.getElementById("dependency-review-modal");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "dependency-review-modal";
  overlay.className = "dependency-review-overlay";
  overlay.hidden = true;
  overlay.innerHTML = `
    <section class="dependency-review-modal" role="dialog" aria-modal="true" aria-labelledby="dependency-review-title">
      <div class="dependency-review-heading">
        <i class="fa-solid fa-puzzle-piece" aria-hidden="true"></i>
        <div><h2 id="dependency-review-title">Install dependencies</h2></div>
      </div>
      <div class="dependency-review-list"></div>
      <div class="dependency-review-actions">
        <button type="button" class="dependency-review-cancel">Cancel</button>
        <button type="button" class="dependency-review-confirm">Install selected</button>
      </div>
    </section>`;
  document.body.appendChild(overlay);
  return overlay;
}

export const dependencyReviewModal = {
  review(requirements) {
    const overlay = ensureModal();
    const list = overlay.querySelector(".dependency-review-list");
    list.replaceChildren(
      ...requirements.map((requirement) => {
        const row = document.createElement("label");
        row.className = "dependency-review-item";
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.checked = true;
        checkbox.value = requirement.dependencyId;
        const copy = document.createElement("span");
        copy.className = "dependency-review-copy";
        const name = document.createElement("strong");
        name.textContent = requirement.title;
        const meta = document.createElement("small");
        meta.textContent = requirement.fileSizeStr || "";
        copy.append(name);
        if (requirement.fileSizeStr) copy.append(meta);
        const open = document.createElement("button");
        open.type = "button";
        open.className = "dependency-review-open";
        open.title = "Open on GameBanana";
        open.setAttribute(
          "aria-label",
          `Open ${requirement.title} on GameBanana`,
        );
        open.innerHTML =
          '<i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i>';
        open.addEventListener("click", (event) => {
          event.preventDefault();
          Neutralino.os.open(requirement.gameBananaUrl).catch(() => {});
        });
        row.append(checkbox, copy, open);
        return row;
      }),
    );

    return new Promise((resolve) => {
      const confirm = overlay.querySelector(".dependency-review-confirm");
      const cancel = overlay.querySelector(".dependency-review-cancel");
      const finish = (result) => {
        overlay.classList.remove("show");
        document.removeEventListener("keydown", onKeydown);
        setTimeout(() => (overlay.hidden = true), 180);
        resolve(result);
      };
      const onKeydown = (event) => {
        if (event.key === "Escape") finish(null);
      };
      cancel.onclick = () => finish(null);
      confirm.onclick = () => {
        const selected = new Set(
          [...list.querySelectorAll("input:checked")].map(
            (input) => input.value,
          ),
        );
        finish(requirements.filter((item) => selected.has(item.dependencyId)));
      };
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add("show"));
      document.addEventListener("keydown", onKeydown);
      confirm.focus();
    });
  },
};
