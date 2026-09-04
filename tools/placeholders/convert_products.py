"""gen/<id>-<view>.png -> assets/photos/products/<id>-<view>.webp (1024 square, q82)."""
import os, glob
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'gen_design')   # third pass output (gen_design.py); earlier passes: gen, gen_logo
DST = r'C:\Users\Jenis\prodigy-athletics\assets\photos\products'
os.makedirs(DST, exist_ok=True)
n = 0
for f in sorted(glob.glob(os.path.join(SRC, '*.png'))):
    im = Image.open(f).convert('RGB')
    w, h = im.size
    if w != h:
        s = min(w, h); im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s))
    im = im.resize((1024, 1024), Image.LANCZOS)
    out = os.path.join(DST, os.path.basename(f)[:-4] + '.webp')
    im.save(out, 'WEBP', quality=82, method=6)
    n += 1
print('converted', n)
total = sum(os.path.getsize(p) for p in glob.glob(os.path.join(DST, '*.webp')))
print('total bytes', total)
