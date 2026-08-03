export const existingStorageModal = {
  show({ weekboxPath }) {
    const modal = document.createElement("section");
    modal.className = "error-overlay";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "existing-storage-title");
    modal.innerHTML = `
      <div class="error-content" role="document">
        <div class="error-rail" aria-hidden="true"><i class="fa-solid fa-hard-drive"></i></div>
        <div class="error-main">
          <header class="error-header">
            <div><h2 id="existing-storage-title">Use this WeekBox library?</h2></div>
            <button type="button" class="error-close" aria-label="Cancel"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>
          </header>
          <p class="error-summary">Use the existing library as-is, or move the current library here. Replacing keeps the old library in a timestamped backup folder.</p>
          <p class="storage-recommendation-path"></p>
          <footer class="error-actions">
            <button type="button" class="error-action existing-storage-cancel">Cancel</button>
            <button type="button" class="error-action existing-storage-replace"><i class="fa-solid fa-right-left" aria-hidden="true"></i><span>Replace with current</span></button>
            <button type="button" class="error-action error-settings existing-storage-use"><i class="fa-solid fa-folder-open" aria-hidden="true"></i><span>Use this library</span></button>
          </footer>
        </div>
      </div>`;

    modal.querySelector(".storage-recommendation-path").textContent =
      weekboxPath;
    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));

    return new Promise((resolve) => {
      const close = (choice) => {
        modal.classList.remove("show");
        setTimeout(() => {
          modal.remove();
          resolve(choice);
        }, 220);
      };
      modal.querySelector(".error-close").onclick = () => close("cancel");
      modal.querySelector(".existing-storage-cancel").onclick = () =>
        close("cancel");
      modal.querySelector(".existing-storage-use").onclick = () => close("use");
      modal.querySelector(".existing-storage-replace").onclick = () =>
        close("replace");
      modal.onclick = (event) => {
        if (event.target === modal) close("cancel");
      };
      modal.querySelector(".existing-storage-use").focus();
    });
  },
};
