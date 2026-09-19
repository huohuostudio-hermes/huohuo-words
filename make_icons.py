#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 PWA 图标（渐变圆角方块 + 火焰/音符），输出 icon-192/512/180.png"""
from PIL import Image, ImageDraw, ImageFont

SIZE = 512

def make_icon(size):
    img = Image.new("RGB", (size, size), (13, 16, 32))
    d = ImageDraw.Draw(img)
    # 深蓝紫渐变背景
    for y in range(size):
        t = y / size
        r = int(13 + (124 - 13) * t * 0.55)
        g = int(16 + (108 - 16) * t * 0.55)
        b = int(32 + (255 - 32) * t * 0.55)
        d.line([(0, y), (size, y)], fill=(r, g, b))
    # 圆角
    mask = Image.new("L", (size, size), 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle([0, 0, size, size], radius=int(size * 0.22), fill=255)
    # 火焰符号（用多边形画一簇火焰）
    cx, cy = size // 2, size // 2 + size * 0.05
    flame = [
        (cx, cy - size * 0.34),
        (cx + size * 0.17, cy - size * 0.10),
        (cx + size * 0.22, cy - size * 0.02),
        (cx + size * 0.13, cy + size * 0.16),
        (cx + size * 0.06, cy + size * 0.26),
        (cx, cy + size * 0.28),
        (cx - size * 0.06, cy + size * 0.26),
        (cx - size * 0.13, cy + size * 0.16),
        (cx - size * 0.22, cy - size * 0.02),
        (cx - size * 0.17, cy - size * 0.10),
    ]
    # 外焰橙色
    d.polygon(flame, fill=(251, 146, 60))
    # 内焰黄色
    inner = [(cx, cy - size * 0.18), (cx + size * 0.09, cy - size * 0.02),
             (cx + size * 0.10, cy + size * 0.05), (cx + size * 0.05, cy + size * 0.16),
             (cx, cy + size * 0.18), (cx - size * 0.05, cy + size * 0.16),
             (cx - size * 0.10, cy + size * 0.05), (cx - size * 0.09, cy - size * 0.02)]
    d.polygon(inner, fill=(255, 224, 130))
    img.putalpha(mask)
    return img

for name, s in [("icon-192.png", 192), ("icon-512.png", 512), ("icon-180.png", 180)]:
    make_icon(s).save(name)
    print("生成", name)
