# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.4.1] - 2026-07-20

### Added

- You can use an existing WeekBox folder from another drive.
- You can replace an old WeekBox folder when moving your library. The old folder is kept as a backup.

### Changed

- Storage settings are easier to use. You can open the current folder from its path.
- WeekBox releases now build automatically after they are published.

### Fixed

- WeekBox accepts both ZIP file types used by GitHub releases.
- Startup errors now show useful details.
- WeekBox does not try to move files when you choose the folder it already uses.
- A missing old Documents folder no longer stops WeekBox from starting.

## [1.4.0] - 2026-07-19

### Added

- You can add mods from a folder on your computer in Mod Manager.
- Local mods can have their own name, cover image, engine, and version.
- Local mod details can be filled from a GameBanana mod ID or link.
- Dependencies now have their own list or grid view, cover image, settings, and delete button.
- Mod Settings can move a mod to Dependencies, or move a dependency back to Mods.

### Changed

- Mod Manager loads mod cards before slower checks finish, so it opens faster.
- Mod and dependency cover images are saved locally.
- Mods without a cover get a local "NO IMAGE ASSIGNED" image.
- Psych Online now only uses the Latest version.

### Fixed

- Empty or fake engine folders are ignored and cleaned up.
- Interrupted mod downloads and their temporary files are cleaned up when WeekBox starts.
- Unassigned mods no longer show a launch button.
- Executable mods cannot be assigned to an engine.
- Mod folders on macOS now use the correct app-bundle mods folder.

## [1.3.2] - 2026-07-19

### Added

- Search suggestions and typo matching are better.
- WeekBox hides downloads that do not work and supports more external download links.
- Engine install errors now show the files found in a bad download.

### Changed

- Search shows GameBanana and Psych Online mods together more accurately.
- Some app code was split into smaller files to make future work easier.
- Updates support both the old `resources.neu` format and future one-file builds.

### Fixed

- Fake or broken engine folders no longer show as installed engines.
- Engine downloads work better when files are inside extra folders.
- Mod covers use a fallback image if the normal image fails.
- Opening one dropdown now closes the others.

## [1.3.1] - 2026-07-17

### Added

- The update window now includes a GitHub download button if automatic updating fails.

### Changed

- WeekBox now comes to the front when it starts, including after an update.

### Fixed

- Updates replace files, clean up, retry, roll back, and restart more reliably.

## [1.3.0] - 2026-07-17

### Added

- Psych Online mods from [Sniro](https://funkin.sniro.boo/mods) now appear with GameBanana search results.
- MediaFire and Google Drive links can now be used to install GameBanana mods.
- Settings are now saved in a file instead of browser storage.
- WeekBox warns you about cloud-synced folders that can cause download problems.
- Sniro was added to the in-app credits.

### Changed

- Mod Manager loads and refreshes installed mods faster.
- Updated mod cards, search tips, carousel size, and Engine Manager styling.
- Search handles engine submissions and Psych Online mods correctly.

### Fixed

- App updates now install before WeekBox restarts.
- Moving storage keeps your files on Windows, macOS, and Linux.
- Mod Manager no longer stalls while loading some images.
- Fixed search text and card labels overlapping.
- Fixed opening engine downloads from mod details.

## [1.2.3] - 2026-07-16

### Fixed

- App updates now restart WeekBox from the correct folder.
- Nightly engine updates no longer ask again for the same build.

## [1.2.2] - 2026-07-16

### Fixed

- App updates can download GitHub releases without browser download errors.

## [1.2.1] - 2026-07-16

### Fixed

- Engine versions now load before WeekBox filters them for your operating system.

## [1.2.0] - 2026-07-16

### Added

- WeekBox can now update itself from GitHub Releases.
- App updates work on Windows, Linux, Intel Macs, and Apple Silicon Macs.
- Settings has update options and a button to check for updates.
- WeekBox shows an update window when a new version is available.
- Engine and mod install errors are easier to read and copy.

### Changed

- Engine installs now show clearer progress and the real download file name.
- Engine lists only show versions for your operating system.
- macOS engine apps stay as app bundles when they are installed.
- Updates restore executable permissions on macOS and Linux.

### Fixed

- Fixed Windows archive extraction paths.
- WeekBox avoids OneDrive folders that can break engine downloads.
- Missing engine folders no longer show confusing warnings.
- Moving storage now restores installed mods correctly.
- Bad engine downloads now show the files that were found.

## [1.1.0] - 2026-07-16

### Added

- Choose faster multi-part downloads or single-part downloads for compatibility.
- Move your WeekBox data, mods, and engines to another folder or drive.
- Settings now has General, Downloads, Library & Storage, and Updates sections.
- Search tips now show mod names, GameBanana links, and mod IDs.
- Unexpected errors are now reported in the console.
- Developer tools can be opened when needed.

### Changed

- Large downloads skip the multi-part check when it is turned off.

### Fixed

- Mod Manager now saves and refreshes engine and version choices correctly.
- Moving storage reconnects mods to their engines.
- Fixed search dropdown styles on case-sensitive systems.

## [1.0.0] - 2026-07-16

### Added

- First WeekBox release.
- Download packages for Windows, Linux, and macOS.
- Packages for x64, ARM64, ARMHF, and Universal Macs where available.
