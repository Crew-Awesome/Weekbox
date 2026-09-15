/**
 * Contract defining explicit platform capabilities.
 * Follows Liskov Substitution Principle (LSP) by allowing consumers
 * to query capabilities rather than assuming unsupported methods will execute.
 */
export interface PlatformCapabilities {
  readonly canLaunchProcesses: boolean;
  readonly canOpenFolders: boolean;
  readonly canAccessNativeFileSystem: boolean;
  readonly canShowNativeDialogs: boolean;
  readonly canDownloadDirectStreams: boolean;
  readonly canExtractArchives: boolean;
}
