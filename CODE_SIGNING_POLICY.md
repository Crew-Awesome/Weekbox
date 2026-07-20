# Code Signing Policy

WeekBox publishes official release binaries from the [Crew-Awesome/Weekbox](https://github.com/Crew-Awesome/Weekbox) repository. This policy applies to those official binaries and installers only; it does not apply to third-party engines, mods, or other downloads that WeekBox can help users find.

## Signing service

Free code signing provided by [SignPath.io](https://about.signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

## Project roles

- **Committers and reviewers:** [ImMalloy](https://github.com/ImMalloy) and [Britex](https://github.com/expertyeti), and Other Contributors in the project that might come in the future.
- **Approvers:** the same maintainers approve each signing request after confirming the release tag, source revision, and generated artifacts.

Changes proposed by contributors who are not maintainers must be reviewed by a maintainer before merging. All maintainers must use multi-factor authentication like 2FA for repository and signing-service access.

## Release and signing process

1. A maintainer creates a versioned release from this repository in neutralino settings and writes the changelog for that version. 
2. GitHub Actions builds the release artifacts from the tagged source and committed build workflow.
3. An approver checks the release version and artifacts, then manually approves the signing request.
4. Only the resulting WeekBox binaries and installers are signed and published as official releases.

WeekBox will not sign binaries that are not built from this repository or that belong to a third-party project.

## Privacy

See the [WeekBox Privacy Policy](./PRIVACY.md). It describes WeekBox's local data and the third-party services it contacts.

## Reporting a signing concern

If you believe a signed WeekBox release is compromised, open an issue at the [WeekBox repository](https://github.com/Crew-Awesome/Weekbox/issues) with the release version, download URL, file hash, and a description of the concern. Do not post passwords, private keys, or other sensitive information.
