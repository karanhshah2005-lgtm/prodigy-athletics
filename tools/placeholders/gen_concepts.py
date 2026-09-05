"""Concept wall (owner direction 2026-09-04: "make some more. 30 different ones, i don't see
any anime ones"): thirty ANIME-STYLE concept designs, each on one of the logo'd plain
flat-lays (gen_logo/<id>-<view>.png + the logo reference), each a different original
anime character or scene — no named/existing characters, no third-party marks.
Output: gen_concepts/cNN-<slug>.png → assets/photos/concepts/ via convert (below)."""
import os, sys, base64, time, winreg, requests
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
# inputs live in the session scratchpad when run from there; in-repo runs need gen_logo/ beside this file
SRC = os.path.join(HERE, 'gen_logo')
OUT = os.path.join(HERE, 'gen_concepts')
os.makedirs(OUT, exist_ok=True)
REF = os.path.join(HERE, 'logo_ref.png')

def key():
    k = os.environ.get('GEMINI_API_KEY')
    if k: return k
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as h:
        return winreg.QueryValueEx(h, 'GEMINI_API_KEY')[0]

MODEL = 'gemini-3.1-flash-image'
URL = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent'

KEEP = ('Keep the first image\'s garment, cut, folds, framing, pure white background and lighting exactly as they are and keep '
        'the small Prodigy logo crisp and visible (second image = the logo for reference). The artwork is a dye-sublimation '
        'print in a proper Japanese ANIME illustration style — cel shading, clean line art, expressive anime faces where a '
        'character appears — as an all-over or large placement print. Original characters only: no existing anime, manga or '
        'game characters, no brand or sponsor marks, no text other than what is described. The result must still read as a '
        'clean e-commerce flat-lay product photograph.')

# (slug, source frame, design)
CONCEPTS = [
    ('shonen-aura',      'core-ls-black-back',  'a shonen anime fighter mid-punch, teeth gritted, hair blown back, a blazing golden power aura and radiating speed lines behind him'),
    ('samurai-rain',     'core-ls-white-back',  'a lone anime samurai drawing a katana in heavy rain, a great indigo ukiyo-e wave curling behind her'),
    ('mecha-head',       'core-ss-black-back',  'a giant anime mecha robot head, cyan glowing eyes, mechanical panel lines and warning stripes, seen from below'),
    ('kitsune',          'core-ls-black-front', 'a nine-tailed kitsune fox spirit wreathed in blue foxfire flames, tails sweeping over both sleeves'),
    ('neon-tokyo',       'core-ss-black-back',  'a rain-soaked neon Tokyo alley at night in anime style, glowing katakana shop signs, reflections in puddles, a small hooded figure walking away'),
    ('magical-burst',    'core-ls-white-back',  'an anime magical-girl transformation burst — pastel pink and blue light, sparkling stars, ribbons spiralling outward'),
    ('dragon-coil',      'genius-gi-black-back','a red-and-gold anime dragon coiling around the whole back of the jacket, whiskers streaming, pearl in its claw'),
    ('ninja-moon',       'genius-gi-white-back','an anime ninja silhouette leaping across a huge full moon, shuriken frozen mid-air, black ink and pale grey'),
    ('oni-vs-samurai',   'core-ls-black-back',  'a manga-page collage of an oni demon and a samurai duelling — three ink panels with speed lines and impact bursts'),
    ('chibi-armbar',     'core-ss-white-back',  'two cute chibi anime grapplers, one finishing an armbar on the other, big sparkly eyes, a little sweat drop, bold cartoon outlines'),
    ('retro-vhs',        'core-ls-black-back',  'a 1990s retro anime hero portrait with VHS scanlines and grain, chromatic-aberration colour fringing, a purple-orange sunset gradient'),
    ('torii-sakura',     'core-ls-white-back',  'an anime landscape — a red torii shrine gate at sunset with cherry-blossom petals blowing across a glowing sky'),
    ('anime-eyes',       'core-ss-black-front', 'an extreme close-up of intense anime eyes glaring through the fabric, halftone shading, a single highlight in each eye'),
    ('koi-yinyang',      'spats-black-front',   'two anime koi fish, one red one white, swirling into a yin-yang with water splashes, running the length of both legs'),
    ('raijin',           'genius-gi-blue-back', 'Raijin, the thunder god, drawn as a fierce anime deity beating a ring of drums, white lightning bolts everywhere'),
    ('space-pilot',      'core-ls-black-back',  'an anime space pilot in a helmet, the visor reflecting a starfield and a distant planet, soft cel-shaded lighting'),
    ('manga-page',       'core-ls-white-front', 'a full manga page printed on the front — panels of a jiu-jitsu match with a big sound-effect ドン across the chest'),
    ('hip-throw',        'core-ss-white-back',  'an anime girl in a gi throwing a huge opponent with a hip throw, dynamic low camera angle, motion-blur speed lines'),
    ('lightning-tiger',  'core-ls-black-back',  'an anime tiger roaring, its stripes turning into crackling white lightning, electric-blue glow'),
    ('ramen-brain',      'core-ss-black-back',  'a steaming anime ramen bowl whose rising steam curls into the shape of a geometric brain, chopsticks crossed above'),
    ('scramble',         'core-ls-white-back',  'two cel-shaded anime grapplers mid-scramble on a mat, one passing guard, drawn from a dramatic top-down angle with speed lines'),
    ('yokai-parade',     'shorts-black-front',  'a night parade of playful anime yokai spirits carrying glowing paper lanterns, running around both legs'),
    ('sakura-warrior',   'genius-gi-white-back','a cherry-blossom storm with a lone anime warrior silhouette standing in it, petals in pink and crimson'),
    ('vaporwave',        'core-ss-black-back',  'a vaporwave anime bust — a girl with glitch artifacts, pink-to-blue gradient, a grid horizon and a rising sun behind'),
    ('shinigami',        'core-ls-black-back',  'an anime shinigami in a tattered cloak holding a scythe, a glowing white lantern shaped like a brain at its side'),
    ('arcade-vs',        'core-ls-black-front', 'a retro arcade fighting-game select screen in anime style — two fighters facing off, a big VS in the middle, pixel health bars'),
    ('wolf-aurora',      'core-ls-white-back',  'an anime wolf pack howling on a ridge under a green-and-violet aurora, snow drifting'),
    ('pilot-suit',       'core-ls-black-front', 'an all-over anime mecha-pilot plug-suit print — glossy segmented panels, glowing seam lines, a chest reactor circle around the logo'),
    ('phoenix',          'genius-gi-black-back','an anime phoenix rising in orange and gold flames across the whole back, ink-brush feather strokes'),
    ('storm-brain',      'core-ss-white-back',  'a dramatic anime storm sky — towering clouds, a geometric brain of pure lightning at the centre, rain streaks'),
]

