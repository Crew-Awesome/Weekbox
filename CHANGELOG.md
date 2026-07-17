# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.0] - 2026-07-17

### Added

- Psych Online mods from [Sniro](https://funkin.sniro.boo/mods) are now shown alongside GameBanana results, with source-aware details, downloads, and sorting.
- MediaFire and Google Drive download links supplied by GameBanana are available as install choices, with their resolved filename and size when available.
- Settings now use a typed, versioned JSON file beside WeekBox's installed-mod and engine-update state. Existing settings are migrated from LocalStorage once and then removed from it.
- A storage-location recommendation flow helps avoid cloud-synced folders that can interfere with downloads.
- Sniro is listed in the in-app Powered by credits.

### Changed

- Reworked Mod Manager card rendering, filters, and caching to make installed mods load and refresh faster.
- Updated mod cards, search hints, carousel sizing, and engine-manager styling.
- Search results now keep engine submissions and Psych Online entries out of the normal mod/dependency flows where they do not apply.

### Fixed

- Launcher updates no longer restart the app before the update is installed, and relaunch from the correct installed location.
- Storage moves preserve active files and handle the default location correctly across Windows, macOS, and Linux.
- Fixed loading stalls when Mod Manager cards contain base64 images and improved consecutive card rendering.
- Fixed the search placeholder overlapping entered text and card labels overflowing their layouts.
- Fixed opening engine downloads from mod details.

## [1.2.3] - 2026-07-16

### Fixed

- Launcher updates now restart WeekBox from its installed folder after applying an update.
- Nightly engine update checks now save their installed workflow SHA in `WeekBox/data/engineupdatestate.json`, preventing repeated prompts for the same build.

## [1.2.2] - 2026-07-16

### Fixed

- Launcher updates now download release archives through the native transfer utility, avoiding GitHub release-download CORS failures.

## [1.2.1] - 2026-07-16

### Fixed

- Engine release lists now wait for nightly-version lookup before filtering releases for the current operating system.

## [1.2.0] - 2026-07-16

### Added

- A built-in launcher updater that checks GitHub Releases, verifies the release SHA-256 digest, installs the matching package, and restarts WeekBox.
- Launcher updates for Windows, Linux, macOS Intel, and Apple Silicon release packages.
- A launcher-update section in Settings → Updates, including a manual check button and a startup-check preference.
- An in-app update modal with Later and Install and restart actions when a newer WeekBox release is detected.
- Friendly, copyable error reports for engine and mod installation failures.

### Changed

- Engine installs now show the real archive filename being extracted and clear live status for extraction, organization, validation, and mod setup.
- Engine release lists now show only versions that support the current operating system.
- macOS engine app bundles are preserved instead of moving their internal executable out of the bundle.
- macOS and Linux updater installs restore executable permission after replacing the launcher.

### Fixed

- Windows archive extraction now handles drive-letter paths correctly.
- WeekBox avoids downloading engines into OneDrive-backed storage, which can lock or invalidate active downloads.
- Missing engine folders no longer generate misleading executable-scanner warnings.
- Storage moves now reapply installed mods without calling a missing method.
- Engine installation reports the extracted file list when a download does not contain a runnable engine.

## [1.1.0] - 2026-07-16

### Added

- A multithread-download preference for faster large archive downloads, with a single-connection option for compatibility.
- A Library & Storage setting that lets you move the WeekBox data folder, including mods, engines, and data, to any writable folder or drive.
- Settings categories for General, Downloads, Library & Storage, and Updates.
- Rotating search guidance for mod searches, GameBanana links, and GameBanana mod IDs.
- App-wide console reporting for uncaught errors and unhandled promise rejections.
- Developer tools support that can be opened when needed without opening automatically at startup.

### Changed

- Large downloads skip the parallel-download server check when multithread downloads are disabled.

### Fixed

- Mod Manager engine and version selections now save and refresh correctly.
- Mod-to-engine links are recreated after moving the WeekBox storage folder.
- Fixed a stylesheet filename-case mismatch that could prevent the search dropdown styles from loading on case-sensitive platforms.
