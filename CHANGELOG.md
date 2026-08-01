# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.9.1] - 2026-07-31

### Fixed

- Tag suggestions stay hidden when there are no matches.
- Tags can contain spaces.
- Codename mods can be managed unless that specific mod is running.
- Addons and dependencies cannot be launched.
- Addons and dependencies stay locked while their engine version is in use.
- Used addons and dependencies keep safe launcher-only settings available.
- Used addons and dependencies keep their folder identity while cosmetic details can change.
- Addon and dependency cards no longer show launch or switch controls.
- Cosmetic settings stay editable for every mod, including running ones.
- Mod Settings groups Type, Engine, and Version together and greys locked file controls.

## [1.9.0] - 2026-07-31

### Fixed

- Psych Online imports no longer stop WeekBox when folders cannot move.
- Downloads retry temporary server errors and stop after a timeout.
- Locked mod links retry before WeekBox gives up.
- External downloads now keep useful file details for diagnostics.

### Changed

- Mods and dependencies are now together in one Mods page.
- Mod Manager now supports tags and cleaner type filters.
- Mod settings now has tags, a type picker, and a cleaner layout.
- Mod settings can change type and edit tags.
- You can include or exclude many mod types at once, and search by tag.
- Filter menus keep their engine icons and close correctly when dismissed.
- Tag suggestions stay hidden until you start typing.
- Filter choices now only show types and engines that are installed.
- Filter menus keep their include and exclude buttons visible.
- Empty filter groups stay hidden.

## [1.8.9] - 2026-07-31

### Fixed

- Mod installs no longer delete temp folders too early.
- Downloads retry incomplete files and bad connections.
- Mods can copy into Psych Online on non-NTFS drives.
- Updates now reject files without a valid checksum.
- Storage moves keep the old library if the copy fails.
- Engine launch paths are escaped safely.
- MediaFire links with special characters download properly.
- Locked mod files retry before WeekBox gives up.
- Error reports no longer repeat in the same app session.
- Update windows can now be clicked over the engine window.

## [1.8.8] - 2026-07-30

### Fixed

- Release notes and the Downloads page now update with the release build.
- WeekBox updates work with Windows folders that have apostrophes.

## [1.8.7] - 2026-07-30

### Fixed

- Downloads wait for Windows before moving the finished ZIP file.
- Downloads use a new temp ZIP name every time.
- GameBanana connection problems and storage problems no longer send error reports.
- Error reports now skip empty stack-only errors.
- Updates now check downloaded files before installing them.
- GameBanana links are escaped safely before WeekBox runs curl.

## [1.8.6] - 2026-07-30

### Changed

- WeekBox now asks you to update before opening when a new version is ready.
- Diagnostic reports are now sent automatically when WeekBox has an unexpected error.

### Fixed

- If automatic updating fails, WeekBox shows a button to download the update manually.
- Extracted mod folders with spaces at the end no longer fail on Windows.
- Already installed engine versions no longer send an error report.
- The Diagnostic Reporting setting and Privacy category were removed.

## [1.8.5] - 2026-07-30

### Fixed

- GameBanana download timeouts do not send an error report anymore.

## [1.8.4] - 2026-07-30

### Fixed

- Downloads try again if GameBanana is being slow or resets the connection.
- Broken download parts are cleaned up instead of being installed.
- WeekBox gives better messages for missing files and storage problems.
- Mods with the same Psych Online folder do not stop WeekBox from opening.
- Install errors no longer show your Windows username in reports.

## [1.8.3] - 2026-07-30

### Added

- WeekBox can download ZIP files from GitHub Releases.
- GameBanana links in mod descriptions can open the linked mod or tool in WeekBox.
- Mod downloads can show a list when there is more than one file to choose from.
- Mods downloaded inside Psych Online are added to WeekBox too.
- Psych Online mods without cover art use a Psych Online banner.

### Fixed

- Downloads give better errors for bad links, no internet, timeouts, missing files, and Windows certificate problems.
- Download reports are shorter and the same error is not sent again and again.
- Error details now include the useful diagnostic report information.
- Mods already installed no longer show as an unexpected error.
- Deleting a mod no longer fails when an engine folder is not empty.
- OneDrive only blocks downloads and installs, not WeekBox starting.
- Mac archive files like `__MACOSX` and `.DS_Store` are removed when installing mods.
- The Choose Download window works again after using it before.
- Engine updates, engine uninstalling, and the Engine Manager work better.
- WeekBox no longer crashes if an engine page changes while its button is updating.
- Duplicate Psych Online mod folders no longer stop WeekBox from opening.

