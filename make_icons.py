#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 PWA 图标：暖黄底 + 写实火焰。输出 icon-192/512/180.png"""
from PIL import Image, ImageDraw, ImageFilter


def flame_pts(cx, cy, s, tilt=0.06):
    return [
        (cx + tilt * s, cy - 0.36 * s),
        (cx + 0.18 * s, cy - 0.11 * s),
        (cx + 0.23 * s, cy - 0.02 * s),
        (cx + 0.14 * s, cy + 0.15 * s),
        (cx + 0.06 * s, cy + 0.25 * s),
        (cx, cy + 0.27 * s),
        (cx - 0.06 * s, cy + 0.25 * s),
        (cx - 0.14 * s, cy + 0.15 * s),
        (cx - 0.23 * s, cy - 0.02 * s),
        (cx - 0.18 * s, cy - 0.11 * s),
    ]


def make_icon(size):
    bg = (245, 214, 157)  # 暖黄米黄 #F5D69D
    img = Image.new("RGB", (size, size), bg)
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    cx = size / 2
    cy = size * 0.54
    s = size
    tiers = [
        (1.00, (222, 66, 24)),    # 深橘红外焰
        (0.82, (247, 105, 33)),   # 橙红
        (0.63, (255, 150, 52)),   # 橙
        (0.45, (255, 199, 84)),   # 金黄
        (0.28, (255, 244, 205)),  # 白黄火心
    ]
    for k, col in tiers:
        d.polygon(flame_pts(cx, cy, s * k), fill=col + (255,))
    # 火星
    sparks = [
        (cx - 0.30 * s, cy - 0.30 * s, 0.030 * s, (255, 168, 60)),
        (cx - 0.19 * s, cy - 0.39 * s, 0.022 * s, (255, 200, 90)),
        (cx + 0.28 * s, cy - 0.36 * s, 0.026 * s, (235, 92, 30)),
        (cx + 0.33 * s, cy - 0.20 * s, 0.018 * s, (255, 150, 60)),
    ]
    for x, y, r, col in sparks:
        d.ellipse([x - r, y - r, x + r, y + r], fill=col + (255,))
    # 轻微柔化火焰边缘
    layer = layer.filter(ImageFilter.GaussianBlur(max(1, size * 0.004)))
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    return img


for name, s in [("icon-192.png", 192), ("icon-512.png", 512), ("icon-180.png", 180)]:
    make_icon(s).save(name)
    print("生成", name)
