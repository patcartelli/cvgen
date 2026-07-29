# cvgen

Turn an Obsidian markdown resume note into two polished PDFs — a portfolio-quality typographic PDF and an ATS-safe single-column PDF — using Claude API for extraction and Puppeteer for rendering.

## Prerequisites

- Node.js 22 or later
- An `ANTHROPIC_API_KEY` — get one at [console.anthropic.com](https://console.anthropic.com)

## Install

```bash
git clone https://github.com/patcartelli/cvgen.git
cd cvgen
npm install
npm run build   # compile TypeScript to dist/
npm link        # makes `cvgen` available as a global command
```

## Usage

```bash
# Generate both PDFs from a markdown resume note
cvgen path/to/resume.md

# Print Claude API response and parsed JSON to stderr
cvgen path/to/resume.md --verbose

# Extract and validate JSON without rendering any PDFs
cvgen path/to/resume.md --validate-only

# Scaffold a starter resume note
cvgen init
cvgen init path/to/my-resume.md   # write to a specific path
```

Output files are written alongside the input file:

- `resume-resume.pdf` — portfolio-quality typographic PDF
- `resume-resume-ats.pdf` — simplified single-column ATS-safe PDF

## Environment

`ANTHROPIC_API_KEY` must be set before running. You can export it in your shell or add it to a `.env` file in the project root:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
# or
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
```

## Development

```bash
npm run dev          # run CLI directly with tsx (no build step)
npm test             # run the test suite (38 tests, no API key needed)
npm run build        # compile TypeScript to dist/
npm run typecheck    # type-check without emitting
npm run lint         # Biome lint + format check
```

## License

CC0 1.0 Universal — see [LICENSE](./LICENSE).
