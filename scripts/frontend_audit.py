"""Small dependency-free audit for the CPACS Pelican theme.

Run from the repository root:
    uv run --locked python scripts/frontend_audit.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE_TEMPLATE = ROOT / "themes/polar/templates/base.html"
STYLE = ROOT / "themes/polar/static/css/style.css"
SITE_JS = ROOT / "themes/polar/static/js/site.js"
STATIC_ROOT = ROOT / "themes/polar/static"

REMOVED_ASSETS = {
    "theme/css/jquery.fs.boxer.css",
    "theme/css/owl.carousel.css",
    "theme/js/custom.js",
    "theme/js/jquery.ajaxchimp.min.js",
    "theme/js/modernizr.js",
}


def fail(errors: list[str], message: str) -> None:
    errors.append(message)


def css_braces_are_balanced(css: str) -> bool:
    """Check brace balance while ignoring comments and quoted strings."""
    depth = 0
    index = 0
    quote: str | None = None

    while index < len(css):
        char = css[index]
        next_char = css[index + 1] if index + 1 < len(css) else ""

        if quote is not None:
            if char == "\\":
                index += 2
                continue
            if char == quote:
                quote = None
            index += 1
            continue

        if char == "/" and next_char == "*":
            comment_end = css.find("*/", index + 2)
            if comment_end == -1:
                return False
            index = comment_end + 2
            continue

        if char in {"\"", "'"}:
            quote = char
        elif char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth < 0:
                return False
        index += 1

    return depth == 0 and quote is None


def audit() -> list[str]:
    errors: list[str] = []

    for path in (BASE_TEMPLATE, STYLE, SITE_JS):
        if not path.is_file():
            fail(errors, f"Missing required file: {path.relative_to(ROOT)}")

    if errors:
        return errors

    base = BASE_TEMPLATE.read_text(encoding="utf-8")
    css = STYLE.read_text(encoding="utf-8")
    site_js = SITE_JS.read_text(encoding="utf-8")

    for asset in sorted(REMOVED_ASSETS):
        if asset in base:
            fail(errors, f"Removed asset is still referenced in base.html: {asset}")

    local_assets = re.findall(
        r'(?:src|href)="\{\{ SITEURL \}\}/theme/([^"?#]+)', base
    )
    for relative_asset in sorted(set(local_assets)):
        asset_path = STATIC_ROOT / relative_asset
        if not asset_path.is_file():
            fail(errors, f"Referenced theme asset does not exist: {relative_asset}")

    for match in re.finditer(
        r"<script(?P<attrs>[^>]*)>(?P<body>.*?)</script>",
        base,
        flags=re.IGNORECASE | re.DOTALL,
    ):
        attrs = match.group("attrs")
        body = match.group("body").strip()
        if "src=" not in attrs and "application/ld+json" not in attrs and body:
            fail(errors, "base.html contains executable inline JavaScript")

    if "http://fonts.googleapis.com" in css:
        fail(errors, "style.css still contains an insecure Google Fonts import")
    if "outline-offset: none" in css:
        fail(errors, "style.css contains invalid 'outline-offset: none'")
    if re.search(r"\.owl-controls\s*\{\s*\}", css):
        fail(errors, "style.css contains the empty .owl-controls rule")

    if not css_braces_are_balanced(css):
        fail(errors, "style.css has unbalanced braces, an unterminated comment, or string")

    required_js_fragments = (
        "hidePreloader",
        "updateHeroLayout",
        "initOnePageNavigation",
        "updateStickyNavigation",
        "initScrollToTop",
    )
    for fragment in required_js_fragments:
        if fragment not in site_js:
            fail(errors, f"site.js is missing expected behavior: {fragment}")

    removed_behaviors = (
        "ajaxChimp",
        "owlCarousel",
        ".isotope",
        ".boxer",
        ".time-count-down",
        '$("#contact-form")',
    )
    for fragment in removed_behaviors:
        if fragment in site_js:
            fail(errors, f"site.js still contains removed legacy behavior: {fragment}")

    return errors


def main() -> int:
    errors = audit()
    if errors:
        print("Frontend audit failed:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)
        return 1

    print("Frontend audit passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
