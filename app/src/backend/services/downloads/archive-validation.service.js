import { find7zBinary, get7zTestCommand } from "./archive-tools.service.js";
import { isNonFatalUnzipFilenameWarning } from "./archive-extraction.service.js";
import {
  getHtmlResponseError,
  isGoogleDriveConfirmationPage,
  isGoogleDriveQuotaError,
  looksLikeHtmlResponse,
} from "./download-validation.util.js";

export class ArchiveValidationService {
  constructor({
    spawnProcessWithShell,
    listenForProcess,
    appendProcessOutput,
    getUsefulProcessOutput,
    logGoogleDriveDebug,
  }) {
    this.spawnProcessWithShell = spawnProcessWithShell;
    this.listenForProcess = listenForProcess;
    this.appendProcessOutput = appendProcessOutput;
    this.getUsefulProcessOutput = getUsefulProcessOutput;
    this.logGoogleDriveDebug = logGoogleDriveDebug;
  }

  async detectFormat(path) {
    try {
      const data = new Uint8Array(
        await Neutralino.filesystem.readBinaryFile(path, { pos: 0, size: 560 }),
      );
      const startsWith = (...bytes) =>
        bytes.every((byte, index) => data[index] === byte);
      if (startsWith(80, 75)) return "zip";
      if (startsWith(82, 97, 114, 33, 26, 7)) return "rar";
      if (startsWith(55, 122, 188, 175, 39, 28)) return "7z";
      if (startsWith(31, 139)) return "gzip";
      if (String.fromCharCode(...data.slice(257, 262)) === "ustar")
        return "tar";
    } catch {}
    try {
      const stats = await Neutralino.filesystem.getStats(path);
      const trailer = new Uint8Array(
        await Neutralino.filesystem.readBinaryFile(path, {
          pos: Math.max(0, Number(stats.size) - 512),
          size: 512,
        }),
      );
      if ([107, 111, 108, 121].every((byte, index) => trailer[index] === byte))
        return "dmg";
    } catch {}
    return "unknown";
  }

  async verifyReadable(archivePath, archiveFormat) {
    if (archiveFormat === "dmg") return;
    const binaryPath = await find7zBinary();
    if (!binaryPath) return;
    const process = await this.spawnProcessWithShell(
      get7zTestCommand(binaryPath, archivePath),
    );
    let processOutput = "";
    await this.listenForProcess(
      process,
      () => null,
      (event, handler, resolve, reject) => {
        if (event.action === "stdOut" || event.action === "stdErr") {
          processOutput = this.appendProcessOutput(processOutput, event.data);
          return;
        }
        if (event.action !== "exit") return;
        Neutralino.events.off("spawnedProcess", handler);
        const exitCode = Number(event.data);
        if (
          exitCode === 0 ||
          exitCode === 1 ||
          isNonFatalUnzipFilenameWarning(exitCode, processOutput)
        ) {
          resolve();
          return;
        }
        const error = new Error(
          `The downloaded ${archiveFormat} archive failed integrity verification. Try the download again or choose another link.`,
        );
        error.archiveDiagnostics = {
          stage: "archive-test",
          format: archiveFormat,
          retryable: false,
          output: this.getUsefulProcessOutput(processOutput),
        };
        reject(error);
      },
    );
  }

  async validateResponse(archivePath, stats) {
    const sample = new TextDecoder().decode(
      await Neutralino.filesystem.readBinaryFile(archivePath, {
        pos: 0,
        size: 8192,
      }),
    );
    if (looksLikeHtmlResponse(sample)) {
      this.logGoogleDriveDebug("archive-validation-html", {
        bytes: stats.size,
        hasConfirmation: isGoogleDriveConfirmationPage(sample),
        hasQuotaText: isGoogleDriveQuotaError(sample),
      });
    }
    const htmlError = getHtmlResponseError(sample);
    if (htmlError) {
      htmlError.archiveDiagnostics = {
        stage: "html-response",
        retryable: false,
      };
      throw htmlError;
    }
    if (!looksLikeHtmlResponse(sample)) return;
    const error = new Error(
      "The download server returned a web page instead of the archive. Select another download link and try again.",
    );
    error.archiveDiagnostics = {
      stage: "html-response",
      retryable: false,
    };
    throw error;
  }

  async validateSmallResponse(archivePath) {
    try {
      const sample = await Neutralino.filesystem.readFile(archivePath);
      if (!/<!(?:DOCTYPE html|doctype html)|<html|<HTML/.test(sample)) return;
      if (isGoogleDriveQuotaError(sample)) {
        throw new Error(
          "Google Drive: Este archivo ha superado la cuota de descargas porque demasiados usuarios lo han descargado recientemente. Inténtalo más tarde o prueba con otro enlace.",
        );
      }
      const titleMatch = sample.match(/<title[^>]*>([^<]+)<\/title>/i);
      const headingMatch = sample.match(/<h1[^>]*>([^<]+)<\/h1>/i);
      const pMatch = sample.match(
        /<p[^>]*class="[^"]*error[^"]*"[^>]*>([^<]+)<\/p>/i,
      );
      const errorReason =
        pMatch?.[1]?.trim() ||
        headingMatch?.[1]?.trim() ||
        titleMatch?.[1]?.trim() ||
        "Web page returned";
      throw new Error(
        `La descarga falló: El servidor devolvió una página web ('${errorReason}') en lugar de un archivo de mod.`,
      );
    } catch (error) {
      if (
        error.message?.includes("Google Drive:") ||
        error.message?.includes("La descarga falló:") ||
        error.message?.includes("The downloaded archive is empty")
      )
        throw error;
    }
  }

  async verifyFormat(archivePath) {
    const archiveFormat = /\.dmg$/i.test(String(archivePath))
      ? "dmg"
      : await this.detectFormat(archivePath);
    if (archiveFormat === "unknown") {
      const error = new Error(
        "The downloaded file is not a recognized archive. Choose another download link and try again.",
      );
      error.archiveDiagnostics = {
        stage: "format",
        retryable: false,
      };
      throw error;
    }
    await this.verifyReadable(archivePath, archiveFormat);
  }

  async verifyDownloadedContent(
    archivePath,
    expectedSize = 0,
    validateArchive = true,
  ) {
    const stats = await Neutralino.filesystem.getStats(archivePath);
    if (stats.size === 0) {
      throw new Error("The downloaded archive is empty (0 bytes).");
    }
    await this.validateResponse(archivePath, stats);
    if (
      Number(expectedSize) > 0 &&
      Number(stats.size) !== Number(expectedSize)
    ) {
      throw Object.assign(
        new Error(
          `The downloaded archive was incomplete. Expected ${expectedSize} bytes but found ${stats.size}. Try the download again.`,
        ),
        { archiveDiagnostics: { stage: "size", retryable: true } },
      );
    }
    if (stats.size < 500 * 1024) await this.validateSmallResponse(archivePath);
    if (validateArchive) await this.verifyFormat(archivePath);
    return stats;
  }
}
