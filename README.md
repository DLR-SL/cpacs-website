# CPACS website

Source files and build tooling for the CPACS website at `https://www.cpacs.de`.
The site is generated with Pelican and deployed to GitHub Pages by GitHub Actions.

## Prerequisites

Install `uv` 0.11.29 or a newer 0.11.x release, then clone the repository.
Python and all project dependencies are managed by `uv`; a separate Anaconda or
system-wide Pelican installation is not required. The official installers are:

```powershell
# Windows PowerShell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/0.11.29/install.ps1 | iex"
```

```bash
# Linux and macOS
curl -LsSf https://astral.sh/uv/0.11.29/install.sh | sh
```

## Initial setup

```bash
git clone https://github.com/DLR-SL/cpacs-website.git
cd cpacs-website
uv sync --locked
```

The committed `.python-version`, `pyproject.toml`, and `uv.lock` define the
reproducible environment used locally and in CI.

## Local preview

```bash
uv run --locked python scripts/site.py serve
```

The preview is available at `http://127.0.0.1:8000/`. Use another port with:

```bash
uv run --locked python scripts/site.py serve --port 8001
```

Pelican content is regenerated automatically. Restart the preview after changing
files below `addContent/`.

## Production build and checks

```bash
uv run --locked python scripts/site.py build
uv run --locked python scripts/site.py check
```

The generated website is written to `output/`. The check command verifies key
entry points, the custom-domain file, copied schema files, unresolved build
placeholders, local filesystem paths, and internal links.

To compare a new build with the baseline captured before the build-system
migration:

```bash
uv run --locked python scripts/site.py compare-baseline baseline/output
```

Missing public files cause a non-zero exit status. Added and changed files are
reported for review.

## Deployment

Pull requests build and validate the website without deploying it. A successful
push to `main` uploads the generated `output/` directory as a GitHub Pages
artifact and deploys it.

The canonical site URL is `https://www.cpacs.de`. Keep the custom domain set in
**Repository settings → Pages** and retain `content/extra/CNAME` with the value
`www.cpacs.de`.

## Content

Articles and pages are stored below `content/`. Release announcements require,
for example:

```text
Title: Release 3.5.0
Date: 2025-04-22 12:00
Category: Releases
Author: CPACS
```

Large generated documentation, schema archives, and other files currently remain
below `addContent/` and are copied into the generated site by `scripts/site.py`.

## Dependency updates

Dependabot checks the `uv` environment and GitHub Actions monthly. Review and
merge dependency updates only after the website build and validation job passes.
