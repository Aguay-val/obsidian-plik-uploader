# Plik Uploader for Obsidian

Upload notes, files, and folders from your vault to a self-hosted [Plik](https://github.com/root-gg/plik) server and copy the share link — all from Obsidian.

## Features

- **Upload current note** — send the active file to Plik via command palette or ribbon icon
- **Export to PDF & upload** — render any Markdown note to PDF (desktop) and upload in one step
- **Upload any file** — right-click any file in the file explorer → "Share via Plik"
- **Zip & upload folders** — right-click a folder → "Share via Plik (zip)"
- **Left sidebar** — browse upload history, copy links, delete uploads remotely
- **Share options** — TTL (1d, 1w, 1m, never), one-shot links, password protection
- **Remote deletion** — delete uploads directly from Obsidian
- **Local history** — keep track of all past uploads with expiry indicators
- **i18n** — English, French, Spanish (auto-detect from Obsidian locale)

## Requirements

- [Obsidian](https://obsidian.md) desktop (PDF export requires desktop)
- A running [Plik](https://github.com/root-gg/plik) instance
- (Optional) A Plik API token to manage your storage space

## Installation

### From Community Plugins

1. Open Obsidian → Settings → Community Plugins → Browse
2. Search for **Plik Uploader**
3. Install → Enable

### Manual

1. Download `main.js`, `manifest.json` from the [latest release](https://github.com/Aguay-val/obsidian-plik-uploader/releases/latest)
2. Create a folder `plik-uploader` in your vault's `.obsidian/plugins/` directory
3. Copy the files into that folder
4. Enable the plugin in Settings → Community Plugins

## Configuration

1. Open Settings → Plik Uploader
2. Enter your Plik server URL (e.g. `https://plik.example.com`)
3. (Optional) Enter an API token to manage your uploads
4. Choose default TTL, sidebar behavior, and language

## Development

```bash
npm install
npm run dev        # watch mode
npm run build      # production build → main.js
npm test           # run tests
```

## License

[GPL-3.0](LICENSE)
