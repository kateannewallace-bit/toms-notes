"""Draws the app icon (a chalk treble clef and a yellow note on a ledger line, on a slate in a wooden frame) straight to PNG files.
Usage: run with a Python that has fontTools: python tools/make_icon.py NotoMusic.ttf
No image library needed: a tiny polygon filler with supersampling."""
import math, os, struct, sys, zlib
from fontTools.ttLib import TTFont
from fontTools.pens.recordingPen import DecomposingRecordingPen
f = TTFont(sys.argv[1]); gs = f.getGlyphSet()
def contours(name):
    pen = DecomposingRecordingPen(gs); gs[name].draw(pen)
    out, cur = [], []
    for op, a in pen.value:
        if op == 'moveTo': cur = [a[0]]
        elif op == 'lineTo': cur.append(a[0])
        elif op == 'qCurveTo':
            pts = list(a); p0 = cur[-1]
            for i in range(len(pts) - 1):
                c = pts[i]; e = pts[i + 1] if i == len(pts) - 2 else ((pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
                for t in range(1, 9):
                    u = t / 8; cur.append(((1 - u) ** 2 * p0[0] + 2 * u * (1 - u) * c[0] + u * u * e[0], (1 - u) ** 2 * p0[1] + 2 * u * (1 - u) * c[1] + u * u * e[1]))
                p0 = e
        elif op == 'curveTo':
            p0 = cur[-1]; c1, c2, e = a
            for t in range(1, 13):
                u = t / 12; cur.append(tuple((1 - u) ** 3 * p0[i] + 3 * u * (1 - u) ** 2 * c1[i] + 3 * u * u * (1 - u) * c2[i] + u ** 3 * e[i] for i in (0, 1)))
        elif op in ('closePath', 'endPath'): out.append(cur)
    return out
WOOD, SLATE, CHALK, YELLOW = (138, 98, 64), (38, 51, 45), (238, 236, 227), (243, 215, 122)
shapes = [(WOOD, [[(0, 0), (512, 0), (512, 512), (0, 512)]]), (SLATE, [[(34, 34), (478, 34), (478, 478), (34, 478)]])]
S = 44; bottom = 318
def rect(x0, y0, x1, y1): return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
for i in range(5): shapes.append((CHALK, [rect(62, bottom - i * S - 2.5, 450, bottom - i * S + 2.5)]))
k = S / 250
shapes.append((CHALK, [[(92 + x * k, bottom - y * k) for x, y in c] for c in contours('u1D11E')]))
# a note on the first ledger line above the staff
nx, ny = 340, bottom - 5 * S
shapes.append((YELLOW, [rect(nx - 46, ny - 3.5, nx + 46, ny + 3.5)]))
head = []
for i in range(60):
    a = 2 * math.pi * i / 60; ex, ey = 30 * math.cos(a), 21 * math.sin(a); r = math.radians(-20)
    head.append((nx + ex * math.cos(r) - ey * math.sin(r), ny + ex * math.sin(r) + ey * math.cos(r)))
shapes.append((YELLOW, [head]))
shapes.append((YELLOW, [rect(nx - 30, ny, nx - 24, ny + 3 * S)]))
def render(size, ss=4):
    n = size * ss; K = n / 512
    px = [bytearray(n * 3) for _ in range(n)]
    for color, rings in shapes:
        edges = []
        for r in rings:
            for (x0, y0), (x1, y1) in zip(r, r[1:] + r[:1]):
                if y0 != y1: edges.append((x0 * K, y0 * K, x1 * K, y1 * K))
        ymin = max(0, int(min(min(e[1], e[3]) for e in edges))); ymax = min(n - 1, int(max(max(e[1], e[3]) for e in edges)) + 1)
        cb = bytes(color)
        for yi in range(ymin, ymax + 1):
            y = yi + 0.5
            xs = sorted(x0 + (y - y0) * (x1 - x0) / (y1 - y0) for x0, y0, x1, y1 in edges if (y0 <= y < y1) or (y1 <= y < y0))
            row = px[yi]
            for a, b in zip(xs[::2], xs[1::2]):
                a = max(0, int(a + 0.5)); b = min(n, int(b + 0.5))
                if b > a: row[a * 3:b * 3] = cb * (b - a)
    out = bytearray()
    for y in range(size):
        out.append(0)
        rows = px[y * ss:(y + 1) * ss]
        for x in range(size):
            for ch in range(3): out.append(sum(r[(x * ss + i) * 3 + ch] for r in rows for i in range(ss)) // (ss * ss))
    def chunk(t, d): return struct.pack('>I', len(d)) + t + d + struct.pack('>I', zlib.crc32(t + d) & 0xffffffff)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>IIBBBBB', size, size, 8, 2, 0, 0, 0)) + chunk(b'IDAT', zlib.compress(bytes(out), 9)) + chunk(b'IEND', b'')
here = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'icons')
for name, size in (('icon-512.png', 512), ('icon-192.png', 192), ('apple-touch-icon.png', 180)):
    open(os.path.join(here, name), 'wb').write(render(size, 4 if size < 300 else 2)); print('wrote', name)
