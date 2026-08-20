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

# Route PDFs to output/<Company-Slug>/ without prompting
cvgen path/to/resume.md --company "Acme Corp"

# Write PDFs to bare output/ without prompting
cvgen path/to/resume.md --no-company

# Scaffold a starter resume note
cvgen init
cvgen init path/to/my-resume.md   # write to a specific path
```

On an interactive terminal, cvgen prompts whether the resume is tailored for a specific company:

- Answering **n** → both PDFs written to `output/` relative to the current directory
- Answering **y** → prompts for a company name; PDFs written to `output/<Company-Slug>/` relative to the current directory

`--company "Acme Corp"` and `--no-company` skip those prompts. A non-interactive run (piped or CI) without either flag exits 1 with an error rather than hanging on a question nobody can answer.

The output directory is created automatically if it does not exist.

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
