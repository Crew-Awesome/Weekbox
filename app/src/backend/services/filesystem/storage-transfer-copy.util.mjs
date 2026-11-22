async function verifyFile(file, path, io, failureMessage) {
  const stats = await io.getStats(path);
  if (
    !stats?.isFile ||
    Number(stats.size) !== file.size ||
    !(await io.matches(file, path))
  ) {
    throw new Error(failureMessage);
  }
}

export async function copyVerifyCommitStorageFile(
  file,
  destinationPath,
  partialPath,
  io,
) {
  await io.ensureDirectory(destinationPath);
  io.checkCancelled();

  if (await io.exists(destinationPath)) {
    await verifyFile(
      file,
      destinationPath,
      io,
      `The destination already contains a different file at ${file.relativePath}.`,
    );
    return { status: "already-present" };
  }

  io.onTransferStart?.();
  if (await io.exists(partialPath)) {
    const partialStats = await io.getStats(partialPath);
    const partialMatches =
      partialStats?.isFile &&
      Number(partialStats.size) === file.size &&
      (await io.matches(file, partialPath));
    if (!partialMatches) {
      await io.remove(partialPath);
    }
  }
  if (!(await io.exists(partialPath))) {
    await io.copy(file.path, partialPath);
  }

  await verifyFile(
    file,
    partialPath,
    io,
    `Could not verify ${file.relativePath} after copying it.`,
  );
  io.checkCancelled();
  if (await io.exists(destinationPath)) {
    throw new Error(
      `The destination changed while copying ${file.relativePath}.`,
    );
  }
  await io.move(partialPath, destinationPath);
  await verifyFile(
    file,
    destinationPath,
    io,
    `Could not verify ${file.relativePath} after moving it.`,
  );
  io.checkCancelled();

  const sourceStats = await io.getStats(file.path);
  if (
    Number(sourceStats.size) !== file.size ||
    (file.modifiedAt && Number(sourceStats.modifiedAt) !== file.modifiedAt)
  ) {
    throw new Error(`The source changed while moving ${file.relativePath}.`);
  }
  return { status: "copied" };
}
