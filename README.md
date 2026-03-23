# why-changed

[![npm version](https://img.shields.io/npm/v/why-changed.svg)](https://www.npmjs.com/package/why-changed)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D24-brightgreen.svg)](https://nodejs.org)

**Pipe a git diff, get a plain-language explanation powered by Mistral AI.**

![DEMO GIF HERE]

---

## Installation

```bash
# npm
npm install -g why-changed

# pnpm
pnpm add -g why-changed

# bun
bun add -g why-changed

# yarn
yarn global add why-changed
```

---

## Usage

```bash
# Explain the last commit
git diff HEAD~1 | why-changed

# Explain staged changes
git diff --cached | why-changed

# Compare two branches
git diff main..feature/my-branch | why-changed

# Export as Markdown
git diff HEAD~1 | why-changed --format=md

# Export as HTML
git diff HEAD~1 | why-changed --format=html

# Custom output file
git diff HEAD~1 | why-changed --format=html --output=report.html

# Explain in French
git diff HEAD~1 | why-changed --lang=fr

# Disable colors (e.g. for CI logs)
git diff HEAD~1 | why-changed --no-color
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--format` | Output format: `terminal`, `md`, `html` | `terminal` |
| `--lang` | Response language (ISO 639-1 code, e.g. `fr`, `es`, `de`, `ja`) | `en` |
| `--output` | Output file path (for `md`/`html` formats) | `CHANGES.md` / `CHANGES.html` |
| `--no-color` | Disable colored terminal output | — |

### Output formats

| Format | Description |
|--------|-------------|
| `terminal` | Coloured output directly in your terminal |
| `md` | Markdown file ready to paste into a PR description or wiki |
| `html` | Self-contained HTML report with a dark-themed UI |

---

## API Key

`why-changed` uses the [Mistral AI API](https://console.mistral.ai/). Get a free key at **console.mistral.ai**, then set it before running:

```bash
export MISTRAL_API_KEY=your-key
```

Or create a `.env` file at your project root:

```env
MISTRAL_API_KEY=your-key
```

> The `.env` file is loaded automatically — no extra setup needed.

---

## Contributing

Contributions are welcome! Here's how to get started:

```bash
git clone https://github.com/Itaromi/why-changed.git
cd why-changed
npm install        # or pnpm install / bun install
cp .env.example .env   # add your MISTRAL_API_KEY
npm run build
git diff HEAD~1 | node bin/why-changed.js
```

To watch for changes during development:

```bash
npx tsc --watch
```

Bug reports and feature requests → [open an issue](https://github.com/Itaromi/why-changed/issues).

---

## License

MIT © [Youn Sylvestre](https://github.com/Itaromi)

---

<p align="center">Made with ❤️ by <a href="https://github.com/Itaromi">Youn Sylvestre</a></p>
