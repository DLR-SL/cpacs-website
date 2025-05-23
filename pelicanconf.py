#!/usr/bin/env python
# -*- coding: utf-8 -*- #
from __future__ import unicode_literals

AUTHOR = u'DLR'
SITENAME = u'CPACS'
SITEURL = "https://dlr-sl.github.io/cpacs-website"
#SITEURL = "https://digitalhangar-demo.pages.gitlab.dlr.de/cpacs-website-preview/"
#SITEURL = "http://localhost:8000/"

PATH = 'content'

TIMEZONE = 'Europe/Paris'

DEFAULT_LANG = u'en'

DEFAULT_DATE_FORMAT = '%a %d %B %Y'


THEME = 'themes/polar'

# Feed generation is usually not desired when developing
FEED_ALL_ATOM = None
CATEGORY_FEED_ATOM = None
TRANSLATION_FEED_ATOM = None
AUTHOR_FEED_ATOM = None
AUTHOR_FEED_RSS = None

# Blogroll
#   Note: the full path is used for Imprint and Privacy, since Pelican omits pages 
#   when generating the news.. (ToDo: fix this)
LINKS = (('Institute of System Architectures in Aeronautics', 'http://www.dlr.de/sl'),
         ('Imprint', '%s/pages/imprint.html' % SITEURL),
         ('Privacy', '%s/pages/privacy.html' % SITEURL),
         ('Terms of use', '%s/pages/terms-of-use.html' % SITEURL),
         ('Accessibility', '%s/pages/accessibility.html' % SITEURL),)

# Social widget
SOCIAL = ()

DEFAULT_PAGINATION = 10

# Uncomment following line if you want document-relative URLs when developing
#RELATIVE_URLS = True

# Static paths
STATIC_PATHS = ['images', 'pages/images', 'extra/CNAME']

# Plugins
PLUGIN_PATHS = ["plugins", "d:\\rce\\plugins"]
PLUGINS = ['pelican-page-hierarchy.page_hierarchy',]

# Github pages domain name
EXTRA_PATH_METADATA = {'extra/CNAME': {'path': 'CNAME'},}
