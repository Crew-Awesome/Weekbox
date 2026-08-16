function safeCoverName(modId) {
  return encodeURIComponent(String(modId)).replaceAll("%", "_");
}

async function blobToDataUrl(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const base64 = typeof Buffer !== "undefined"
    ? Buffer.from(bytes).toString("base64")
    : btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""));
  return `data:${blob.type || "application/octet-stream"};base64,${base64}`;
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
    if (!(await this.api.exists(path))) return null;
    const bytes = await this.api.read(path, true);
    return blobToDataUrl(new Blob([bytes], { type: "image/webp" }));
  }
  async optimize(blob) {
    if (
      typeof document === "undefined" ||
      typeof document.createElement !== "function"
    ) return blob;
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
      canvas
        .getContext("2d")
        .drawImage(image, 0, 0, canvas.width, canvas.height);
      return await new Promise((resolve) =>
        canvas.toBlob((result) => resolve(result || blob), "image/webp", 0.84),
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
      true,
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
    const placeholderPath = `${window.NL_PATH}/assets/images/placeholder-mini.jpg`;
    const bytes = await Neutralino.filesystem.readBinaryFile(placeholderPath);
    return this.saveBlob(
      modId,
      new Blob([bytes], { type: "image/jpeg" }),
    );
  }
  async remove(modId) {
    await this.api.remove(this.getCoverPath(modId));
  }
};

var ModCoverService = _ModCoverService;

export { ModCoverService };
