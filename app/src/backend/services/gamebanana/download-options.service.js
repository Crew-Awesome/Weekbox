import { getGoogleDriveFileId } from "../downloads/external-download.resolver.js";
import { gameBananaExternalDownloads } from "./external-download.service.js";

export class GameBananaDownloadOptionsService {
  getExternalFiles(data, api) {
    const supportedHosts = new Set([
      "drive.google.com",
      "drive.usercontent.google.com",
      "docs.google.com",
      "mediafire.com",
      "www.mediafire.com",
      "github.com",
    ]);
    const files = new Map();
    const addExternal = (value, name = "") => {
      try {
        const url = new URL(value);
        const hostname = url.hostname.toLowerCase();
        if (!supportedHosts.has(hostname)) return;
        if (
          [
            "drive.google.com",
            "drive.usercontent.google.com",
            "docs.google.com",
          ].includes(hostname) &&
          !getGoogleDriveFileId(url)
        ) {
          return;
        }
        if (
          hostname === "github.com" &&
          !/^\/[^/]+\/[^/]+\/releases\/download\/[^/]+\/[^/]+$/i.test(
            url.pathname,
          )
        ) {
          return;
        }
        if (!files.has(url.href)) {
          files.set(url.href, {
            id: `external:${url.href}`,
            type: "external",
            name: name || url.hostname,
            fileSize: 0,
            fileSizeStr: api.getExternalDownloadLabel(url.href),
            downloadUrl: url.href,
          });
        }
      } catch {}
    };

    const rawAlternateSources = data?._aAlternateFileSources;
    const alternateSources = Array.isArray(rawAlternateSources)
      ? rawAlternateSources
      : rawAlternateSources?.url || rawAlternateSources?._sUrl
        ? [rawAlternateSources]
        : Object.values(rawAlternateSources || {});
    alternateSources.forEach((source) => {
      if (source && typeof source === "object") {
        addExternal(
          source.url || source._sUrl,
          source.description || source._sDescription,
        );
      }
    });
    return [...files.values()];
  }

  formatDate(timestamp) {
    const date = new Date(Number(timestamp) * 1000);
    if (!Number.isFinite(date.getTime())) return null;
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  async getOptions(data, api) {
    const options = [
      ...api
        .getDownloadFiles(data)
        .filter((file) => api.isInstallableDownloadFile(file))
        .map((file, index) => ({
          id: `file:${file._idRow || index}`,
          type: "gamebanana",
          name:
            file._sFile ||
            file._sDescription ||
            file._sVersion ||
            `File ${index + 1}`,
          fileSize: Number(file._nFilesize || 0),
          fileSizeStr: api.formatBytes(file._nFilesize || 0),
          uploadedAt: Number(file._tsDateAdded || 0),
          uploadedAtLabel: this.formatDate(file._tsDateAdded),
          downloadUrl: file._sDownloadUrl,
        })),
      ...this.getExternalFiles(data, api),
    ];
    options.sort(
      (left, right) =>
        Number(right.uploadedAt || 0) - Number(left.uploadedAt || 0),
    );

    await Promise.all(
      options
        .filter((option) => option.type === "external")
        .map(async (option) => {
          const details = await api.getExternalFileDetails(option.downloadUrl);
          if (!details) {
            option.unavailable = true;
            return;
          }
          if (details.filename) option.name = details.filename;
          if (details.size > 0) {
            option.fileSize = details.size;
            option.fileSizeStr = `${api.getExternalDownloadLabel(option.downloadUrl)} • ${api.formatBytes(details.size)}`;
          }
        }),
    );
    await Promise.all(
      options
        .filter((option) => option.type === "gamebanana")
        .map(async (option) => {
          const available = await api.isDownloadAvailable(option.downloadUrl);
          if (available === false) option.unavailable = true;
        }),
    );

    return options.filter(
      (option) =>
        !option.unavailable &&
        !gameBananaExternalDownloads.isKnownUnavailable(option.downloadUrl),
    );
  }
}

export const gameBananaDownloadOptions = new GameBananaDownloadOptionsService();
