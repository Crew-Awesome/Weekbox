export function createNestedArchiveExtractor({
  executeCommand,
  extractArchive,
  getWindowsExtractionCommand,
  getPowerShellExtractCommand,
  createEntryReporter,
}) {
  const patterns = [
    /\.zip$/i,
    /\.tar\.gz$/i,
    /\.tgz$/i,
    /\.tar$/i,
    /\.7z$/i,
    /\.rar$/i,
  ];

  function isNestedArchive(entryName) {
    return (
      patterns.some((pattern) => pattern.test(entryName)) ||
      (window.NL_OS === "Darwin" && /\.dmg$/i.test(String(entryName)))
    );
  }

  async function collectArchiveFiles(dir) {
    const found = [];
    const stack = [dir];
    while (stack.length) {
      const current = stack.pop();
      let entries;
      try {
        entries = await Neutralino.filesystem.readDirectory(current);
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (entry.entry === "." || entry.entry === "..") continue;
        const fullPath = `${current}/${entry.entry}`;
        if (String(entry.type).toUpperCase() === "DIRECTORY") {
          stack.push(fullPath);
        } else if (isNestedArchive(entry.entry)) {
          found.push(fullPath);
        }
      }
    }
    return found;
  }

  function getExtractionCommand(archivePath, destinationPath) {
    const isWindows = window.NL_OS === "Windows";
    const lower = String(archivePath).toLowerCase();
    if (lower.endsWith(".zip")) {
      if (isWindows)
        return getWindowsExtractionCommand(archivePath, destinationPath);
      return `unzip -oq "${archivePath}" -d "${destinationPath}"`;
    }
    const flags =
      lower.endsWith(".gz") || lower.endsWith(".tgz") ? "-xzf" : "-xf";
    return `tar ${flags} "${archivePath}" -C "${destinationPath}"`;
  }

  async function extractOne(archivePath, getTask, onEntry, reportEntry) {
    if (getTask?.()?.cancelled) throw new Error("Cancelled");
    const parentDir = archivePath.slice(0, archivePath.lastIndexOf("/"));
    if (window.NL_OS === "Darwin" && /\.dmg$/i.test(archivePath)) {
      await extractArchive({
        archivePath,
        destinationPath: parentDir,
        getTask,
        onEntry,
        extractNested: false,
      });
      await Neutralino.filesystem.remove(archivePath).catch(() => {});
      return;
    }

    const command = getExtractionCommand(archivePath, parentDir);
    try {
      await executeCommand(command, getTask, reportEntry);
      await Neutralino.filesystem.remove(archivePath).catch(() => {});
      return;
    } catch (error) {
      let extractionError = error;
      let recovered = false;
      if (
        window.NL_OS === "Windows" &&
        String(extractionError).includes("resolve failed")
      ) {
        const fallbackCommand = command.includes("tar.exe")
          ? command.replace("tar.exe -xf", "tar.exe --force-local -xf")
          : command.replace("tar ", "tar --force-local ");
        if (!command.includes("--force-local")) {
          try {
            await executeCommand(fallbackCommand, getTask, reportEntry);
            recovered = true;
          } catch (retryError) {
            extractionError = retryError;
          }
        }
      }
      if (
        !recovered &&
        window.NL_OS === "Windows" &&
        String(archivePath).toLowerCase().endsWith(".zip")
      ) {
        try {
          await executeCommand(
            getPowerShellExtractCommand(archivePath, parentDir),
            getTask,
            reportEntry,
          );
          recovered = true;
        } catch (psError) {
          extractionError = psError;
        }
      }
      if (recovered) {
        await Neutralino.filesystem.remove(archivePath).catch(() => {});
      } else {
        console.warn(
          "Could not extract nested archive:",
          archivePath,
          extractionError,
        );
      }
    }
  }

  return async function extractNestedArchives(
    destinationPath,
    getTask,
    onEntry,
  ) {
    const reportEntry = createEntryReporter(onEntry);
    for (let pass = 0; pass < 10; pass += 1) {
      const task = getTask?.();
      if (task?.cancelled) throw new Error("Cancelled");
      const archives = await collectArchiveFiles(destinationPath);
      if (!archives.length) break;
      for (const archivePath of archives)
        await extractOne(archivePath, getTask, onEntry, reportEntry);
    }
  };
}
