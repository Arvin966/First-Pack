First Pack — static Minecraft Java resources directory

Files:
- index.html: accessible, responsive interface + SEO metadata
- app.js: filtering, search, pagination, modal, ratings, language/theme preferences
- data.json: resource catalog
- style.css: responsive visual system
- site.webmanifest: installable web-app metadata
- assets/: local thumbnails and favicon
- sitemap.xml: replace the placeholder domain before publishing

Deployment:
1. Upload the folder as-is to any static host.
2. Replace YOUR-DOMAIN.example in sitemap.xml with the real HTTPS domain.
3. If the site is deployed under a subfolder, update canonical/manifest/sitemap paths accordingly.