## [1.8.2] - 2026-07-27

### Added

- WeekBox can use Wine on Linux and macOS to open Windows `.exe` games and mods.
- WeekBox can open `.7z`, `.rar`, `.tar`, and `.zip` downloads without a separate archive app.
- WeekBox supports more Google Drive downloads.
- The startup screen shows what WeekBox is doing.
- Linux and macOS Settings can choose which installed Wine version runs Windows `.exe` mods.

### Changed

- WeekBox starts more reliably on Linux.
- WeekBox does not use old app files after an update.
- The Mod Manager is taller.
- The app code and styles were reorganized.
- Building and running from source now use npm commands.

### Fixed

- WeekBox includes the Neutralino files it needs to start.
- Linux download and archive commands work correctly.
- WeekBox retries downloads after some connection errors.
- WeekBox waits for downloaded files before trying to use them.
- Diagnostic reports no longer fail because they are too long.
- Mod files are moved one at a time to avoid Windows file errors.
- Engine update data errors no longer stop an engine update.
- Codename mods can launch on Linux again.
- Mods cannot launch while their engine version is updating.
- WeekBox closes the matching running engine before updating it.
- WeekBox checks again before replacing an engine folder.
- WeekBox gives a clearer message when Wine is missing on Linux or macOS.

### Removed

- ALE Psych has been removed from WeekBox.
- Old ALE Psych installs are removed when WeekBox starts.
- Mods that used ALE Psych are changed to Unassigned.

## [1.8.1] - 2026-07-22

### Added

- Windows Setup now registers `weekbox://mod/<id>` links.
- Portable Windows builds register `weekbox:` links after their first launch.

### Changed

- Windows Setup now clearly separates the program location from the library location.
- Added an enabled-by-default setting for opening WeekBox links.

### Fixed

- Clicking a source icon while a mod is loading no longer reloads WeekBox.
- Invalid Google Drive pages are no longer offered as downloads.
- Missing download links now show a useful error instead of a native error.
- Deep links also accept the accidental `weekbox://mod,<id>` format.
- macOS archive extraction no longer assumes that the `7z` command is installed.
- Windows extraction warnings no longer fail installs after files were successfully unpacked.
- The WeekBox link setting is now only shown on Windows.

## [1.8.0] - 2026-07-22

### Added

- Codename dependencies now use the engine's `addons` folder. WeekBox creates the folder when needed.
- Download choices now show file dates.

### Changed

- Newer download files are shown first.
- Download checks now run in the background and are cached.
- Mod downloads use safer folder names and handle wrapped folders better.
- Running mods and dependencies can open their settings in read-only mode. Their folder can still be opened.
- Linux and macOS try other extractors when a download is not really a ZIP file.
- Error messages and support reports are clearer.

### Fixed

- A converted Codename dependency is now moved from `mods` to `addons` correctly.
- Executable mods now show as running on the first launch, even if Mod Manager refreshes.
- ZIP files with mismatched Unicode filenames no longer fail when their files were extracted correctly.
- Mods with Unicode names now install correctly.
- Empty downloads now show the right error.
- Bad downloads no longer look like WeekBox errors.
- Mods with the same engine folder are detected before launch.
- Running executable mods stay marked as running.
- Running mods can be closed and restored more reliably.
- Mod Manager buttons update after an engine closes.
- Cancelling a download now stops its child processes too.
- Failed folder creation is reported instead of being ignored.
- The search box no longer crashes when its dropdown is missing.
- Windows archive installs now check that files were really extracted.

## [1.7.3] - 2026-07-21

### Fixed

- WeekBox now restores running engine and mod state after reopening or updating.
- Recovered mods can now be closed from WeekBox.
- Mod and dependency controls return to normal after their engine closes.
- Engine Manager no longer allows a running engine version to be uninstalled.

## [1.7.2] - 2026-07-21

### Fixed

- Running engines now lock their mods and dependencies from being changed or deleted.
- Locked mod and dependency buttons now stay dark instead of brightening on hover.

## [1.7.1] - 2026-07-21

### Fixed

- First-time storage setup no longer stops WeekBox from opening if it fails.
- Error reports now show a proper stack trace when one is available.
- macOS engines now run the correct app-bundle executable.
- Mods now install in the right folder inside macOS app bundles.
- Windows certificate-check download errors now show clearer help and are not reported as app errors.

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
