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

function quoteCommandArgument(value) {
  const argument = String(value ?? "").replace(/[\r\n]/g, "");
  if (window.NL_OS === "Windows") {
    return `"${argument.replace(/["^]/g, "^$&")}"`;
  }
  return `'${argument.replaceAll("'", `'"'"'`)}'`;
}

var _ModCoverService = class _ModCoverService {
  constructor({ api, getStoragePaths }) {
    this.api = api;
    this.getStoragePaths = getStoragePaths;
  }
  get coversPath() {
    return this.getStoragePaths().modCoversPath;
  }
  getCoverPath(modId) {
    return `${this.coversPath}/${safeCoverName(modId)}.webp`;
  }
  getIconPath(modId) {
    return `${this.coversPath}/${safeCoverName(modId)}.icon.webp`;
  }
  async readPath(path) {
    if (!(await this.api.exists(path))) return null;
    const bytes = await this.api.read(path, true);
    return blobToDataUrl(new Blob([bytes], { type: "image/webp" }));
  }
  async read(modId) {
    return this.readPath(this.getCoverPath(modId));
  }
  async readIcon(modId) {
    return this.readPath(this.getIconPath(modId));
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
  async optimizeIcon(blob) {
    if (typeof document === "undefined") return blob;
    const sourceUrl = URL.createObjectURL(blob);
    try {
      const image = new Image();
      image.src = sourceUrl;
      await image.decode();
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight);
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = 256;
      canvas
        .getContext("2d")
        .drawImage(
          image,
          (image.naturalWidth - cropSize) / 2,
          (image.naturalHeight - cropSize) / 2,
          cropSize,
          cropSize,
          0,
          0,
          256,
          256,
        );
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
  async saveIconDataUrl(modId, dataUrl) {
    if (!dataUrl) return null;
    await this.api.ensureDir(this.coversPath);
    const optimized = await this.optimizeIcon(
      await (await fetch(dataUrl)).blob(),
    );
    await this.api.write(
      this.getIconPath(modId),
      await optimized.arrayBuffer(),
      true,
    );
    return `mod-covers/${safeCoverName(modId)}.icon.webp`;
  }
  async saveIconUrl(modId, url) {
    if (!url) return null;
    const blob = await this.fetchUrlBlob(url);
    await this.api.ensureDir(this.coversPath);
    const optimized = await this.optimizeIcon(blob);
    await this.api.write(
      this.getIconPath(modId),
      await optimized.arrayBuffer(),
      true,
    );
    return `mod-covers/${safeCoverName(modId)}.icon.webp`;
  }
  async saveUrl(modId, url) {
    if (!url) return null;
    return this.saveBlob(modId, await this.fetchUrlBlob(url));
  }
  async fetchUrlBlob(url) {
    if (typeof Neutralino === "undefined" || !Neutralino.os?.execCommand) {
      const response = await fetch(url);
      if (!response.ok) throw new Error("Could not download mod artwork");
      return response.blob();
    }
    await this.api.ensureDir(this.coversPath);
    const tempPath = `${this.coversPath}/.artwork-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`;
    const command = `curl --globoff --silent --show-error --location --fail --connect-timeout 8 --max-time 30 ${quoteCommandArgument(url)} -o ${quoteCommandArgument(tempPath)}`;
    try {
      const result = await Neutralino.os.execCommand(command, { background: false });
      if (result.exitCode !== 0) throw new Error("Could not download mod artwork");
      const bytes = await this.api.read(tempPath, true);
      return new Blob([bytes]);
    } finally {
      await this.api.remove(tempPath).catch(() => {});
    }
  }
  async saveNoImagePlaceholder(modId) {
    const response = await fetch("assets/img/placeholder-mini.jpg");
    if (!response.ok) throw new Error("Could not load the fallback mod image");
    return this.saveBlob(modId, await response.blob());
  }
  async remove(modId) {
    await this.api.remove(this.getCoverPath(modId));
  }
  async removeIcon(modId) {
    await this.api.remove(this.getIconPath(modId));
  }
};

var ModCoverService = _ModCoverService;

export { ModCoverService };
