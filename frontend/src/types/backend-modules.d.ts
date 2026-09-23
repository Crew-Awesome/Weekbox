declare module "*archive-extractor.mjs" {
  export function isSafeExtractionPath(destinationBase: string, relativeOrResolvedPath: string): boolean;
  export function parseExtractedFileName(rawLine: string): string | null;
  export function sanitizeExtractedDirectory(baseFolder: string): Promise<string[]>;
}
