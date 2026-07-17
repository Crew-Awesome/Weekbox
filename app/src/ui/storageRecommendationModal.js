export const storageRecommendationModal = {
  ensure() {
    let modal = document.getElementById("storage-recommendation-modal");
    if (modal) return modal;

    modal = document.createElement("section");
    modal.id = "storage-recommendation-modal";
    modal.className = "error-overlay storage-recommendation-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "storage-recommendation-title");
    modal.innerHTML = `
      <div class="error-content" role="document">
        <div class="error-rail" aria-hidden="true"><i class="fa-solid fa-hard-drive"></i></div>
        <div class="error-main">
          <header class="error-header">
            <div><h2 id="storage-recommendation-title">Move WeekBox to a safer location?</h2></div>
            <button type="button" class="error-close" aria-label="Remind me later"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <p class="error-summary"></p>
          <p class="storage-recommendation-path"></p>
          <footer class="error-actions">
            <button type="button" class="error-action storage-dismiss">Don't remind me</button>
            <button type="button" class="error-action storage-later">Not now</button>
            <button type="button" class="error-action error-settings storage-move"><i class="fa-solid fa-arrow-right" aria-hidden="true"></i><span>Move now</span></button>
          </footer>
        </div>
      </div>`;
    document.body.appendChild(modal);
    return modal;
  },

  show({ currentPath, defaultPath }) {
    const modal = this.ensure();
    modal.querySelector(".error-summary").textContent =
      `WeekBox is currently stored in ${currentPath}. Cloud-synced and Documents folders can cause file-locking or sync problems with engines and mods.`;
    modal.querySelector(".storage-recommendation-path").textContent =
      `Recommended: ${defaultPath}/WeekBox`;
    modal.style.display = "flex";
    requestAnimationFrame(() => modal.classList.add("show"));

    return new Promise((resolve) => {
      const close = (choice) => {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.style.display = "none";
          resolve(choice);
        }, 220);
      };
      modal.querySelector(".error-close").onclick = () => close("later");
      modal.querySelector(".storage-later").onclick = () => close("later");
      modal.querySelector(".storage-dismiss").onclick = () => close("dismiss");
      modal.querySelector(".storage-move").onclick = () => close("move");
      modal.onclick = (event) => {
        if (event.target === modal) close("later");
      };
    });
  },
};
