"""Which cpacs-doc the documentation is built with.

The website follows the generator's releases, not its default branch: a tag is
the generator's statement that a state may be published. The tests hand the
resolution its inputs - the environment, the tags the remote lists, the ref of
the cached checkout - instead of asking the network.
"""

from __future__ import annotations

import contextlib
import importlib.util
import io
import subprocess
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_spec = importlib.util.spec_from_file_location("documentation", ROOT / "scripts" / "documentation.py")
documentation = importlib.util.module_from_spec(_spec)
# Registered before it runs: its dataclasses look their module up by name.
sys.modules["documentation"] = documentation
_spec.loader.exec_module(documentation)


def tags(*names: str):
    return lambda: list(names)


def unreachable():
    raise subprocess.CalledProcessError(128, ["git", "ls-remote"])


class GeneratorRefTest(unittest.TestCase):
    def resolve(self, *, environ=None, list_tags=tags(), cached=None):
        return documentation.generator_ref(
            environ={} if environ is None else environ,
            list_tags=list_tags,
            cached=lambda: cached,
        )

    def test_the_newest_release_is_taken(self) -> None:
        ref, pinned = self.resolve(list_tags=tags("v0.1.0", "v0.2.0", "v0.1.1"))
        self.assertEqual(ref, "v0.2.0")
        # A release tag does not move, so it is fetched once like a CPACS tag.
        self.assertTrue(pinned)

    def test_versions_compare_as_numbers_not_as_text(self) -> None:
        ref, _ = self.resolve(list_tags=tags("v0.9.0", "v0.10.0"))
        self.assertEqual(ref, "v0.10.0")

    def test_a_tag_that_is_not_a_plain_release_is_ignored(self) -> None:
        ref, _ = self.resolve(list_tags=tags("v0.1.0", "v0.2.0-rc1", "vnext", "nightly"))
        self.assertEqual(ref, "v0.1.0")

    def test_the_environment_names_any_ref_and_it_moves(self) -> None:
        """`CPACS_DOC_REF=main` builds a preview with the unreleased generator."""
        ref, pinned = self.resolve(environ={"CPACS_DOC_REF": "main"}, list_tags=unreachable)
        self.assertEqual(ref, "main")
        self.assertFalse(pinned)

    def test_no_release_at_all_stops_the_build(self) -> None:
        with self.assertRaises(SystemExit):
            self.resolve(list_tags=tags("nightly"))

    def test_without_a_network_the_cached_release_is_used(self) -> None:
        warning = io.StringIO()
        with contextlib.redirect_stderr(warning):
            ref, pinned = self.resolve(list_tags=unreachable, cached="v0.1.0")
        self.assertEqual(ref, "v0.1.0")
        self.assertTrue(pinned)
        self.assertIn("building with the cached v0.1.0", warning.getvalue())

    def test_without_a_network_and_without_a_cache_the_failure_stands(self) -> None:
        with self.assertRaises(subprocess.CalledProcessError):
            self.resolve(list_tags=unreachable, cached=None)


if __name__ == "__main__":
    unittest.main()
