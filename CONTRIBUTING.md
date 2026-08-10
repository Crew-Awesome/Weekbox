# Contributing to WeekBox

Thanks for helping improve WeekBox.

## Before you start

- Search existing issues before opening a new one.
- Describe bugs with the WeekBox version, operating system, expected result, actual result, and reproducible steps.
- Keep feature requests focused on a clear player or maintainer need.
- Join the [WeekBox Discord Server](https://discord.gg/xQTtYF2Cfn) to discuss development, translations, or other project work.
- For project work, contact **Malloy** or **Britex** through Discord first.

## Pull requests

1. Create a branch from the current default branch.
2. Keep each pull request focused on one change.
3. Explain what changed and how you tested it.
4. Update `CHANGELOG.md` under `Unreleased` when the change affects users or contributors.
5. Do not add secrets, downloaded binaries, unrelated generated files, or malicious code.
6. Wait for a maintainer review before merging.

By contributing, you agree that your contribution may be distributed under the repository's [MIT License](./LICENSE).

## Changelog

WeekBox follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Add user-facing changes under `## [Unreleased]` in `CHANGELOG.md` using the
appropriate section: `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or
`Security`.

Keep entries short and describe what changed. Several commits for one change
can become one changelog entry.

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```text
type: short description
```

Examples:

```text
feat: add nightly build details
fix(downloads): detect the remote file size
docs: update contribution links
```

Keep commit descriptions short and specific. Useful types include `feat`,
`fix`, `docs`, `refactor`, `test`, `build`, and `chore`.

Write commits like a normal person. Use simple words and do not make a fix
sound more technical or important than it is. Prefer `fix archive downloads`
to `stabilize archive transfers`.

## Versions

WeekBox follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Contributors should not change the project version unless a maintainer asks
them to. Maintainers decide when a release is made and what version it gets.

## Translations

User-facing translations live in `app/src/ui/locales/`. Keep English strings
in `en.json` and preserve the existing translation keys and placeholders.

## Security issues

Do not use public issues or public Discord messages for vulnerabilities that
could put users at risk. Contact a project maintainer privately instead.
