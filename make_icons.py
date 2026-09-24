#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 PWA 图标：黑底 + 🔥 火焰 emoji + 金色圆角方框描边（非圆形）。

依赖：emoji512.png（Apple Color Emoji 渲染的透明底火焰）。
用法：python3 make_icons.py   （在项目目录生成 icon-192/512/180.png）
"""
from PIL import Image, ImageDraw, ImageFilter

EMOJI = "emoji512.png"
GOLD = (230, 184, 74, 255)  # var(--accent) #e6b84a


def make_icon(size):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 255))

    # 金色柔和光晕（边框内侧，贴主题「发光金」）
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    m = size * 0.10
    gd.rounded_rectangle([m, m, size - m, size - m], radius=int(size * 0.20),
                         fill=(230, 184, 74, 42))
    glow = glow.filter(ImageFilter.GaussianBlur(size * 0.07))
    img = Image.alpha_composite(img, glow)

    # 金色圆角方框描边（不是圆环）
    d = ImageDraw.Draw(img)
    inset = size * 0.045
    radius = int(size * 0.20)
    ring_w = max(3, int(size * 0.030))
    d.rounded_rectangle([inset, inset, size - inset, size - inset],
                        radius=radius, outline=GOLD, width=ring_w)

    # 贴火焰 emoji
    emoji = Image.open(EMOJI).convert("RGBA")
    es = int(size * 0.56)
    emoji = emoji.resize((es, es), Image.Resampling.LANCZOS)
    img.alpha_composite(emoji, (int((size - es) / 2), int((size - es) / 2)))

    return img.convert("RGB")


if __name__ == "__main__":
    for name, s in [("icon-192.png", 192), ("icon-512.png", 512), ("icon-180.png", 180)]:
        make_icon(s).save(name)
        print("生成", name)
