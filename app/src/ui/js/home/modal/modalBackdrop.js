export function setModalBackdrop(modal, imageUrl) {
  if (!modal) return;
  const value = String(imageUrl || "").trim();
  if (!value) {
    modal.style.removeProperty("--modal-backdrop-image");
    modal.classList.remove("has-backdrop");
    return;
  }

  const escaped = value.replace(/[\\"\r\n]/g, (character) => `\\${character}`);
  modal.style.setProperty("--modal-backdrop-image", `url("${escaped}")`);
  modal.classList.add("has-backdrop");
}
