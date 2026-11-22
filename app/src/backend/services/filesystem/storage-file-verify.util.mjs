export const STORAGE_FILE_VERIFY_CHUNK_SIZE = 1024 * 1024;

export async function filesMatchInChunks(
  sourcePath,
  destinationPath,
  size,
  {
    readBinaryFile,
    checkCancelled = () => {},
    chunkSize = STORAGE_FILE_VERIFY_CHUNK_SIZE,
  },
) {
  let offset = 0;
  while (offset < size) {
    checkCancelled();
    const length = Math.min(chunkSize, size - offset);
    const [source, destination] = await Promise.all([
      readBinaryFile(sourcePath, { pos: offset, size: length }),
      readBinaryFile(destinationPath, { pos: offset, size: length }),
    ]);
    if (source.byteLength !== length || destination.byteLength !== length)
      return false;
    const sourceBytes = new Uint8Array(source);
    const destinationBytes = new Uint8Array(destination);
    for (let index = 0; index < length; index += 1) {
      if (sourceBytes[index] !== destinationBytes[index]) return false;
    }
    offset += length;
  }
  return true;
}
