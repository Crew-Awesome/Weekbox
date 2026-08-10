# Development

This guide covers setting up WeekBox, running it from source, and fixing the
most common development problems.

## Requirements

- [Node.js](https://nodejs.org/en/download/)
- npm, included with Node.js
- [Neutralinojs](https://neutralino.js.org/)

Node.js provides the JavaScript runtime and npm provides the project commands
and dependencies. Neutralinojs runs WeekBox as a desktop application.

## Setup

Install the Neutralino CLI globally:

```bash
npm install -g @neutralinojs/neu
```

From the WeekBox project folder, install the project dependencies:

```bash
npm install
```

Update the Neutralino binaries used by the project:

```bash
neu update
```

The `npm install` postinstall script also runs a Neutralino update. The manual
command is useful after changing Neutralino versions or when the binaries are
missing.

## Run WeekBox

Start the development app with:

```bash
npm run dev
```

This builds the frontend assets, watches asset changes, and starts Neutralino.

## Build frontend assets

Run this after changing frontend files when the development asset watcher is
not running:

```bash
npm run assets
```

If you run Neutralino directly, build assets first. `neu run` does not bundle
the frontend by itself.

## Build executables

For release builds, use:

```bash
npm run build
```

This builds the frontend assets and then runs `neu build`. To run the
Neutralino step yourself:

```bash
npm run assets
neu build
```

Neutralino writes built files to the generated `dist` directory.

## Troubleshooting

### `node` or `npm` is not recognized

Install Node.js from the [official download page](https://nodejs.org/en/download/),
then close and reopen your terminal. Check the installation with:

```bash
node --version
npm --version
```

### `neu` is not recognized

Install the CLI again:

```bash
npm install -g @neutralinojs/neu
```

Then reopen your terminal. The project scripts use the locked package through
`npx`, so these commands also work without a global CLI:

```bash
npx @neutralinojs/neu update
npx @neutralinojs/neu run
npx @neutralinojs/neu build
```

### The app reports a missing bundle file

Build the frontend assets, then start the app again:

```bash
npm run assets
npm run dev
```

Do not use `neu run` by itself unless the current files already have a fresh
asset bundle.

### `neu update` fails

Check your internet connection and run the project-local command:

```bash
npx @neutralinojs/neu update
```

If it still fails, run `npm install` again and check that your Node.js version
and npm version work from the same terminal.

### A build fails after changing files

Run the asset build separately so the first error is easier to find:

```bash
npm run assets
npm run build
```

If the dependency installation is incomplete, run `npm install` and retry.

### Reporting a problem

Before opening an issue, record:

- your operating system;
- the output of `node --version` and `npm --version`;
- the exact command that failed;
- the full error message; and
- whether `npm run assets` succeeds.

Use the [bug report template](../.github/ISSUE_TEMPLATE/bug_report.md) when
reporting a reproducible problem.
