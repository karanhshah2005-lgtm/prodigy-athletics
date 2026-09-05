"""Writes concepts.html from the CONCEPTS list in gen_concepts.py (tiles + captions stay in
sync with the images). Run from the repo root after gen_concepts.py + conversion."""
import html, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = open(os.path.join(ROOT, 'tools', 'placeholders', 'gen_concepts.py'), encoding='utf-8').read()
items = re.findall(r"\('([a-z0-9-]+)',\s*'([a-z0-9-]+)',\s*'((?:[^'\\]|\\.)*)'\)", src)
assert len(items) == 30, len(items)

GARMENT = {
    'core-ls-black': 'Core long sleeve, black', 'core-ls-white': 'Core long sleeve, white',
    'core-ss-black': 'Core short sleeve, black', 'core-ss-white': 'Core short sleeve, white',
    'genius-gi-black': 'Genius gi, black', 'genius-gi-white': 'Genius gi, white', 'genius-gi-blue': 'Genius gi, blue',
    'spats-black': 'Spats, black', 'shorts-black': 'Shorts, black',
}
TITLES = {
    'shonen-aura': 'Power-up', 'samurai-rain': 'Samurai in the rain', 'mecha-head': 'Mecha', 'kitsune': 'Kitsune',
    'neon-tokyo': 'Neon alley', 'magical-burst': 'Transformation', 'dragon-coil': 'Dragon', 'ninja-moon': 'Ninja moon',
    'oni-vs-samurai': 'Oni vs samurai', 'chibi-armbar': 'Chibi armbar', 'retro-vhs': 'Retro VHS', 'torii-sakura': 'Torii at sunset',
    'anime-eyes': 'The stare', 'koi-yinyang': 'Koi', 'raijin': 'Raijin', 'space-pilot': 'Space pilot', 'manga-page': 'Manga page',
    'hip-throw': 'Hip throw', 'lightning-tiger': 'Lightning tiger', 'ramen-brain': 'Ramen brain', 'scramble': 'The scramble',
    'yokai-parade': 'Yokai parade', 'sakura-warrior': 'Sakura storm', 'vaporwave': 'Vaporwave', 'shinigami': 'Shinigami',
    'arcade-vs': 'Arcade VS', 'wolf-aurora': 'Wolves under the aurora', 'pilot-suit': 'Plug-suit', 'phoenix': 'Phoenix',
    'storm-brain': 'Storm brain',
}

tiles = []
for i, (slug, srcf, design) in enumerate(items, 1):
    base, view = srcf.rsplit('-', 1)
    g = GARMENT[base]
    design = design.replace("\\'", "'")
    alt = html.escape(f'Concept {i:02d}: {g}, {view} view, printed with {design}. Placeholder concept, not a product.', quote=True)
    lazy = '' if i <= 3 else ' loading="lazy"'
    tiles.append(f'''      <figure class="tile tile--white">
        <span class="tile__box"><img src="assets/photos/concepts/c{i:02d}-{slug}.webp" width="1024" height="1024"{lazy} decoding="async"
             alt="{alt}"></span>
        <figcaption class="tile__cap t-label">{i:02d} &mdash; {html.escape(TITLES[slug])} <span class="tile__sub">{html.escape(g)}, {view}</span></figcaption>
      </figure>''')

page = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Concepts — Prodigy Athletics</title>
<meta name="description" content="Thirty anime-style concept designs sketched onto Prodigy placeholders — imagination fodder for the line, not products.">
<meta name="robots" content="noindex">
<link rel="icon" href="assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="src/brand.css">
<link rel="stylesheet" href="src/ui/store.css">
<link rel="stylesheet" href="src/ui/pages.css">
</head>
<body class="pageshell">

<!-- SAMPLE STRIP — permanent, not dismissible -->
<div class="strip t-micro" role="note">Sample site — prices and product copy are placeholders</div>

<header class="psh">
  <nav class="psh__nav" aria-label="Primary">
    <a class="psh__link t-nav" href="shop.html">Shop</a>
    <a class="psh__link t-nav" href="culture.html">Culture</a>
    <a class="psh__link t-nav" href="events.html">Events</a>
  </nav>
  <span class="psh__spacer"></span>
  <a class="psh__wordmark t-h2" href="index.html">Prodigy Athletics</a>
</header>

<!-- CONCEPT WALL — owner direction 2026-09-04 ("make some more, 30 different ones, anime").
     GENERATED FILE: tools/placeholders/build_concepts_page.py writes this page from the
     CONCEPTS list in gen_concepts.py — edit there, not here. Thirty AI-generated concept
     designs on the placeholder flat-lays (docs/PHOTOS.md, "Concept wall"): original
     anime-style characters and scenes, no existing characters, no third-party marks.
     Sketches for the client to imagine his own line with his logo — none is a product. -->
<main class="cult">
  <div class="cult__head">
    <h1 class="t-display-l">Concepts.</h1>
    <p class="t-micro">Thirty anime-style sketches on the placeholders. Imagination fodder for the line &mdash; none of these is a product.</p>
  </div>

  <div class="cult__grid cult__grid--3">
''' + '\n'.join(tiles) + '''
  </div>
</main>

<footer class="psf">
  <span class="t-h2">Prodigy Athletics</span>
  <span class="t-micro">Sample site &mdash; prices and product copy are placeholders. Concept artwork is AI-generated and original; the logo is Prodigy&rsquo;s.</span>
</footer>

</body>
</html>
'''
open(os.path.join(ROOT, 'concepts.html'), 'w', encoding='utf-8', newline='\n').write(page)
print('concepts.html', len(tiles), 'tiles')
