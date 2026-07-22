# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2026-07-21

### Added

- First-time setup now lets you choose where WeekBox saves its files.
- WeekBox can send error reports to the developers if you allow it.
- You can clean up leftover files from failed downloads in Settings.
- V-Slice installs now support the macOS installer download.

### Changed

- Settings are now sorted into clearer sections.

## [1.6.0] - 2026-07-21

### Changed

- Featured mods now load directly without a manifest file.
- Mod Manager now has a search box and a filter and sort menu.
- You can filter mods by executable, engine, or unassigned type.
- Switching between mods and dependencies is faster.

### Fixed

- Updates no longer fail before downloading the new file.
- Mod Manager search no longer reloads card images while typing.
- Switching between Mods and Dependencies no longer reloads mod card images.

## [1.5.8] - 2026-07-20

### Fixed

- ZIP extraction no longer fails when GNU tar is installed on Windows; falls back to PowerShell if needed.
- The auto-updater now detects the correct system architecture instead of forcing 64-bit.
- Updates no longer break when the archive contains subfolders.
- Faster updates by downloading only the resources file when possible.
- Extracting files on Windows drives (like D:) no longer confuses tar with a remote server.
- Engine install errors no longer cause an unexpected error.

### Changed

- Local mods now use their chosen name. Duplicate names get a number.

## [1.5.7] - 2026-07-20

### Fixed

- Mod covers now update on the card after you change them in the edit screen.

## [1.5.6] - 2026-07-20

### Fixed

- Fixed the Windows updater failing with "Failed to fetch" when downloading an update.
- The Mod Manager now keeps your scroll position when it refreshes.

## [1.5.5] - 2026-07-20

### Fixed

- The update-check button no longer keeps the loading cursor after it finishes.

## [1.5.4] - 2026-07-20

### Fixed

- Windows updates now update the app and the executable together, so you don't get stuck on an old version.

## [1.5.3] - 2026-07-20

### Changed

- Bumped to 1.5.3 and rebuilt with the pinned toolchain.
- The Windows installer is now built automatically in CI.

## [1.5.2] - 2026-07-20

### Fixed

- Windows installs on other drives (like D:) no longer fail to extract.
- The Mod Manager no longer shows "engine missing" right after you install an engine.
- The Windows updater now backs up your app before updating, so a bad update can't break it.
- Pinned the build toolchain so updates don't brick the app.

## [1.5.1] - 2026-07-20

### Fixed

- WeekBox no longer runs out of memory when downloading large engines.

## [1.5.0] - 2026-07-20

### Added

- A real Windows installer with a setup wizard and start menu shortcut.
- WeekBox can now update itself on Windows.
- A Discord button on the installer opens our server.

### Changed

- WeekBox now installs to AppData, so updates don't need admin rights.
- The installer shows a mod manager screenshot and a banner.

## [1.4.2] - 2026-07-20

### Changed

- Large mods extract faster.
- The Mod Manager prepares in the background when WeekBox starts.
- Mod covers load while a mod installs.
- The Mod Manager shows mods while they download.
- Home cards use a stronger cover color on hover.

### Fixed

- The Mod Manager no longer flashes when opened.
- Mod covers stay ready when you reopen Mod Manager.
- Mods without a cover now show a clear message.
- Tool dependencies can now load their cover and use Reset.
- Home card colors stay dark enough to read.
- Home engine tags stay in sync while scrolling.

## [1.4.1] - 2026-07-20

### Added

- You can use an existing WeekBox folder from another drive.
- You can replace an old WeekBox folder when moving your library. The old one is kept as a backup.

### Changed

- Storage settings are easier to use and let you open the current folder.
- WeekBox releases now build automatically after publishing.

### Fixed

- WeekBox accepts both ZIP types used by GitHub releases.
- Startup errors now show useful details.
- WeekBox no longer tries to move files when you pick its own folder.
- A missing old Documents folder no longer stops WeekBox from starting.

## [1.4.0] - 2026-07-19

### Added

- You can add mods from a folder on your computer.
- Local mods can have their own name, cover, engine, and version.
- Local mod details can be filled from a GameBanana ID or link.
- Dependencies have their own list, cover, settings, and delete button.
- Mod Settings can move a mod to Dependencies, or back.

