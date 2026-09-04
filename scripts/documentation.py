#!/usr/bin/env python3
"""Generation of the schema documentation with the cpacs-doc generator.

The rendered documentation is not kept in this repository. It is produced on
every build from two upstream sources, so the published pages always come out
of the current generator instead of a snapshot somebody once committed:

* https://github.com/DLR-SL/cpacs-doc - the generator, taken from its default
  branch, deliberately unpinned.
* https://github.com/DLR-SL/CPACS - schema and documentation media, taken from
  the release tag the documentation belongs to.

Both are cached below ``.cache/`` so repeated local builds do not clone again.
The CPACS checkout is sparse and blobless: only ``schema/`` and
``documentation/`` are needed, which is a quarter of the working tree.
"""

from __future__ import annotations

import os
import shutil
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE_DIR = ROOT / ".cache"
TOOL_DIR = CACHE_DIR / "cpacs-doc"
SOURCE_DIR = CACHE_DIR / "cpacs"

TOOL_URL = "https://github.com/DLR-SL/cpacs-doc.git"
TOOL_REF = os.environ.get("CPACS_DOC_REF", "main")
SOURCE_URL = "https://github.com/DLR-SL/CPACS.git"
SOURCE_PATHS = ("schema", "documentation")

# Written next to the checkout rather than derived from `git describe`: it
# records which ref this working tree was put on, which is what decides whether
# a fetch is needed, and it survives without a network to ask.
REF_STAMP = ".cpacs-website-ref"


@dataclass(frozen=True)
class Documentation:
    """One documentation build below ``output/documentation``."""

    directory: str
    ref: str


# The published documentation sets. A release tag is pinned; the generator that
# renders it is not, which is the point of building here at all.
DOCUMENTATION = (Documentation(directory="CPACS_3_5_1_Docs", ref="v3.5.1"),)


def _git(*arguments: str, cwd: Path) -> None:
    subprocess.run(["git", *arguments], cwd=cwd, check=True)


def _clone(url: str, path: Path, ref: str, sparse: tuple[str, ...]) -> None:
    if path.exists():
        shutil.rmtree(path)
    path.parent.mkdir(parents=True, exist_ok=True)

    arguments = ["clone", "--depth", "1", "--branch", ref, "--no-recurse-submodules"]
    if sparse:
        arguments += ["--filter=blob:none", "--sparse"]
    _git(*arguments, url, str(path), cwd=ROOT)

    if sparse:
        _git("sparse-checkout", "set", *sparse, cwd=path)


def _checkout(path: Path, ref: str) -> None:
    _git("fetch", "--depth", "1", "origin", ref, cwd=path)
    _git("checkout", "--detach", "--force", "FETCH_HEAD", cwd=path)


def _sync(
    url: str,
    path: Path,
    ref: str,
    *,
    pinned: bool,
    sparse: tuple[str, ...] = (),
) -> Path:
    """Put ``path`` on ``ref``, cloning it when it is not there yet.

    A pinned ref is fetched once and then left alone; a moving ref is fetched on
    every build. When a fetch fails and a checkout is already present the build
    continues on it, so a missing network does not stop work that has all its
    inputs on disk.
    """

    stamp = path / REF_STAMP

    if not (path / ".git").is_dir():
        _clone(url, path, ref, sparse)
    elif pinned and stamp.is_file() and stamp.read_text(encoding="utf-8") == ref:
        return path
    else:
        try:
            _checkout(path, ref)
        except subprocess.CalledProcessError:
            if not stamp.is_file():
                raise
            print(
                f"warning: {url} could not be updated; "
                f"building from the cached checkout in {path}",
                file=sys.stderr,
            )
            return path

    stamp.write_text(ref, encoding="utf-8")
    return path


def _uv() -> str:
    executable = shutil.which("uv")
    if executable is None:
        raise SystemExit(
            "uv was not found on PATH. It runs the cpacs-doc generator in its "
            "own locked environment; see the README for installation."
        )
    return executable


def _generator_environment() -> dict[str, str]:
    """Environment for the nested ``uv run``.

    This script itself usually runs inside the website environment. Its
    ``VIRTUAL_ENV`` points at that one, and uv would report it as a mismatch
    against the generator project it is asked to run.
    """

    environment = os.environ.copy()
    environment.pop("VIRTUAL_ENV", None)
    return environment


def generate(output_dir: Path) -> None:
    """Render every configured documentation set below ``output_dir``."""

    tool = _sync(TOOL_URL, TOOL_DIR, TOOL_REF, pinned=False)
    converter = tool / "tools" / "convert_media_catalogue.py"

    for documentation in DOCUMENTATION:
        source = _sync(
            SOURCE_URL,
            SOURCE_DIR / documentation.ref,
            documentation.ref,
            pinned=True,
            sparse=SOURCE_PATHS,
        )
        target = output_dir / "documentation" / documentation.directory / "cpacs-doc"

        # The figure catalogue is not part of the CPACS release; it is derived
        # from the Sandcastle project file that ships with it. Building it here
        # keeps the figures the generator resolves in step with the release.
        subprocess.run(
            [sys.executable, str(converter), str(source / "documentation")],
            cwd=ROOT,
            check=True,
        )

        # The catalogue is found by its position next to the schema directory,
        # which is why neither --media nor --media-root has to be passed.
        # --single puts the self-contained variant next to the static pages it
        # duplicates, the way the sandcastle build keeps its .chm beside its
        # HTML. One directory per documentation system, nothing beside them.
        subprocess.run(
            [
                _uv(),
                "run",
                # The generator is cached inside this repository, so uv would
                # otherwise pick up the website's own [tool.uv] settings - the
                # exclude-newer date among them - and refuse the generator's
                # lockfile as out of date. It carries no uv configuration of its
                # own, so there is nothing here that --no-config takes away.
                "--no-config",
                "--project",
                str(tool),
                "--locked",
                "cpacs-doc",
                "build",
                str(source / "schema" / "cpacs_schema.xsd"),
                "-o",
                str(target),
                "--site",
                "--single",
            ],
            cwd=ROOT,
            env=_generator_environment(),
            check=True,
        )


if __name__ == "__main__":
    generate(ROOT / "output")
