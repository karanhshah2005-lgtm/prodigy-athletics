"""Placeholder product imagery for the Prodigy Athletics sample storefront.

One flat-lay-on-white photograph per product per view (front/back), in the style of an
Albino & Preto collection grid. PLAIN garments, no logos/text/patches — these stand in
for the client's own product photography and are labelled as placeholders on the site.
Model: gemini-3.1-flash-image. Output: scratchpad/gen/<id>-<view>.png (then converted
to assets/photos/products/<id>-<view>.webp by convert_products.py).
"""
import os, sys, json, base64, time, winreg, requests
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'gen')
os.makedirs(OUT, exist_ok=True)

def key():
    k = os.environ.get('GEMINI_API_KEY')
    if k: return k
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as h:
        return winreg.QueryValueEx(h, 'GEMINI_API_KEY')[0]

MODEL = 'gemini-3.1-flash-image'
URL = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent'

STYLE = ('E-commerce product photograph, studio flat lay shot from directly above on a seamless pure white '
         'background (#FFFFFF), soft even lighting, a faint natural shadow under the garment so its edges read '
         'clearly against the white, the garment centred and filling about 75% of the square frame, sharp focus, '
         'no props, no mannequin, no person, no text, no logos, no labels, no patches, no watermark. ')

GI_FRONT = ('A plain {c} Brazilian jiu-jitsu gi jacket (kimono top, pearl-weave cotton), laid flat, front view, '
            'lapels folded closed left over right, sleeves laid out straight to the sides, matching {c} gi trousers '
            'folded neatly and placed just below the jacket hem.')
GI_BACK = ('A plain {c} Brazilian jiu-jitsu gi jacket (kimono top, pearl-weave cotton), laid flat and seen from '
           'behind — the plain back panel, the collar and the yoke seam visible, no opening — sleeves laid out '
           'straight to the sides, matching {c} gi trousers folded neatly and placed just below the jacket hem.')

LS = 'a {c} long-sleeve compression rashguard (grappling rash guard, smooth matte polyester-spandex, crew neck, flatlock seams)'
SS = 'a {c} short-sleeve compression rashguard (grappling rash guard, smooth matte polyester-spandex, crew neck, flatlock seams)'
SHORTS = 'a pair of {c} grappling fight shorts (board-short style, wide elastic waistband with a drawstring, no pockets)'
SPATS = 'a pair of {c} full-length compression spats (grappling leggings, elastic waistband)'

def top(desc, view):
    v = 'front view' if view == 'front' else 'seen from behind (back view, showing the plain back panel and the back of the neck)'
    return f'{desc[0].upper()}{desc[1:]}, laid flat, {v}, sleeves laid out straight to the sides.'
def bottom(desc, view):
    v = 'front view, waistband at the top' if view == 'front' else 'seen from behind (back view), waistband at the top'
    return f'{desc[0].upper()}{desc[1:]}, laid flat with the legs together, {v}.'
def setpair(t, b, view):
    v = 'both front view' if view == 'front' else 'both seen from behind (back view)'
    return (f'A matching two-piece set laid flat side by side: {t} on the left with its sleeves laid out, and {b} on the '
            f'right with the legs together, {v}, waistband at the top.')

BLACK, WHITE = 'plain solid black', 'plain solid white'
CAMO = 'dark olive, moss green and charcoal woodland-camouflage all-over printed'
MAPLE = ('Canadian-flag graphic: bright red sleeves and red side bands, a white centre panel and one large red maple '
         'leaf printed in the middle')

PRODUCTS = {
    'genius-gi-black': lambda v: (GI_FRONT if v == 'front' else GI_BACK).format(c='black'),
    'genius-gi-white': lambda v: (GI_FRONT if v == 'front' else GI_BACK).format(c='white'),
    'genius-gi-blue':  lambda v: (GI_FRONT if v == 'front' else GI_BACK).format(c='royal competition-blue'),
    'shi-gi-black':    lambda v: (GI_FRONT if v == 'front' else GI_BACK).format(c='black'),
    'shi-gi-white':    lambda v: (GI_FRONT if v == 'front' else GI_BACK).format(c='white'),
    'core-ls-black':   lambda v: top(LS.format(c=BLACK), v),
    'core-ls-white':   lambda v: top(LS.format(c=WHITE), v),
    'core-ss-black':   lambda v: top(SS.format(c=BLACK), v),
    'core-ss-white':   lambda v: top(SS.format(c=WHITE), v),
    'recon-ls':        lambda v: top(LS.format(c=CAMO), v),
    'recon-ss':        lambda v: top(SS.format(c=CAMO), v),
    'recon-shorts':    lambda v: bottom(SHORTS.format(c=CAMO), v),
    'recon-spats':     lambda v: bottom(SPATS.format(c=CAMO), v),
    'recon-set':       lambda v: setpair(LS.format(c=CAMO), SHORTS.format(c=CAMO), v),
    'maple-ls':        lambda v: top(LS.format(c=MAPLE), v),
    'maple-set':       lambda v: setpair(LS.format(c=MAPLE), SPATS.format(c='matching red-and-white'), v),
    'shorts-black':    lambda v: bottom(SHORTS.format(c=BLACK), v),
    'spats-black':     lambda v: bottom(SPATS.format(c=BLACK), v),
    'core-set':        lambda v: setpair(LS.format(c=BLACK), SHORTS.format(c=BLACK), v),
}

def gen(pid, view):
    out = os.path.join(OUT, f'{pid}-{view}.png')
    if os.path.exists(out) and os.path.getsize(out) > 20000:
        return f'skip {pid}-{view}'
    prompt = STYLE + PRODUCTS[pid](view)
    body = {'contents': [{'parts': [{'text': prompt}]}],
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
                    return f'ok {pid}-{view}'
            last = 'no image part'
        else:
            last = f'HTTP {r.status_code} {r.text[:200]}'
        time.sleep(8 * (attempt + 1))
    return f'FAIL {pid}-{view}: {last}'

if __name__ == '__main__':
    only = sys.argv[1:]  # optional "<id>-<view>" filters for re-runs
    jobs = [(p, v) for p in PRODUCTS for v in ('front', 'back') if not only or f'{p}-{v}' in only]
    with ThreadPoolExecutor(max_workers=3) as ex:
        futs = [ex.submit(gen, p, v) for p, v in jobs]
        for f in as_completed(futs):
            print(f.result(), flush=True)
    print('DONE')
