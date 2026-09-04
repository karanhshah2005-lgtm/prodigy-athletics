"""Third pass: CONCEPT DESIGNS on the placeholder flat-lays (owner direction 2026-09-04:
"better designs for the thumbnails, too generic, get creative — anime, pop culture —
get rid of the camo"). Inputs: gen_logo/<id>-<view>.png (garment + chest logo) and the
real-logo reference crop. Output: gen_design/<id>-<view>.png. Original anime/pop-culture
FLAVOURED artwork only — no named characters, no third-party marks."""
import os, sys, base64, time, winreg, requests
from concurrent.futures import ThreadPoolExecutor, as_completed

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'gen_logo')
OUT = os.path.join(HERE, 'gen_design')
os.makedirs(OUT, exist_ok=True)
REF = os.path.join(HERE, 'logo_ref.png')

def key():
    k = os.environ.get('GEMINI_API_KEY')
    if k: return k
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as h:
        return winreg.QueryValueEx(h, 'GEMINI_API_KEY')[0]

MODEL = 'gemini-3.1-flash-image'
URL = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent'

KEEP = ('Keep the first image\'s garment, cut, colour, folds, framing, pure white background and lighting exactly as they are, '
        'and keep the existing small Prodigy logo where it is. The second image is the Prodigy logo for reference — reproduce it '
        'faithfully wherever the logo appears. Original artwork only: no real anime characters, no brand or sponsor marks, '
        'no text other than what is described. The result must still read as a clean e-commerce flat-lay product photograph.')

LIGHT = {'core-ls-white', 'core-ss-white', 'genius-gi-white', 'shi-gi-white'}
def ink(pid): return 'black' if pid in LIGHT else 'white'

# ── line designs ─────────────────────────────────────────────────────────
def genius(pid, v):
    c = ink(pid)
    if v == 'front':
        return (f'Add embroidery: on the left front skirt of the jacket (viewer\'s right, low), a palm-sized embroidered geometric '
                f'brain with three small lightning bolts above it in {c} and gold thread; down the outer left sleeve, a tonal '
                f'tone-on-tone manga speed-line graphic (same colour as the fabric, slightly glossy, barely visible). On the folded '
                f'trousers, a short tonal embroidered mathematical equation along the leg.')
    return (f'Add embroidery to the back: between the shoulder blades a large embroidered geometric faceted brain with lightning '
            f'bolts bursting from it in {c} and gold thread, anime "power-up" style with radiating manga speed lines stitched '
            f'tone-on-tone around it; across the back skirt the word GENIUS in bold blocky {c} letters; the small Prodigy logo '
            f'below the collar.')

def shi(pid, v):
    c = ink(pid)
    if v == 'front':
        return (f'Add: a small sumi-ink brush-painted kanji 死 in {c} on the right chest panel (viewer\'s left), balancing the logo; '
                f'a tiny red hanko seal-stamp square below it; a tonal ink-splatter graphic down the left sleeve.')
    return (f'Add to the back: a huge sumi-e ink-brush painting of a snarling anime oni skull in {c} with ink splatter and dry-brush '
            f'strokes, the kanji 死 painted large and loose over its forehead, a red hanko seal stamp in the lower corner; '
            f'the small Prodigy logo below the collar.')

def core(pid, v, garment):
    c = ink(pid)
    if garment == 'top':
        if v == 'front':
            return (f'Add: down the outer left sleeve the word PRODIGY printed in {c} vertical katakana-style block letters; '
                    f'a subtle tone-on-tone glossy manga speed-line burst on the right side panel.')
        return (f'Add a big back print: the geometric brain logo rendered huge in {c} with anime-style radiating manga speed lines '
                f'and a halftone dot glow behind it, the words THINK AND WIN in small {c} letterspaced capitals underneath.')
    if garment == 'bottom':
        return (f'Add: a tone-on-tone glossy manga speed-line panel down the right leg with PRODIGY in {c} vertical block letters '
                f'inside it; keep the small hip logo.')
    return (f'Add to BOTH pieces: the top gets ' + ('the PRODIGY vertical katakana-style sleeve print in white and a subtle tonal speed-line side panel'
            if v == 'front' else 'a huge white geometric brain back print with radiating manga speed lines and THINK AND WIN in small capitals below') +
            f'; the bottoms get a tonal speed-line panel down the right leg with PRODIGY in white vertical block letters.')

