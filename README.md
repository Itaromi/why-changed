# why-changed

[![npm version](https://img.shields.io/npm/v/why-changed.svg)](https://www.npmjs.com/package/why-changed)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen.svg)](https://nodejs.org)

**Pipe a git diff, get a plain-language explanation powered by AI.**

![DEMO GIF HERE]

---

## Installation

```bash
npm install -g why-changed
```

---

## Usage

```bash
# Explain the last commit
git diff HEAD~1 | why-changed

# Export as Markdown
git diff HEAD~1 | why-changed --format=md

# Export as HTML
git diff HEAD~1 | why-changed --format=html

# Explain in French
git diff HEAD~1 | why-changed --lang=fr

# Custom output file
git diff HEAD~1 | why-changed --format=html --output=report.html

# Explain staged changes
git diff --cached | why-changed

# Compare two branches
git diff main..feature/my-branch | why-changed
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--format` | Output format: `terminal`, `md`, `html` | `terminal` |
| `--lang` | Response language (ISO code, e.g. `fr`, `es`, `de`) | `en` |
| `--output` | Output file path (for `md`/`html` formats) | `CHANGES.md` / `CHANGES.html` |
| `--no-color` | Disable colored terminal output | — |

---

## API Keys

`why-changed` uses the OpenAI API. Set your key before running:

```bash
export OPENAI_API_KEY=sk-...
```

Or add it to a `.env` file in your project root:

```env
OPENAI_API_KEY=sk-...
```

---

## Pro version

| Feature | Free | Pro |
|---------|------|-----|
| Max diff size | 200 lines | Unlimited |
| AI model | GPT-4o mini | GPT-4o |
| Output formats | terminal, md, html | terminal, md, html |
| Multi-language | ✓ | ✓ |

Upgrade to Pro at **[LEMON_SQUEEZY_URL_HERE]** and set your license key:

```bash
export WHY_LICENSE_KEY=your-license-key
```

---

## Contributing

1. Fork the repo
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Install deps: `npm install`
4. Build in watch mode: `npx tsc --watch`
5. Run locally: `git diff HEAD~1 | node bin/why-changed.js`
6. Submit a pull request

Bug reports and feature requests are welcome in [Issues](../../issues).

---

## License

MIT © [YOUR_NAME]

---

<p align="center">Made with ❤️ by <a href="[YOUR_NAME]">[YOUR_NAME]</a></p>
