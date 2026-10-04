// Builds the static site into dist/ for upload to GoDaddy cPanel (public_html).
//
// For each page in src/pages:
//   1. Injects the shared header partial (src/partials/header.html).
//   2. Pulls the page's inline Tailwind CDN config out and compiles a minified,
//      purged stylesheet with the Tailwind CLI — no CDN runtime in production.
//   3. Adds SEO / social meta tags, favicons, shared CSS and JS.
// Then copies assets and the static server files (.htaccess, robots.txt, ...).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const SRC = 'src';
const DIST = 'dist';
const TMP = '.tw-tmp';
const site = JSON.parse(readFileSync('site.config.json', 'utf8'));
const siteUrl = (site.siteUrl || '').replace(/\/$/, '');
if (!siteUrl) console.warn('⚠ siteUrl is empty in site.config.json — canonical URLs and sitemap.xml are skipped.');

rmSync(DIST, { recursive: true, force: true });
rmSync(TMP, { recursive: true, force: true });
mkdirSync(join(DIST, 'assets/css'), { recursive: true });
mkdirSync(TMP, { recursive: true });

cpSync(join(SRC, 'assets'), join(DIST, 'assets'), { recursive: true });
cpSync(join(SRC, 'public'), DIST, { recursive: true });

// Favicons generated from the brand logo.
const logo = join(SRC, 'assets/images/eagle-coats-logo.png');
const icon = (size) =>
  sharp(logo)
    .resize({ width: Math.round(size * 0.86), height: Math.round(size * 0.86), fit: 'contain', background: '#ffffff' })
    .extend({ top: Math.round(size * 0.07), bottom: Math.round(size * 0.07), left: Math.round(size * 0.07), right: Math.round(size * 0.07), background: '#ffffff' })
    .resize(size, size)
    .png();
await icon(32).toFile(join(DIST, 'favicon-32.png'));
await icon(180).toFile(join(DIST, 'apple-touch-icon.png'));
await icon(512).toFile(join(DIST, 'assets/images/icon-512.png'));

const headerPartial = readFileSync(join(SRC, 'partials/header.html'), 'utf8');
const pages = readdirSync(join(SRC, 'pages')).filter((f) => f.endsWith('.html'));

function extractTailwind(html) {
  const cdn = html.match(/<script src="https:\/\/cdn\.tailwindcss\.com([^"]*)"><\/script>\s*/);
  const cfg = html.match(/<script[^>]*>\s*tailwind\.config\s*=\s*([\s\S]*?);?\s*<\/script>\s*/);
  return {
    plugins: cdn ? (new URLSearchParams(cdn[1].replace(/^\?/, '')).get('plugins') || '').split(',').filter(Boolean) : [],
    config: cfg ? new Function(`return (${cfg[1]})`)() : null,
    strip: (s) => s.replace(cdn?.[0] ?? '\u0000', '').replace(cfg?.[0] ?? '\u0000', ''),
  };
}

const fallback = extractTailwind(readFileSync(join(SRC, 'pages/index.html'), 'utf8'));
const pluginModules = { forms: '@tailwindcss/forms', 'container-queries': '@tailwindcss/container-queries' };

