function normalizePath(path) {
  return String(path || "")
    .trim()
    .replace(/\\/g, "/")
    .replace(/\/+$/, "")
    .toLocaleLowerCase();
}

export function createThrottledProgressReporter(
  report,
  intervalMs = 100,
  now = () => performance.now(),
) {
  let lastReportedAt = -Infinity;
  return (event, { force = false } = {}) => {
    const currentTime = now();
    if (!force && currentTime - lastReportedAt < intervalMs) return false;
    lastReportedAt = currentTime;
    report(event);
    return true;
  };
}

export function quotePosixShellArgument(value) {
  return `'${String(value).replaceAll("'", "'\\''")}'`;
}

export function encodePowerShellCommand(command, encodeBase64 = window.btoa) {
  const bytes = new Uint8Array(command.length * 2);
  for (let index = 0; index < command.length; index += 1) {
    const code = command.charCodeAt(index);
    bytes[index * 2] = code & 0xff;
    bytes[index * 2 + 1] = code >> 8;
  }
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return encodeBase64(binary);
}

export function getStorageDiskForPath(disks, path) {
  const normalizedPath = normalizePath(path);
  const matches = (Array.isArray(disks) ? disks : [])
    .filter((disk) => {
      if (!disk?.mountPoint) return false;
      const mountPoint = normalizePath(disk.mountPoint);
      return (
        normalizedPath === mountPoint ||
        normalizedPath.startsWith(`${mountPoint}/`)
      );
    })
    .sort(
      (left, right) =>
        normalizePath(right.mountPoint).length -
        normalizePath(left.mountPoint).length,
    );
  if (matches.length) return matches[0];
  return Array.isArray(disks) && disks.length === 1 ? disks[0] : null;
}

export function pathsShareStorageMount(disks, sourcePath, destinationPath) {
  const findExplicitDisk = (path) => {
    const normalizedPath = normalizePath(path);
    return (Array.isArray(disks) ? disks : [])
      .filter((disk) => {
        if (!disk?.mountPoint) return false;
        const mountPoint = normalizePath(disk.mountPoint);
        return (
          normalizedPath === mountPoint ||
          normalizedPath.startsWith(`${mountPoint}/`)
        );
      })
      .sort(
        (left, right) =>
          normalizePath(right.mountPoint).length -
          normalizePath(left.mountPoint).length,
      )[0];
  };
  const sourceDisk = findExplicitDisk(sourcePath);
  const destinationDisk = findExplicitDisk(destinationPath);
  if (!sourceDisk?.mountPoint || !destinationDisk?.mountPoint) return false;
  return normalizePath(sourceDisk.mountPoint) ===
    normalizePath(destinationDisk.mountPoint);
}

export function getRequiredStorageBytes(files, verifiedCompletedPaths) {
  const completed = new Set(verifiedCompletedPaths);
  return files.reduce(
    (total, file) =>
      total + (completed.has(file.relativePath) ? 0 : Number(file.size) || 0),
    0,
  );
}

export async function findVerifiedExistingStorageFiles(
  files,
  destinationRoot,
  { exists, getStats, matches },
) {
  const verified = new Set();
  for (const file of files) {
    const destinationPath = `${destinationRoot}/${file.relativePath}`;
    if (!(await exists(destinationPath))) continue;
    const stats = await getStats(destinationPath);
    if (!stats?.isFile || Number(stats.size) !== file.size) {
      throw new Error(
        `The destination already contains a different file at ${file.relativePath}.`,
      );
    }
    if (!(await matches(file, destinationPath))) {
      throw new Error(
        `The destination already contains a different file at ${file.relativePath}.`,
      );
    }
    verified.add(file.relativePath);
  }
  return verified;
}

export function getStoragePartialPathCollision(files, partialSuffix) {
  const plannedPaths = new Set(files.map((file) => file.relativePath));
  const partialPaths = new Map(
    files.map((file) => [
      `${file.relativePath}${partialSuffix}`,
      file.relativePath,
    ]),
  );
  for (const plannedPath of plannedPaths) {
    let ancestor = plannedPath;
    while (ancestor.includes("/")) {
      ancestor = ancestor.slice(0, ancestor.lastIndexOf("/"));
      if (partialPaths.has(ancestor)) return partialPaths.get(ancestor);
    }
    if (partialPaths.has(plannedPath)) return partialPaths.get(plannedPath);
  }
  return null;
}

export function getStorageTransferId(previousId, createId) {
  const normalized = String(previousId || "");
  return /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(
    normalized,
  )
    ? normalized
    : createId();
}

export function parseDfAvailableBytes(output) {
  const line = String(output || "")
    .trim()
    .split(/\r?\n/)
    .at(-1);
  const availableBlocks = Number(line?.trim().split(/\s+/)[3]);
  return Number.isFinite(availableBlocks) ? availableBlocks * 1024 : null;
}
