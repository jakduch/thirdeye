<p align="center">
  <img src="assets/icon.png" alt="ThirdEye.git" width="128" height="128">
</p>

<h1 align="center">ThirdEye.git</h1>

<p align="center">
  <a href="https://github.com/jakduch/thirdeye/releases/latest"><img src="https://img.shields.io/github/v/release/jakduch/thirdeye?color=green&label=latest%20release" alt="Latest Release"></a>
  <a href="https://github.com/jakduch/thirdeye/releases"><img src="https://img.shields.io/github/downloads/jakduch/thirdeye/total?color=brightgreen" alt="Downloads"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-BSD--3--Clause-blue.svg" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey.svg" alt="Platform">
  <a href="https://github.com/jakduch/thirdeye/releases/latest"><img src="https://img.shields.io/badge/macOS-Universal-000000.svg?logo=apple&logoColor=white" alt="macOS"></a>
  <a href="https://github.com/jakduch/thirdeye/releases/latest"><img src="https://img.shields.io/badge/Windows-x64-0078D6.svg?logo=windows&logoColor=white" alt="Windows"></a>
  <a href="https://github.com/jakduch/thirdeye/releases/latest"><img src="https://img.shields.io/badge/Linux-x64%20%7C%20ARM64-FCC624.svg?logo=linux&logoColor=black" alt="Linux"></a>
  <br>
  <img src="https://img.shields.io/badge/electron-35-47848F.svg?logo=electron" alt="Electron">
  <img src="https://img.shields.io/badge/react-19-61DAFB.svg?logo=react" alt="React">
  <img src="https://img.shields.io/badge/typescript-5-3178C6.svg?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/redux%20toolkit-2-764ABC.svg?logo=redux&logoColor=white" alt="Redux Toolkit">
  <img src="https://img.shields.io/badge/MUI-6-007FFF.svg?logo=mui&logoColor=white" alt="Material UI">
  <img src="https://img.shields.io/badge/GitHub%20API-v3-181717.svg?logo=github" alt="GitHub API">
  <img src="https://img.shields.io/badge/GitLab%20API-v4-FC6D26.svg?logo=gitlab" alt="GitLab API">
  <img src="https://img.shields.io/badge/Bitbucket%20API-v2-0052CC.svg?logo=bitbucket" alt="Bitbucket API">
  <br>
  <a href="https://github.com/jakduch/thirdeye"><img src="https://img.shields.io/github/stars/jakduch/thirdeye?style=social" alt="GitHub Stars"></a>
  <a href="https://github.com/jakduch/thirdeye/issues"><img src="https://img.shields.io/github/issues/jakduch/thirdeye" alt="Open Issues"></a>
  <a href="https://github.com/jakduch/thirdeye/commits/main"><img src="https://img.shields.io/github/last-commit/jakduch/thirdeye" alt="Last Commit"></a>
  <img src="https://img.shields.io/github/languages/code-size/jakduch/thirdeye" alt="Code Size">
</p>

<p align="center">
  A desktop app for monitoring your GitHub, GitLab &amp; Bitbucket repositories — pull requests, merge requests, issues, notifications, and CI checks — all in one place. Supports multiple accounts per provider.
</p>

---

## Features

- **Multi-Provider** — GitHub, GitLab, and Bitbucket support with multiple accounts per provider, all polled simultaneously.
- **Pull Requests & Issues** — View all your open PRs, MRs, and issues across repositories and providers with state indicators, labels, and CI check status.
- **Notifications** — Real-time notifications (GitHub notifications, GitLab Todos) with unread indicators and the ability to mark as read.
- **OS Notifications** — Get native desktop notifications for new comments, state changes, CI completions, and merges.
- **Detail View** — Full PR/MR/Issue detail with comments, diff stats, linked items, and the ability to post comments directly.
- **CI Check Status** — Monitor check runs and pipelines (passing, failing, pending) for each pull request at a glance.
- **Dark & Light Mode** — GitHub Primer-inspired theme with automatic system theme detection.
- **Persistent Cache** — API responses are cached with ETag-based conditional requests and survive app restarts.
- **System Tray** — Runs in the background with an unread count badge in the system tray.
- **Auto-start** — Optional launch at system startup on macOS, Windows, and Linux.
- **Filter Controls** — Show/hide closed items, filter by repository, and manage watched/ignored repos.
- **Auto-Update** — Built-in update checker with automatic downloads. Native electron-updater on supported platforms; GitHub Releases API fallback otherwise.
- **Multi-Account Management** — Add, remove, enable, and disable accounts for any provider directly from Settings.

## Installation

Download the latest release for your platform from the [Releases](../../releases) page:

