# Development guide

This guide covers setup, local development, frontend assets, release builds,
and common fixes.

Run all commands from the WeekBox project folder.

## Quick start

1. Install [Node.js](https://nodejs.org/en/download/). npm is included.
2. Install the Neutralino CLI:

   ```bash
   npm install -g @neutralinojs/neu
   ```

3. Install the project dependencies:

   ```bash
   npm install
   ```

4. Update the Neutralino binaries:

   ```bash
   neu update
   ```

5. Start WeekBox:

   ```bash
   npm run dev
   ```

`npm install` also runs the project's Neutralino update step. Run `neu update`
manually after changing Neutralino versions or when the binaries are missing.

## Commands

| Command | Use it for |
| --- | --- |
| `npm run dev` | Start WeekBox and watch frontend asset changes. |
| `npm run assets` | Rebuild frontend assets after changes or updates. |
| `npm run build` | Build frontend assets and release executables. |
| `neu update` | Download or update Neutralino binaries. |
| `neu build` | Build executables directly after `npm run assets`. |

`npm run dev` and `npm run build` already run `npm run assets`. You only need to
run it separately when using another command or when you want to check the
frontend build first.

## Run from source

```bash
npm run dev
```

This builds the frontend, watches asset changes, and starts Neutralino.

If you run Neutralino directly, build the frontend first. `neu run` does not
bundle the frontend by itself:

```bash
npm run assets
neu run
```

If `neu` is not available globally, use the project-local CLI:

```bash
npx @neutralinojs/neu run
```

## Rebuild frontend assets

Run this after changing frontend files or updating dependencies when
`npm run dev` is not already watching them:

```bash
npm run assets
```

## Build executables

For a release build, use:

```bash
npm run build
```

This runs `npm run assets` and then `neu build`. To run those steps separately:

```bash
npm run assets
neu build
```

Neutralino writes the generated executables to its `dist` directory.

## Troubleshooting

### `node` or `npm` is not recognized

Install Node.js from the [official download page](https://nodejs.org/en/download/),
then close and reopen your terminal. Check the installation with:

```bash
node --version
npm --version
```

### `neu` is not recognized

Install the CLI and reopen your terminal:

```bash
npm install -g @neutralinojs/neu
```

The project scripts use the locked CLI package through `npx`, so these commands
also work without a global install:

```bash
npx @neutralinojs/neu update
npx @neutralinojs/neu run
npx @neutralinojs/neu build
```

### The app reports a missing bundle file

Build the frontend assets before starting Neutralino:

```bash
npm run assets
npm run dev
```

Do not use `neu run` by itself unless the current asset bundle is up to date.

### `neu update` fails

Check your internet connection, then use the project-local CLI:

```bash
npx @neutralinojs/neu update
```

If it still fails, run `npm install` again and retry from a new terminal.

### A build fails after changing files

Run the asset build separately so the first error is easier to identify:

```bash
npm run assets
npm run build
```

If dependencies are incomplete, run `npm install` and retry.

### Reporting a problem

Include these details when reporting a reproducible problem:

- operating system;
- `node --version` output;
- `npm --version` output;
- the exact command that failed;
- the full error message; and
- whether `npm run assets` succeeds.

Use the [bug report template](../.github/ISSUE_TEMPLATE/bug_report.md) to
report it.
