export function interpretEngineLinkCheck(result, path) {
  if (result?.exitCode === 0) return true;
  if (result?.exitCode === 1) return false;
  const detail = String(result?.stdErr || result?.stdOut || "").trim();
  throw new Error(
    `Could not inspect engine link at ${path}.${detail ? ` ${detail}` : ""}`,
  );
}

export function shouldCopyWhenJunctionUnsupported(output) {
  return /local ntfs volumes are required|not supported/i.test(
    String(output || ""),
  );
}