| Platform | File | Distros |
|----------|------|---------|
| macOS (Universal) | `ThirdEye-x.x.x-mac-universal.dmg` | Intel & Apple Silicon |
| Windows | `ThirdEye-x.x.x-win-setup.exe` | Windows 10+ |
| Linux (deb) | `ThirdEye-x.x.x-linux-*.deb` | Debian, Ubuntu, Mint, Pop!_OS |
| Linux (rpm) | `ThirdEye-x.x.x-linux-*.rpm` | Fedora, RHEL, CentOS, openSUSE |
| Linux (AppImage) | `ThirdEye-x.x.x-linux-*.AppImage` | Any distro (no install needed) |

## Build from Source

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm 9+

### Steps

```bash
git clone https://github.com/jakduch/thirdeye.git
cd thirdeye
npm install
npm run build
npm start
```

### Package for Distribution

```bash
npm run dist          # Build for current platform
npm run dist:mac      # macOS Universal DMG + ZIP (auto-update)
npm run dist:win      # Windows NSIS installer
npm run dist:linux    # Linux DEB, RPM, and AppImage (x64 + ARM64)
npm run dist:all      # Build for all platforms
```

## Configuration

On first launch, the app will ask you to connect at least one account. You can add more accounts at any time from **Settings → Connected Accounts → Add account**.

| Provider | Token type | Required scopes |
|----------|-----------|-----------------|
| GitHub | [Personal Access Token](https://github.com/settings/tokens/new?scopes=notifications,repo) | `repo`, `notifications` |
| GitLab | [Personal Access Token](https://gitlab.com/-/user_settings/personal_access_tokens) | `api`, `read_user` |
| Bitbucket | [App Password](https://bitbucket.org/account/settings/app-passwords/) | Repositories: Read, Pull requests: Read/Write |

All credentials are stored locally via [electron-store](https://github.com/sindresorhus/electron-store) and never leave your machine.

## Auto-Update

ThirdEye checks for updates automatically on startup (with a 5-second delay) and can also be triggered manually from **Settings → Updates**.

| Platform | Mechanism | Behaviour |
|----------|-----------|-----------|
| macOS (ZIP) | `electron-updater` | Silent download → restart prompt |
| Windows (NSIS) | `electron-updater` | Silent download → restart prompt |
| Linux (AppImage) | `electron-updater` | Silent download → restart prompt |
| Linux (DEB/RPM) | GitHub API fallback | Installer downloaded to ~/Downloads |

When `electron-updater` is available, updates are downloaded in the background and a system notification prompts you to restart. On platforms where `electron-updater` isn't supported (e.g. DEB/RPM packages), the app fetches the latest release from the GitHub API and saves the correct installer to your Downloads folder.

Auto-update can be enabled or disabled in **Settings → Updates → Automatic updates**.

## Architecture

ThirdEye is an Electron application with a React frontend and a Node.js backend:

- **Main process** — Multi-provider polling engine with a pluggable provider architecture (`BaseProvider` → `GitHubProvider`, `GitLabProvider`, `BitbucketProvider`). GitHub uses [@octokit/rest](https://github.com/octokit/rest.js) with ETag caching; GitLab and Bitbucket use native `fetch` against their v4/v2 REST APIs. An `AggregatePollingManager` polls all accounts in parallel and merges results.
- **Renderer process** — React 19 UI with Redux Toolkit for state management and Material UI components styled with GitHub Primer design tokens. Unified item lists with provider badges and per-account filtering.
- **IPC bridge** — Type-safe, account-aware communication between main and renderer processes.

## Acknowledgements

ThirdEye.git is built with the following open-source libraries:

| Library | License | Author(s) |
|---------|---------|-----------|
| [Electron](https://www.electronjs.org/) | MIT | OpenJS Foundation & Electron contributors |
| [React](https://react.dev/) | MIT | Meta Platforms, Inc. |
| [TypeScript](https://www.typescriptlang.org/) | Apache-2.0 | Microsoft Corporation |
| [@octokit/rest](https://github.com/octokit/rest.js) | MIT | Octokit contributors |
| [electron-updater](https://www.electron.build/auto-update) | MIT | electron-userland |
| [Redux Toolkit](https://redux-toolkit.js.org/) | MIT | Mark Erikson & Redux team |
| [Material UI](https://mui.com/) | MIT | MUI contributors |
| [electron-store](https://github.com/sindresorhus/electron-store) | MIT | Sindre Sorhus |
| [electron-builder](https://www.electron.build/) | MIT | electron-userland |
| [react-markdown](https://github.com/remarkjs/react-markdown) | MIT | Titus Wormer & unified collective |
| [remark-gfm](https://github.com/remarkjs/remark-gfm) | MIT | Titus Wormer & unified collective |
| [React Router](https://reactrouter.com/) | MIT | Remix Software, Inc. |
| [React Redux](https://react-redux.js.org/) | MIT | Dan Abramov & Redux team |
| [Emotion](https://emotion.sh/) | MIT | Emotion team & contributors |
| [webpack](https://webpack.js.org/) | MIT | JS Foundation & webpack contributors |

Thank you to all the maintainers and contributors of these projects.

## License

This project is licensed under the [BSD 3-Clause License](LICENSE).

Copyright (c) 2026, Jakub Duch.