def b64(path): return base64.b64encode(open(path, 'rb').read()).decode()

def gen(i, slug, src, design):
    out = os.path.join(OUT, f'c{i:02d}-{slug}.png')
    if os.path.exists(out) and os.path.getsize(out) > 20000:
        return f'skip {slug}'
    body = {'contents': [{'parts': [
                {'inlineData': {'mimeType': 'image/jpeg', 'data': b64(os.path.join(SRC, f'{src}.png'))}},
                {'inlineData': {'mimeType': 'image/png', 'data': b64(REF)}},
                {'text': f'Edit the first image: print onto the garment {design}. ' + KEEP}]}],
            'generationConfig': {'responseModalities': ['IMAGE'], 'imageConfig': {'aspectRatio': '1:1'}}}
    last = ''
    for attempt in range(5):
        try:
            r = requests.post(URL, params={'key': key()}, json=body, timeout=240)
        except Exception as e:
            last = f'net {e}'; time.sleep(5 * (attempt + 1)); continue
        if r.status_code == 200:
            for part in r.json()['candidates'][0]['content']['parts']:
                if 'inlineData' in part:
                    open(out, 'wb').write(base64.b64decode(part['inlineData']['data']))
                    return f'ok {slug}'
            last = 'no image part'
        else:
            last = f'HTTP {r.status_code} {r.text[:200]}'
        time.sleep(8 * (attempt + 1))
    return f'FAIL {slug}: {last}'

if __name__ == '__main__':
    only = sys.argv[1:]
    jobs = [(i + 1, s, src, d) for i, (s, src, d) in enumerate(CONCEPTS) if not only or s in only]
    with ThreadPoolExecutor(max_workers=3) as ex:
        for f in as_completed([ex.submit(gen, *j) for j in jobs]):
            print(f.result(), flush=True)
    print('DONE')
