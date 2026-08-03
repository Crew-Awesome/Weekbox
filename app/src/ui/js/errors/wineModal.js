export const wineModal = {
  close() {
    const modal = document.getElementById("wine-missing-modal");
    if (!modal) return;
    modal.classList.remove("show");
    setTimeout(() => modal.remove(), 220);
  },

  show() {
    if (document.getElementById("wine-missing-modal")) return;

    const modal = document.createElement("section");
    modal.id = "wine-missing-modal";
    modal.className = "app-update-overlay"; // Reusing the update overlay class for consistency
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.innerHTML = `
      <div class="app-update-content" style="max-width: 400px; padding: 24px; text-align: center;">
        <div class="app-update-icon" style="color: #ff9800; font-size: 2.5rem; margin-bottom: 16px;">
          <i class="fa-solid fa-wine-glass" aria-hidden="true"></i>
        </div>
        <div class="app-update-main">
          <h2 id="app-update-title" style="margin: 0 0 12px 0;">Wine is missing</h2>
          <p class="app-update-copy" style="margin: 0 0 20px 0; color: #a1a1aa; line-height: 1.5;">
            To play Windows (.exe) mods on Linux, you need to install <strong>Wine</strong>.<br><br>
            Please install it using your distribution's package manager, for example:<br>
            <code style="background: #27272a; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-top: 8px;">sudo apt install wine</code>
          </p>
          <div class="app-update-actions" style="justify-content: center;">
            <button class="app-update-install" type="button" style="width: 100%;">Got it</button>
          </div>
        </div>
      </div>`;

    const close = () => this.close();
    modal.querySelector(".app-update-install").addEventListener("click", close);
    modal.addEventListener("click", (event) => {
      if (event.target === modal) close();
    });

    document.body.appendChild(modal);
    requestAnimationFrame(() => modal.classList.add("show"));
    modal.querySelector(".app-update-install").focus();
  },
};

// Automatically listen for the missing wine event
window.addEventListener("wine-missing", () => {
  wineModal.show();
});
