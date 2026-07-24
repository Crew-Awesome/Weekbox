function safeCoverName(modId) {
  return encodeURIComponent(String(modId)).replaceAll("%", "_");
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", reject);
    reader.readAsDataURL(blob);
  });
}

var _ModCoverService = class _ModCoverService {
  constructor({ api, getDataPath }) {
    this.api = api;
    this.getDataPath = getDataPath;
  }
  get coversPath() {
    return `${this.getDataPath()}/mod-covers`;
  }
  getCoverPath(modId) {
    return `${this.coversPath}/${safeCoverName(modId)}.webp`;
  }
  async read(modId) {
    const path = this.getCoverPath(modId);
    if (!await this.api.exists(path)) return null;
    const bytes = await this.api.read(path, true);
    return blobToDataUrl(new Blob([bytes], { type: "image/webp" }));
  }
  async optimize(blob) {
    if (typeof document === "undefined") return blob;
    const sourceUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      const maxWidth = 960;
      const scale = Math.min(1, maxWidth / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise(
        (resolve) => canvas.toBlob((result) => resolve(result || blob), "image/webp", 0.84)
      );
    } catch {
      return blob;
    } finally {
      URL.revokeObjectURL(sourceUrl);
    }
  }
  async saveBlob(modId, blob) {
    await this.api.ensureDir(this.coversPath);
    const optimized = await this.optimize(blob);
    await this.api.write(
      this.getCoverPath(modId),
      await optimized.arrayBuffer(),
      true
    );
    return `mod-covers/${safeCoverName(modId)}.webp`;
  }
  async saveDataUrl(modId, dataUrl) {
    if (!dataUrl) return null;
    return this.saveBlob(modId, await (await fetch(dataUrl)).blob());
  }
  async saveUrl(modId, url) {
    if (!url) return null;
    const response = await fetch(url);
    if (!response.ok) throw new Error("Could not download the mod cover");
    return this.saveBlob(modId, await response.blob());
  }
  async saveNoImagePlaceholder(modId) {
    const canvas = document.createElement("canvas");
    canvas.width = 960;
    canvas.height = 540;
    const context = canvas.getContext("2d");
    context.fillStyle = "#4b4b4b";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ffffff";
    context.font = "800 48px Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("NO IMAGE ASSIGNED", canvas.width / 2, canvas.height / 2);
    const image = await new Promise(
      (resolve) => canvas.toBlob(resolve, "image/webp", 0.84)
    );
    if (!image) throw new Error("Could not create the fallback mod image");
    return this.saveBlob(modId, image);
  }
  async remove(modId) {
    await this.api.remove(this.getCoverPath(modId));
  }
};

var ModCoverService = _ModCoverService;

export { ModCoverService };
