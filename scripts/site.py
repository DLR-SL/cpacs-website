#!/usr/bin/env python3
"""Cross-platform build, preview, validation, and baseline comparison."""

from __future__ import annotations

import argparse
import hashlib
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path

import documentation

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIR = ROOT / "content"
ADDITIONAL_DIR = ROOT / "addContent"
OUTPUT_DIR = ROOT / "output"
SETTINGS_FILE = ROOT / "pelicanconf.py"
DEFAULT_SITE_URL = "https://dlr-sl.github.io/cpacs-website"


def remove_output() -> None:
    if OUTPUT_DIR.exists():
        shutil.rmtree(OUTPUT_DIR)
    OUTPUT_DIR.mkdir(parents=True)


def pelican_command(*extra: str) -> list[str]:
    return [
        sys.executable,
        "-m",
        "pelican",
        str(CONTENT_DIR),
        "-o",
        str(OUTPUT_DIR),
        "-s",
        str(SETTINGS_FILE),
        *extra,
    ]


def build_environment(site_url: str) -> dict[str, str]:
    environment = os.environ.copy()
    environment["CPACS_SITE_URL"] = site_url
    return environment


def copy_additional_content() -> None:
    if not ADDITIONAL_DIR.exists():
        return

    for source in ADDITIONAL_DIR.iterdir():
        destination = OUTPUT_DIR / source.name
        if source.is_dir():
            shutil.copytree(source, destination, dirs_exist_ok=True)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)


def configured_site_url() -> str:
    return os.environ.get("CPACS_SITE_URL", DEFAULT_SITE_URL).rstrip("/")


def build(site_url: str | None = None) -> None:
    effective_site_url = configured_site_url() if site_url is None else site_url

    remove_output()
    subprocess.run(
        pelican_command(),
        cwd=ROOT,
        env=build_environment(effective_site_url),
        check=True,
    )
    copy_additional_content()
    documentation.generate(OUTPUT_DIR)


def terminate(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is None:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()


def serve(port: int) -> None:
    build(site_url="")
    environment = build_environment("")

    generator = subprocess.Popen(
        pelican_command("--autoreload"),
        cwd=ROOT,
        env=environment,
    )
    server = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "http.server",
            str(port),
            "--bind",
            "127.0.0.1",
            "--directory",
            str(OUTPUT_DIR),
        ],
        cwd=ROOT,
        env=environment,
    )

    print(f"Local preview: http://127.0.0.1:{port}/")
    print("Press Ctrl+C to stop. Restart after changing files in addContent/.")

    try:
        while generator.poll() is None and server.poll() is None:
            time.sleep(0.25)
    except KeyboardInterrupt:
        pass
    finally:
        terminate(generator)
        terminate(server)

    if generator.returncode not in (None, 0, -15) or server.returncode not in (
        None,
        0,
        -15,
    ):
        raise SystemExit("The preview generator or HTTP server stopped unexpectedly.")


def check() -> None:
    subprocess.run(
        [sys.executable, "scripts/frontend_audit.py"],
        cwd=ROOT,
        check=True,
    )
    build()
    subprocess.run(
        [
            sys.executable,
            "-m",
            "compileall",
            "-q",
            "pelicanconf.py",
            "scripts",
            "tests",
        ],
        cwd=ROOT,
        check=True,
    )
    subprocess.run(
        [sys.executable, "-m", "unittest", "discover", "-s", "tests", "-v"],
        cwd=ROOT,
        check=True,
    )


def file_hash(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def manifest(directory: Path) -> dict[str, str]:
    return {
        path.relative_to(directory).as_posix(): file_hash(path)
        for path in sorted(directory.rglob("*"))
        if path.is_file()
    }


def compare_baseline(baseline: Path) -> None:
    if not baseline.is_dir():
        raise SystemExit(f"Baseline directory not found: {baseline}")

    build()
    previous = manifest(baseline)
    current = manifest(OUTPUT_DIR)

    missing = sorted(previous.keys() - current.keys())
    added = sorted(current.keys() - previous.keys())
    changed = sorted(
        path
        for path in previous.keys() & current.keys()
        if previous[path] != current[path]
    )

    print(f"Baseline files: {len(previous)}")
    print(f"Current files:  {len(current)}")
    print(f"Missing:        {len(missing)}")
    print(f"Added:          {len(added)}")
    print(f"Changed:        {len(changed)}")

    for heading, entries in (
        ("MISSING", missing),
        ("ADDED", added),
        ("CHANGED", changed),
    ):
        if entries:
            print(f"\n{heading}")
            for entry in entries:
                print(f"  {entry}")

    if missing:
        raise SystemExit("Baseline comparison failed: public files are missing.")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    subparsers = parser.add_subparsers(dest="command", required=True)

    subparsers.add_parser("build", help="Generate the production website")
    subparsers.add_parser("clean", help="Remove generated output")
    subparsers.add_parser("check", help="Build and run validation tests")

    serve_parser = subparsers.add_parser(
        "serve", help="Start a local auto-reloading preview"
    )
    serve_parser.add_argument("--port", type=int, default=8000)

    compare_parser = subparsers.add_parser(
        "compare-baseline", help="Build and compare output with a baseline directory"
    )
    compare_parser.add_argument("baseline", type=Path)

    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.command == "build":
        build()
    elif args.command == "clean":
        remove_output()
    elif args.command == "check":
        check()
    elif args.command == "serve":
        serve(args.port)
    elif args.command == "compare-baseline":
        compare_baseline(args.baseline.resolve())


if __name__ == "__main__":
    main()
