# Eagle Coats — Dark Mode Website

A dark-mode redesign of the Eagle Coats site (paints, waterproofing, tile care, wood coatings — Vijayawada, since 1974). The pages were designed in Google Stitch and then made ready for production: the CSS is compiled ahead of time, images are stored locally as WebP, there is one shared header with a mobile menu, and the layout is tuned for current phones (360–430px wide, notched iPhones).

**Pages:** Home · Products · Colour Studio · About · Dealers · 404

## Project layout

```
src/
  pages/        Source HTML for each page (Stitch output + edits)
  partials/     Shared header with the mobile menu
  assets/       Images (WebP 640/1280/1920), site.css, site.js
  public/       .htaccess and site.webmanifest, copied as-is
scripts/
  build.mjs            Builds src/ into dist/
  localize-images.mjs  One-off: downloads remote images into src/assets/images
dist/           ← The built site. Upload its contents to public_html
site.config.json  Site URL, page titles and descriptions
.cpanel.yml     Deploy config for cPanel Git Version Control
```

## Build

```bash
npm install
npm run build
```

`dist/` is committed, so you can deploy without Node.js on the server. Rebuild and commit after you change anything in `src/`.

**Before going live**, set your domain in `site.config.json` (`"siteUrl": "https://www.yourdomain.com"`) and rebuild. That turns on canonical URLs, `og:url` and `sitemap.xml`.

## Deploy to GoDaddy cPanel

Choose one option.

### Option A — Upload manually (simplest)
1. Run `npm run build`.
2. In cPanel, open **File Manager → public_html**.
3. Upload everything inside `dist/`, including the hidden `.htaccess` file. (Turn on *Settings → Show Hidden Files*.) An easy way is to zip `dist/`, upload the zip, then use **Extract**.

### Option B — cPanel Git Version Control
1. In cPanel, open **Git Version Control → Create**. Clone this repository's URL into a folder such as `repositories/eaglecoats-dark`. A private repo needs an SSH deploy key: generate one in cPanel *SSH Access*, then add it under GitHub *Settings → Deploy keys*.
2. Open **Manage → Pull or Deploy**, then click **Update from Remote** followed by **Deploy HEAD Commit**. `.cpanel.yml` copies `dist/` into `public_html`.

### Option C — Automatic deploy from GitHub (FTPS)
Add the repository secrets `FTP_SERVER`, `FTP_USERNAME` and `FTP_PASSWORD`. After that, every push to `main` builds the site and uploads `dist/` to `public_html` (see `.github/workflows/deploy.yml`).

After deploying, turn on **SSL/TLS → AutoSSL** in cPanel. `.htaccess` then redirects all traffic to HTTPS. It also enables clean URLs (`/products`), gzip compression, browser caching, security headers and the custom 404 page.

## Mobile & performance
- One shared header with a full-screen mobile menu: keyboard and Escape support, page scroll locked while it's open, active page highlighted.
- Product filters collapse behind a "Filters" button on phones.
- `viewport-fit=cover` and safe-area insets for notched iPhones and the home indicator.
- Form inputs use 16px text so iOS doesn't zoom in on them.
- Checked for horizontal overflow at 360, 390 and 430px.
- Tailwind is compiled and purged per page (~17–39 KB each) instead of using the CDN script.
- Images are responsive WebP with `srcset`, and images below the fold load lazily.

## Content to finish before launch
- The dealer list holds **demo listings** carried over from the original site. Replace them with real dealers in `src/pages/dealers.html`.
- Forms (quote request, dealer enquiry) are front-end only. Connect them to an email or form backend, for example a cPanel PHP mailer, Formspree or Web3Forms.
- People and room photos are AI-generated images from Stitch. Replace them with real photography whenever you can.
