"""Pelican configuration for local previews and production builds."""

from __future__ import annotations

import os

AUTHOR = "DLR"
SITENAME = "CPACS"

# Production builds default to the custom domain. The local development wrapper
# overrides this with an empty value so links remain on localhost.
SITEURL = os.environ.get("CPACS_SITE_URL", "https://www.cpacs.de").rstrip("/")
RELATIVE_URLS = not bool(SITEURL)

PATH = "content"
OUTPUT_PATH = "output"
THEME = "themes/polar"

TIMEZONE = "Europe/Berlin"
DEFAULT_LANG = "en"
DEFAULT_DATE_FORMAT = "%a %d %B %Y"
DEFAULT_PAGINATION = 10

# Keep the established public page URL pattern after removing the vendored
# pelican-page-hierarchy plugin. The baseline comparison detects any exceptional
# nested page whose historic path would otherwise change.
PAGE_URL = "pages/{slug}.html"
PAGE_SAVE_AS = "pages/{slug}.html"

# Feed generation is intentionally disabled to preserve the output currently
# produced by the GitHub Pages workflow.
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None


def site_url(path: str) -> str:
    """Return an absolute production URL or a root-relative local URL."""
    normalized = path.lstrip("/")
    return f"{SITEURL}/{normalized}" if SITEURL else f"/{normalized}"


LINKS = (
    ("Institute of System Architectures in Aeronautics", "https://www.dlr.de/sl"),
    ("Imprint", site_url("pages/imprint.html")),
    ("Privacy", site_url("pages/privacy.html")),
    ("Terms of use", site_url("pages/terms-of-use.html")),
    ("Accessibility", site_url("pages/accessibility.html")),
)
SOCIAL = ()

STATIC_PATHS = ["images", "pages/images", "extra/CNAME", "extra/404.html"]
EXTRA_PATH_METADATA = {
    "extra/CNAME": {"path": "CNAME"},
    # GitHub Pages reads the error document from the site root only, so the
    # page that hands schema-viewer addresses to their router must sit there.
    "extra/404.html": {"path": "404.html"},
}

# content/extra holds output files, not articles. Without this the HTML
# reader picks up 404.html and the build stops on its missing title.
ARTICLE_EXCLUDES = ["extra"]

# scripts/site.py owns cleanup. Keeping this false prevents Pelican's
# autoreloader from deleting the separately copied addContent tree.
DELETE_OUTPUT_DIRECTORY = False