def oni(pid, v, garment):
    art = ('an all-over dye-sublimation print: deep crimson red and black, a fierce anime oni demon mask with curved horns and '
           'fangs, scattering cherry-blossom petals, bold manga speed lines and small gold accents')
    if garment == 'top':
        where = ('the mask centred on the chest under the logo, petals flowing over the sleeves' if v == 'front'
                 else 'the mask huge across the whole back, petals and speed lines over the sleeves')
    elif garment == 'bottom':
        where = ('the mask on the right leg, petals scattering up to the waistband' if v == 'front'
                 else 'petals and speed lines across the back, a small mask on the right leg')
    else:
        where = ('the mask on the chest of the top and again on the right leg of the bottoms, petals over both' if v == 'front'
                 else 'the mask huge on the back of the top, petals and speed lines on the bottoms')
    return f'Replace the plain fabric with {art} — {where}. The white Prodigy logo stays crisp on top of the print.'

def maple(pid, v, garment):
    art = ('a retro-anime all-over print: a giant red halftone-dot maple leaf, a red-and-white rising-sun ray burst behind it, '
           'bold manga speed lines, the leaf outlined in thick black manga ink')
    if garment == 'top':
        where = ('the leaf and ray burst centred on the chest, red sleeves with white speed lines' if v == 'front'
                 else 'the leaf huge across the back with the ray burst filling the shoulders')
    elif garment == 'bottom':
        where = 'the leaf on the right leg with the ray burst rising from the ankle'
    else:
        where = ('the leaf and ray burst on the chest of the top, a leaf on the right leg of the spats' if v == 'front'
                 else 'the leaf huge on the back of the top, ray burst on the back of the spats')
    return f'Replace the plain fabric with {art} — {where}. The Prodigy logo stays crisp on top of the print.'

PRODUCTS = {
    'genius-gi-black': lambda v: genius('genius-gi-black', v),
    'genius-gi-white': lambda v: genius('genius-gi-white', v),
    'genius-gi-blue':  lambda v: genius('genius-gi-blue', v),
    'shi-gi-black':    lambda v: shi('shi-gi-black', v),
    'shi-gi-white':    lambda v: shi('shi-gi-white', v),
    'core-ls-black':   lambda v: core('core-ls-black', v, 'top'),
    'core-ls-white':   lambda v: core('core-ls-white', v, 'top'),
    'core-ss-black':   lambda v: core('core-ss-black', v, 'top'),
    'core-ss-white':   lambda v: core('core-ss-white', v, 'top'),
    'shorts-black':    lambda v: core('shorts-black', v, 'bottom'),
    'spats-black':     lambda v: core('spats-black', v, 'bottom'),
    'core-set':        lambda v: core('core-set', v, 'set'),
    'recon-ls':        lambda v: oni('recon-ls', v, 'top'),
    'recon-ss':        lambda v: oni('recon-ss', v, 'top'),
    'recon-shorts':    lambda v: oni('recon-shorts', v, 'bottom'),
    'recon-spats':     lambda v: oni('recon-spats', v, 'bottom'),
    'recon-set':       lambda v: oni('recon-set', v, 'set'),
    'maple-ls':        lambda v: maple('maple-ls', v, 'top'),
    'maple-set':       lambda v: maple('maple-set', v, 'set'),
}

def b64(path): return base64.b64encode(open(path, 'rb').read()).decode()

def gen(pid, view):
    out = os.path.join(OUT, f'{pid}-{view}.png')
    if os.path.exists(out) and os.path.getsize(out) > 20000:
        return f'skip {pid}-{view}'
    body = {'contents': [{'parts': [
                {'inlineData': {'mimeType': 'image/jpeg', 'data': b64(os.path.join(SRC, f'{pid}-{view}.png'))}},
                {'inlineData': {'mimeType': 'image/png', 'data': b64(REF)}},
                {'text': 'Edit the first image. ' + PRODUCTS[pid](view) + ' ' + KEEP}]}],
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
    only = sys.argv[1:]
    jobs = [(p, v) for p in PRODUCTS for v in ('front', 'back') if not only or f'{p}-{v}' in only]
    with ThreadPoolExecutor(max_workers=3) as ex:
        for f in as_completed([ex.submit(gen, p, v) for p, v in jobs]):
            print(f.result(), flush=True)
    print('DONE')
