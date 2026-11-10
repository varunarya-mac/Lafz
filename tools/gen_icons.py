#!/usr/bin/env python3
"""Generate Lafz app icons (PNG) — pure Python, no dependencies.

Design: teal-to-indigo diagonal gradient, a soft teal back-card, a white
front-card with three difficulty-colored bars (green/amber/red) and a teal dot.
All content sits inside the maskable-unsafe-free zone (center 80%).
"""
import os
import zlib
import struct

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT = os.path.join(ROOT, "icons")
os.makedirs(OUT, exist_ok=True)

# ----- design geometry (512-space) -----
G1 = (13.0, 148.0, 136.0)   # gradient start  #0D9488
G2 = (30.0, 58.0, 138.0)    # gradient end    #1E3A8A
BACK  = (232.0, 234.0, 96.0, 122.0, 30.0)    # cx, cy, half-w, half-h, radius
FRONT = (276.0, 280.0, 104.0, 132.0, 34.0)
FILL_BACK = (94.0, 234.0, 212.0)             # #5EEAD4
BARS = [
    (272.0, 205.0, 66.0, 11.0, (34.0, 197.0, 94.0)),   # green
    (250.0, 246.0, 44.0, 11.0, (245.0, 158.0, 11.0)),  # amber
    (260.0, 287.0, 54.0, 11.0, (239.0, 68.0, 68.0)),   # red
]
DOT = (344.0, 184.0, 17.0)

def in_rrect(x, y, cx, cy, hw, hh, r):
    dx = max(abs(x - cx) - hw + r, 0.0)
    dy = max(abs(y - cy) - hh + r, 0.0)
    return dx * dx + dy * dy <= r * r

def in_circle(x, y, cx, cy, r):
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= r * r

def sample(x, y):
    t = (x + y) / 1024.0
    col = (
        G1[0] + (G2[0] - G1[0]) * t,
        G1[1] + (G2[1] - G1[1]) * t,
        G1[2] + (G2[2] - G1[2]) * t,
    )
    if in_rrect(x, y, *FRONT):
        col = (255.0, 255.0, 255.0)
        for (bcx, bcy, bhw, bhh, c) in BARS:
            if in_rrect(x, y, bcx, bcy, bhw, bhh, 11.0):
                col = c
                break
        if in_circle(x, y, DOT[0], DOT[1], DOT[2]):
            col = FILL_BACK
        return col
    if in_rrect(x, y, *BACK):
        a = 0.45
        col = tuple(FILL_BACK[i] * a + col[i] * (1 - a) for i in range(3))
    return col

def render(size):
    k = 512.0 / size
    rows = []
    for py in range(size):
        row = bytearray()
        for px in range(size):
            r = g = b = 0.0
            for ox in (0.25, 0.75):
                for oy in (0.25, 0.75):
                    s = sample((px + ox) * k, (py + oy) * k)
                    r += s[0]; g += s[1]; b += s[2]
            row += bytes((int(r / 4 + 0.5), int(g / 4 + 0.5), int(b / 4 + 0.5), 255))
        rows.append(bytes(row))
    return rows

def write_png(path, w, h, rows):
    def chunk(tag, data):
        c = struct.pack(">I", len(data)) + tag + data
        return c + struct.pack(">I", zlib.crc32(tag + data) & 0xffffffff)
    body = bytearray()
    for row in rows:
        body.append(0)  # filter: none
        body += row
    png = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(body), 9))
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(png)
    print("wrote %s (%dx%d, %d bytes)" % (path, w, h, len(png)))

if __name__ == "__main__":
    for size, name in ((512, "icon-512.png"),
                       (512, "icon-512-maskable.png"),
                       (192, "icon-192.png"),
                       (180, "apple-touch-icon.png")):
        write_png(os.path.join(OUT, name), size, size, render(size))
    print("done.")
