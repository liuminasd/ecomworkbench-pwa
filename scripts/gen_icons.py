# -*- coding: utf-8 -*-
"""生成 PWA 图标：青底 + 白色柱状图（数据工作台意象），纯标准库"""
import struct, zlib, os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(BASE, 'assets')

def make_icon(size):
    W = H = size
    bg = (20, 184, 166)   # 青 #14b8a6
    fg = (255, 255, 255)  # 白
    bars = [  # 三个竖条 (x0, x1, bottom, top) 归一化
        (0.24, 0.42, 0.64, 0.36),
        (0.44, 0.62, 0.64, 0.26),
        (0.64, 0.82, 0.64, 0.16),
    ]
    raw = bytearray()
    for y in range(H):
        raw.append(0)  # filter: none
        ny = y / H
        for x in range(W):
            nx = x / W
            c = bg
            for x0, x1, b, t in bars:
                if x0 <= nx <= x1 and t <= ny <= b:
                    c = fg
                    break
            raw += bytes(c)
    def chunk(typ, data):
        return struct.pack('>I', len(data)) + typ + data + struct.pack('>I', zlib.crc32(typ + data) & 0xffffffff)
    ihdr = struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0)
    return b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', ihdr) + chunk(b'IDAT', zlib.compress(bytes(raw), 9)) + chunk(b'IEND', b'')

os.makedirs(ASSETS, exist_ok=True)
for s in (192, 512):
    path = os.path.join(ASSETS, f'icon-{s}x{s}.png')
    with open(path, 'wb') as f:
        f.write(make_icon(s))
    print('generated', path, os.path.getsize(path), 'bytes')