### Changed

- The Mod Manager loads cards faster.
- Mod and dependency covers are saved locally.
- Mods without a cover get a local "NO IMAGE" image.
- Psych Online now only uses the Latest version.

### Fixed

- Empty or fake engine folders are ignored and cleaned up.
- Interrupted downloads and temp files are cleaned up on startup.
- Unassigned mods no longer show a launch button.
- Executable mods can't be assigned to an engine.
- macOS now uses the correct mods folder for app bundles.

## [1.3.2] - 2026-07-19

### Added

- Search suggestions and typo matching are better.
- WeekBox hides broken downloads and supports more external links.
- Engine errors now show the files found in a bad download.

### Changed

- Search shows GameBanana and Psych Online mods together more accurately.
- Some app code was split into smaller files.
- Updates support both old and future bundle formats.

### Fixed

- Fake or broken engine folders no longer show as installed.
- Engine downloads work better when files are in extra folders.
- Mod covers use a fallback image if the normal one fails.
- Opening one dropdown now closes the others.

## [1.3.1] - 2026-07-17

### Added

- The update window has a GitHub download button if auto-update fails.

### Changed

- WeekBox comes to the front when it starts, including after an update.

### Fixed

- Updates replace, clean up, retry, roll back, and restart more reliably.

## [1.3.0] - 2026-07-17

### Added

- Psych Online mods from Sniro now appear with GameBanana search results.
- MediaFire and Google Drive links can install GameBanana mods.
- Settings are now saved in a file instead of browser storage.
- WeekBox warns about cloud-synced folders that break downloads.
- Sniro was added to the credits.

### Changed

- The Mod Manager loads and refreshes mods faster.
- Updated mod cards, search tips, carousel, and Engine Manager styling.
- Search handles engine submissions and Psych Online mods correctly.

### Fixed

- Updates now install before WeekBox restarts.
- Moving storage keeps your files on all operating systems.
- The Mod Manager no longer stalls loading some images.
- Fixed search text and card labels overlapping.
- Fixed opening engine downloads from mod details.

## [1.2.3] - 2026-07-16

### Fixed

- Updates now restart WeekBox from the correct folder.
- Nightly engine updates no longer ask again for the same build.

## [1.2.2] - 2026-07-16

### Fixed

- Updates can download GitHub releases without browser errors.

## [1.2.1] - 2026-07-16

### Fixed

- Engine versions now load before WeekBox filters them for your system.

## [1.2.0] - 2026-07-16

### Added

- WeekBox can update itself from GitHub Releases.
- Updates work on Windows, Linux, Intel Macs, and Apple Silicon Macs.
- Settings has update options and a check-for-updates button.
- WeekBox shows an update window when a new version is available.
- Engine and mod install errors are easier to read and copy.

### Changed

- Engine installs show clearer progress and the real file name.
- Engine lists only show versions for your operating system.
- macOS engine apps stay as app bundles when installed.
- Updates restore executable permissions on macOS and Linux.

### Fixed

- Fixed Windows archive extraction paths.
- WeekBox avoids OneDrive folders that break engine downloads.
- Missing engine folders no longer show confusing warnings.
- Moving storage now restores installed mods correctly.
- Bad engine downloads now show the files that were found.

## [1.1.0] - 2026-07-16

### Added

- Choose faster multi-part or single-part downloads.
- Move your WeekBox data, mods, and engines to another folder or drive.
- Settings now has General, Downloads, Library & Storage, and Updates sections.
- Search tips show mod names, GameBanana links, and mod IDs.
- Unexpected errors are now reported in the console.
- Developer tools can be opened when needed.

### Changed

- Large downloads skip the multi-part check when it's turned off.

### Fixed

- The Mod Manager now saves and refreshes engine and version choices.
- Moving storage reconnects mods to their engines.
- Fixed search dropdown styles on case-sensitive systems.

## [1.0.0] - 2026-07-16

### Added

- First WeekBox release.
- Downloads for Windows, Linux, and macOS.
- Packages for x64, ARM64, ARMHF, and Universal Macs where available.