for (const file of pages) {
  const name = file.replace(/\.html$/, '');
  const meta = site.pages[name] || {};
  let html = readFileSync(join(SRC, 'pages', file), 'utf8');

  // 1. Shared header
  html = html.replace(/<!-- @include header active="([^"]+)"( spacer)? -->/, (_, active, spacer) =>
    headerPartial.replace('id="site-header"', `id="site-header" data-active="${active}"`) +
    (spacer ? '\n<div class="ec-spacer" aria-hidden="true"></div>' : ''));
  if (!/id="main"/.test(html)) {
    html = /<main\b/.test(html)
      ? html.replace(/<main\b/, '<main id="main"')
      : html.replace(/(<\/header>[\s\S]*?)<section\b/, '$1<section id="main"');
  }

  // 2. Tailwind: compile instead of the CDN runtime
  const tw = extractTailwind(html);
  const { config, plugins } = tw.config ? tw : fallback;
  html = tw.strip(html);
  const outHtml = join(DIST, file);
  writeFileSync(outHtml, html); // written first so Tailwind can scan the final markup
  const cfgPath = join(TMP, `${name}.config.cjs`);
  writeFileSync(cfgPath, `module.exports = ${JSON.stringify({ ...config, content: [outHtml, 'src/assets/js/**/*.js'] }, null, 2)
    .replace(/\}\s*$/, `, plugins: [${plugins.map((p) => `require(${JSON.stringify(pluginModules[p])})`).join(', ')}] }`)};\n`);
  writeFileSync(join(TMP, 'input.css'), '@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
  execFileSync('npx', ['tailwindcss', '-c', cfgPath, '-i', join(TMP, 'input.css'), '-o', join(DIST, `assets/css/${name}.css`), '--minify'], { stdio: 'pipe' });

  // 3. Head: meta, icons, styles, script
  const title = meta.title || html.match(/<title>([^<]*)<\/title>/)?.[1] || site.name;
  const desc = meta.description || site.description;
  const url = siteUrl ? `${siteUrl}/${name === 'index' ? '' : file}` : '';
  const ogImage = `${siteUrl ? siteUrl + '/' : ''}${meta.image || site.image}`;
  html = html.replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`);
  html = html.replace(/<meta name="description"[^>]*>\s*/g, '');
  const head = `
<meta name="description" content="${desc}"/>
<meta name="theme-color" content="#0B0D10"/>
${url ? `<link rel="canonical" href="${url}"/>\n<meta property="og:url" content="${url}"/>\n` : ''}<meta property="og:type" content="website"/>
<meta property="og:site_name" content="${site.name}"/>
<meta property="og:title" content="${title}"/>
<meta property="og:description" content="${desc}"/>
<meta property="og:image" content="${ogImage}"/>
<meta name="twitter:card" content="summary_large_image"/>
<link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png"/>
<link rel="apple-touch-icon" href="apple-touch-icon.png"/>
<link rel="manifest" href="site.webmanifest"/>
<link rel="stylesheet" href="assets/css/${name}.css"/>
<link rel="stylesheet" href="assets/css/site.css"/>
`;
  html = html.replace(/<\/head>/, `${head}</head>`);
  html = html.replace(/<\/body>/, '<script src="assets/js/site.js" defer></script>\n</body>');

  // Images below the fold load lazily; responsive srcset for local WebP images.
  let imgIndex = 0;
  html = html.replace(/<img\b([^>]*)>/g, (tag, attrs) => {
    imgIndex++;
    let a = attrs;
    const m = a.match(/src="assets\/images\/([^"]+)-1280\.webp"/);
    if (m && !/srcset=/.test(a)) {
      a += ` srcset="assets/images/${m[1]}-640.webp 640w, assets/images/${m[1]}-1280.webp 1280w, assets/images/${m[1]}-1920.webp 1920w" sizes="(max-width: 768px) 100vw, 50vw"`;
    }
    if (!/loading=/.test(a) && imgIndex > 2) a += ' loading="lazy"';
    if (!/decoding=/.test(a)) a += ' decoding="async"';
    return `<img${a}>`;
  });

  writeFileSync(outHtml, html);
  console.log(`✓ ${file}`);
}

// Sitemap (needs an absolute site URL)
if (siteUrl) {
const lastmod = new Date().toISOString().slice(0, 10);
const urls = pages.filter((f) => f !== '404.html').map((f) =>
  `  <url><loc>${siteUrl}/${f === 'index.html' ? '' : f}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
writeFileSync(join(DIST, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`);
}
writeFileSync(join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\n${siteUrl ? `\nSitemap: ${siteUrl}/sitemap.xml\n` : ''}`);

rmSync(TMP, { recursive: true, force: true });
console.log(`\nBuilt ${pages.length} pages into ${DIST}/ — upload its contents to public_html.`);
