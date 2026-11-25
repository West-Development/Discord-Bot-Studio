# Discord Bot Studio

A desktop app for building, testing, and running Discord bots visually without writing boilerplate code. Powered by Electron and discord.js v14.

> **Work in Progress:** Discord Bot Studio is actively being developed and updated. Some features are still experimental, so you may run into occasional bugs or rough edges. If something breaks, feel free to open an [Issue](https://github.com) with details.

---

## Features

- **Visual Command & Event Builder:** Stack actions for slash commands, prefix commands, server events, embeds, role buttons, dropdown menus, and modals.
- **Multi-Bot Workspace:** Create, rename, import, export (`.zip`), and manage multiple bot projects from one launcher.
- **Database Support:** Built-in local JSON storage plus direct support for **MySQL / MariaDB**, **PostgreSQL**, **SQLite**, and **MongoDB** with `{database.table.column}` placeholders.
- **Live Console:** Start, stop, or restart your bot directly inside the app and run live console commands (`help`, `status`, `say`, `dm`, `reload`, `clear`).
- **Auto-Sync & Deploy:** Automatically registers slash commands and syncs your bot's profile name, avatar, and description.

---

## Download & Install

### Option 1: Standalone Download (Recommended)
1. Head over to the **Releases** page.
2. Download the latest **`Discord.Bot.Studio-1.0.0-win.zip`** or **`Discord Bot Studio 1.0.0.exe`**.
3. Extract the folder and run `Discord Bot Studio.exe`.

*(Note: Because the app is not code-signed yet, Windows SmartScreen may show a warning on first launch—click **More info → Run anyway**.)*

### Option 2: Run from Source
```bash
git clone https://github.com
cd Discord-Bot-Studio
npm install
npm start
```

---

## Quick Start

1. Open **Discord Bot Studio** and click **+ Create New Bot**.
2. Go to the **Settings** tab and paste your **Bot Token** and **Client ID** from the [(Discord Developer Portal)](https://discord.com/developers/applications).
3. Build your commands and events in the **Commands** and **Events** tabs.
4. Click **Start Bot** in the top-right corner.

---

## Credits

Developed by **WestDevs**.  
Licensed under the [Apache License 2.0](LICENSE).
