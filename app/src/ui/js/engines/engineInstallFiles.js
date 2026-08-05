function throwIfCancelled(isCancelled) {
  if (isCancelled()) throw new Error("Cancelled");
}

export async function flattenEngineDirectory({
  engineDir,
  findExecutable,
  isCancelled = () => false,
  platform = window.NL_OS,
  filesystem = Neutralino.filesystem,
  os = Neutralino.os,
}) {
  // macOS engines are commonly .app bundles. Moving the nested executable
  // to the engine root breaks the bundle and prevents macOS from launching it.
  if (platform === "Darwin") return;
  throwIfCancelled(isCancelled);
  const executablePath = await findExecutable(engineDir);
  throwIfCancelled(isCancelled);
  if (!executablePath) return;

  const executableDir = executablePath
    .slice(
      0,
      Math.max(
        executablePath.lastIndexOf("/"),
        executablePath.lastIndexOf("\\"),
      ),
    )
    .replace(/\\/g, "/");
  const normalizedEngineDir = engineDir.replace(/\\/g, "/");
  if (
    executableDir === normalizedEngineDir ||
    !executableDir.startsWith(normalizedEngineDir)
  )
    return;

  try {
    const files = await filesystem.readDirectory(executableDir);
    for (const file of files) {
      throwIfCancelled(isCancelled);
      if (file.entry === "." || file.entry === "..") continue;
      const src = `${executableDir}/${file.entry}`;
      const dest = `${normalizedEngineDir}/${file.entry}`;
      /**
       * @fix 2026-08-05T03:31:10.964Z - Fix NE_FS_MOVEERR during engine directory flattening
       */
      let moved = false;
      for (let attempt = 1; attempt <= 4; attempt += 1) {
        try {
          await filesystem.move(src, dest);
          moved = true;
          break;
        } catch {
          if (attempt < 4) await new Promise((r) => setTimeout(r, attempt * 100));
        }
      }
      if (!moved) {
        try {
          await filesystem.copy(src, dest, { recursive: true, overwrite: true, skip: false });
          await filesystem.remove(src).catch(() => {});
        } catch {}
      }
    }
    throwIfCancelled(isCancelled);

    const relativePart = executableDir.substring(
      normalizedEngineDir.length + 1,
    );
    const directoryToRemove = `${normalizedEngineDir}/${relativePart.split("/")[0]}`;
    if (platform === "Windows") {
      await os
        .execCommand(
          `rmdir /S /Q "${directoryToRemove.replace(/\//g, "\\")}"`,
          {
            background: true,
          },
        )
        .catch(() => {});
    } else {
      await os
        .execCommand(`rm -rf "${directoryToRemove}"`, { background: true })
        .catch(() => {});
    }
  } catch (error) {
    console.warn("Could not organize engine folder:", error);
  }
}

export async function describeExtractedFiles({
  directory,
  limit = 24,
  filesystem = Neutralino.filesystem,
}) {
  const files = [];
  const directories = [directory];
  const root = directory.replace(/\\/g, "/");
  while (directories.length && files.length < limit) {
    const currentDirectory = directories.shift();
    let entries;
    try {
      entries = await filesystem.readDirectory(currentDirectory);
    } catch (error) {
      return `Could not list extracted files: ${error?.message || String(error)}`;
    }
    for (const entry of entries) {
      if (entry.entry === "." || entry.entry === "..") continue;
      const fullPath = `${currentDirectory}/${entry.entry}`;
      if (String(entry.type).toUpperCase() === "DIRECTORY") {
        directories.push(fullPath);
      } else {
        files.push(fullPath.slice(root.length + 1));
        if (files.length >= limit) break;
      }
    }
  }
  return files.length
    ? files.join(", ") + (directories.length ? ", …" : "")
    : "No files were found after extraction";
}
