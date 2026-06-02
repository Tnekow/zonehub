# ZoneHub

ZoneHub is an offline-first community profile page designer built with Vite, React, and TypeScript. It provides a high-fidelity Steam-style profile layout that you customize entirely on your device—avatar, nickname, showcases, badges, themes, and background media—with no Steam account or API required.

Language: English (default) | [简体中文](README.zh-CN.md)

## Highlights

- Offline-first: no backend required for core editing flows.
- High-fidelity community-style profile presentation (visual reference only; not linked to Steam).
- Real-time editing with local persistence (`localStorage`).
- Theme customization and custom background support.
- Video background and video-to-GIF workflow support.
- Desktop build support via Electron.
- Built-in i18n (`zh-CN`, `en-US`, `ja-JP`).

## Tech Stack

- Vite
- React 19
- TypeScript
- Tailwind CSS
- React Router
- i18next
- Electron + electron-builder

## Requirements

- Node.js `>=22`
- npm `>=10`

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173`.

## Available Scripts

- `npm run dev` - start web development server.
- `npm run build` - production web build.
- `npm run preview` - preview production build locally.
- `npm run lint` - run ESLint.
- `npm run electron:dev` - run Electron in development mode.
- `npm run electron:build` - build Electron distributable.
- `npm run badges:sync-assets` - sync offline badge assets.

## Offline OSS Notes

This repository is prepared for offline open-source usage:

- Creator/account/publish online dependencies are removed.
- App behavior relies on local data and local storage.
- Use `.env.example` as template for optional toggles (no AppID env required).
- Custom background URL accepts `https`, `blob`, and `data` schemes.

If badge assets are missing after clone:

```bash
npm run badges:sync-assets
```

## Project Structure

```text
src/
  components/      # UI components
  pages/           # Route pages
  routes/          # Route definitions
  content/         # MDX content modules
  data/            # Static data
  hooks/           # Custom hooks
  locales/         # i18n resources
electron/
  main/            # Electron main process
docs/              # Project and architecture docs
public/            # Static assets
scripts/           # Build and utility scripts
```

## Documentation

Detailed documents are in `docs/README.md`, including:

- Project overview
- Architecture
- Theme system
- i18n
- Component development guide
- Deployment and maintenance guide

## Contributing

Issues and pull requests are welcome.

Recommended process:

1. Fork this repository.
2. Create a feature branch.
3. Run `npm run lint` and ensure build passes.
4. Open a PR describing motivation and test results.

## CI Workflows

- `electron-package-windows.yml` - build Windows Electron package in CI.
- `electron-release-on-tag.yml` - publish Electron release artifacts on tag.

Git hooks:

- `npm install` installs Husky and enables pre-commit lint.
- `npm run install:no-steam` uses `--ignore-scripts` and skips hook installation.

## License

This project is licensed under the GNU Affero General Public License v3.0 only.

- SPDX identifier: `AGPL-3.0-only`
- Full text: `LICENSE`

## Disclaimer

This project is for educational and personal use. It is not affiliated with Valve or Steam.
