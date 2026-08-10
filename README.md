# WeekBox

<p align="center">
  <img src="./docs/brand/weekbox-banner.png" width="800" alt="WeekBox" />
</p>

<p align="center">
  A desktop launcher for discovering, installing, and managing Friday Night Funkin' mods.
</p>

## Features

- Discover Friday Night Funkin' mods from GameBanana and Psych Online.
- Download from GameBanana, GitHub, Google Drive, and MediaFire.
- Install and organize mods and engines locally.
- Add mods from folders on your computer.

WeekBox has no account system. Your installed library stays on your computer.

## Screenshots

<table>
  <tr>
    <td width="50%">
      <img src="./docs/screenshots/home.png" alt="Home screen showing featured and discoverable FNF mods" /><br/>
      <sub><b>Home</b>: browse featured and discoverable mods.</sub>
    </td>
    <td width="50%">
      <img src="./docs/screenshots/mod-manager.png" alt="Mods with installed mods" /><br/>
      <sub><b>Mods</b>: see, launch, and organize what you installed.</sub>
    </td>
  </tr>
  <tr>
    <td width="50%">
      <img src="./docs/screenshots/engine-manager.png" alt="Installed engines" /><br/>
      <sub><b>Engines</b>: install and switch between engines.</sub>
    </td>
    <td width="50%">
      <img src="./docs/screenshots/settings.png" alt="Settings" /><br/>
      <sub><b>Settings</b>: storage location, downloads, and updates.</sub>
    </td>
  </tr>
</table>

## Development

Install dependencies:

```bash
npm install
```

Run from source:

```bash
npm run dev
```

`neu run` by itself does not bundle the frontend. If it reports a missing
`/app/dist/bundle.css`, run `npm run dev` (or `npm run assets` before
`npx @neutralinojs/neu run`).

Build release binaries:

```bash
npm run build
```

## Documentation

- [Contribution quick start](./CONTRIBUTING.md)
- [Detailed contribution guide](./docs/CONTRIBUTIONS.md)
- [Changelog](./CHANGELOG.md)
- [Code of Conduct](./CODE_OF_CONDUCT.md)

## Credits

WeekBox is made by [ImMalloy](https://github.com/ImMalloy) and [Britex](https://github.com/expertyeti).

It is built with [Neutralinojs](https://neutralino.js.org/) and uses [GameBanana](https://gamebanana.com/) and Sniro (Psych Online Site) for mod data.
The rest of the credits can be found [here on WeekBox's website](https://fnfweekbox.vercel.app/credits).
The launcher icon, window icon, and Credits icon all come from the same source asset in `app/assets/icons/launcher-icon.png`.

## License

[MIT](./LICENSE)
