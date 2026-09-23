#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 PWA 图标：黑底 + 金色圆环 + 🔥 火焰 emoji（Apple 风格）。

依赖：emoji512.png（由 render_emoji.swift 用 Apple Color Emoji 渲染出来的透明底火焰）。
用法：python3 make_icons.py   （在项目目录生成 icon-192/512/180.png）
"""
from PIL import Image, ImageDraw, ImageFilter

EMOJI = "emoji512.png"


def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))
    cx = cy = size / 2
    # 金色光晕（柔和）
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse([cx - size * 0.44, cy - size * 0.44, cx + size * 0.44, cy + size * 0.44],
               fill=(230, 184, 74, 80))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.08))
    img = Image.alpha_composite(img, glow)
    # 金色圆环
    d = ImageDraw.Draw(img)
    ring_r = size * 0.475
    ring_w = max(3, int(size * 0.028))
    d.ellipse([cx - ring_r, cy - ring_r, cx + ring_r, cy + ring_r],
              outline=(230, 184, 74, 255), width=ring_w)
    # 贴火焰 emoji
    emoji = Image.open(EMOJI).convert("RGBA")
    es = int(size * 0.60)
    emoji = emoji.resize((es, es), Image.Resampling.LANCZOS)
    img.alpha_composite(emoji, (int(cx - es / 2), int(cy - es / 2)))
    return img.convert("RGB")


if __name__ == "__main__":
    for name, s in [("icon-192.png", 192), ("icon-512.png", 512), ("icon-180.png", 180)]:
        make_icon(s).save(name)
        print("生成", name)
