# Website for CPACS

Homepage (landing page) and announcements for CPACS (http://www.cpacs.de).

Based on [Pelican](http://blog.getpelican.com/) and a modifed Polar theme by [CodePassenger](http://www.codepassenger.com/).

## Local Installation

* Install Python ([Anaconda](https://store.continuum.io/cshop/anaconda/) works perfectly)

* Install Pelican and supporting libraries

```
pip install pelican
pip install markdown
pip install fabric
pip install ghp-import
```

 * Clone rce-website

```
git clone https://github.com/dlr-ly/cpacs-website
```

### Configuration

 * Set proper port for local testing, which works on your machine in `fabfile.py`

```
# Port for `serve`
PORT = 8001
```

## Build 

 * Generate website 
```
fab build
```

 * Start local server for testing (http://localhost:8001/)
```
fab serve
```

 * Convenience target for rebuild and starting local server
```
fab reserve
```

## Deployment



## Writing Content

Use either [Markdown](http://daringfireball.net/projects/markdown/) or HTML for new articles, as described in [Writing content](http://docs.getpelican.com/en/3.6.3/content.html).

Add new articles to `content`.

### Metadata

The required meta data for CPACS release announcements are:
```
Title: Release 2.3.0 
Date: 2015-11-04 12:00
Category: Releases
Author: CPACS
```



### Image sizes
 * Article image: 870x440 px
 * Thumbnail large: 100x108
 * Thumbnail small: 67x73


