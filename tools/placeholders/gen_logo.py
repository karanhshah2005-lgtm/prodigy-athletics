"""Put the (real) Prodigy chest logo on the placeholder flat-lays via Gemini image editing.

Inputs per job: the existing placeholder PNG (gen/<id>-<view>.png) + a crop of the real
logo from the client's own photograph (core-ls-worn.webp: geometric brain over
PROD·I·GY / ATHLETICS). Output: gen_logo/<id>-<view>.png. Everything else in the frame
must stay identical.
"""
import os, sys, base64, time, winreg, requests
from concurrent.futures import ThreadPoolExecutor, as_completed
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'gen')
OUT = os.path.join(HERE, 'gen_logo')
os.makedirs(OUT, exist_ok=True)
REF = os.path.join(HERE, 'logo_ref.png')

def key():
    k = os.environ.get('GEMINI_API_KEY')
    if k: return k
    with winreg.OpenKey(winreg.HKEY_CURRENT_USER, 'Environment') as h:
        return winreg.QueryValueEx(h, 'GEMINI_API_KEY')[0]

MODEL = 'gemini-3.1-flash-image'
URL = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent'

def make_ref():
    if os.path.exists(REF): return
    im = Image.open(r'C:\Users\Jenis\prodigy-athletics\assets\photos\core-ls-worn.webp')
    im.crop((265, 440, 515, 690)).resize((750, 750), Image.LANCZOS).save(REF)

GI = {'genius-gi-black', 'genius-gi-white', 'genius-gi-blue', 'shi-gi-black', 'shi-gi-white'}
BOTTOMS = {'recon-shorts', 'recon-spats', 'shorts-black', 'spats-black'}
SETS = {'recon-set', 'maple-set', 'core-set'}
LIGHT = {'core-ls-white', 'core-ss-white', 'genius-gi-white', 'shi-gi-white'}

def prompt(pid, view):
    ink = 'black' if pid in LIGHT else 'white'
    logo = (f'the exact logo shown in the second image — a geometric, faceted line-art brain over the wordmark '
            f'"PROD·I·GY" with "ATHLETICS" in small letterspaced capitals beneath it — reproduced faithfully, as a single '
            f'{ink} screen print, crisp and flat on the fabric')
    if pid in GI:
        where = ('on the left chest panel of the gi jacket (viewer\'s right), small, about one eighth of the jacket width'
                 if view == 'front' else 'centred high on the back of the jacket between the shoulder blades, about one third of the jacket width')
    elif pid in BOTTOMS:
        where = ('on the left thigh (viewer\'s right), small' if view == 'front' else 'centred on the back waistband area, small')
    elif pid in SETS:
        where = ('on the left chest of the top (viewer\'s right), small, and once more on the left thigh of the bottoms, small'
                 if view == 'front' else 'centred high on the back of the top between the shoulder blades, about one third of its width')
    else:
        where = ('on the left chest (viewer\'s right), small, about one eighth of the garment width'
                 if view == 'front' else 'centred high on the back between the shoulder blades, about one third of the garment width')
    return (f'Edit the first image: add {logo}, placed {where}. Keep everything else in the first image exactly as it is — '
            f'same garment, same colours, same folds, same framing, same pure white background, same lighting. '
            f'Add no other text, logos, labels or patches. The result must look like the same product photograph with the logo printed on.')

def b64(path):
    return base64.b64encode(open(path, 'rb').read()).decode()

def gen(pid, view):
    out = os.path.join(OUT, f'{pid}-{view}.png')
    if os.path.exists(out) and os.path.getsize(out) > 20000:
        return f'skip {pid}-{view}'
    src = os.path.join(SRC, f'{pid}-{view}.png')
    body = {'contents': [{'parts': [
                {'inlineData': {'mimeType': 'image/jpeg', 'data': b64(src)}},
                {'inlineData': {'mimeType': 'image/png', 'data': b64(REF)}},
                {'text': prompt(pid, view)}]}],
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
    make_ref()
    only = sys.argv[1:]
    ids = sorted(f[:-4] for f in os.listdir(SRC) if f.endswith('.png'))
    jobs = [tuple(i.rsplit('-', 1)) for i in ids if not only or i in only]
    with ThreadPoolExecutor(max_workers=3) as ex:
        for f in as_completed([ex.submit(gen, p, v) for p, v in jobs]):
            print(f.result(), flush=True)
    print('DONE')
