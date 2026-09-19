#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
从火火知识库「英语学习/」目录解析单词笔记，生成 App 数据 words.js (window.WORDS)。

笔记格式（callout）：
    > [!quote]- 1. <mark class="hltr-orange">Word</mark> <mark class="hltr-pink">/ipa/</mark> [音译] — <mark class="hltr-blue">中文释义</mark>
    > - 定义……
    > - 听觉例子：……

用法：python3 sync_words.py   （在同目录生成 words.js）
"""
import json
import os
import re

VAULT = "/Users/xingyan/Library/Mobile Documents/iCloud~md~obsidian/Documents/火火知识库"
WORD_DIR = os.path.join(VAULT, "英语学习")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "words.js")

MARK_RE = re.compile(r"</?mark[^>]*>", re.IGNORECASE)
HEADER_RE = re.compile(r"^>\s*\[!quote\]", re.IGNORECASE)
NUM_RE = re.compile(r"^\s*\d+\.\s*")

# 分类：关键词命中 → 分类。按顺序匹配，先命中先得。
CATEGORY_RULES = [
    ("打击乐", ["鼓", "打击", "percussion", "drum", "bongo", "conga", "timbal",
                "djembe", "tambourine", "cowbell", "woodblock", "shaker", "bell",
                "铃", "木鱼", "沙锤", "牛铃", "康加", "邦戈", "金贝", "天巴"]),
    ("键盘", ["钢琴", "键盘", "风琴", "organ", "piano", "clavinet", "wurlitzer",
             "rhodes", "和弦", "chord", "stab", "classical", "keys melody", "电钢琴"]),
    ("吉他", ["吉他", "guitar", "riff", "lead", "clean", "distort", "acoustic",
             "清音", "失真", "原声", "扫弦", "拨弦", "弦"]),
    ("合成器", ["合成器", "synth", "波形", "锯齿", "oscillator", "滤波", "filter",
               "lfo", "脉冲", "pulse", "噪声", "noise", "wobble", "sub", "acid",
               "analog", "saw", "模拟", "低频", "次低音"]),
    ("人声", ["人声", "vocal", "vocoder", "scream", "whisper", "dialogue",
             "spoken", "对白", "女声", "男声", "朗诵", "口语", "声码器", "尖叫", "耳语"]),
    ("音效", ["音效", "riser", "sweep", "impact", "texture", "atmosphere",
             "downer", "reverse", "field recording", "氛围", "过渡", "反转", "实地录音", "织体"]),
]


def clean(text: str) -> str:
    text = MARK_RE.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


# 人工标定分类（57 个已知词，100% 准确）；新词走下方关键词兜底
WORD_CATEGORY = {
    # 吉他
    "electric": "吉他", "clean": "吉他", "leads": "吉他", "riffs": "吉他",
    "acoustic": "吉他", "distorted": "吉他", "guitar melody": "吉他", "rhythm": "吉他",
    # 合成器
    "synth": "合成器", "analog": "合成器", "saw": "合成器", "wobble": "合成器",
    "sub": "合成器", "acid": "合成器", "pulse": "合成器", "noise": "合成器",
    # 打击乐
    "shakers": "打击乐", "conga": "打击乐", "percussion": "打击乐", "grooves": "打击乐",
    "bongos": "打击乐", "woodblock": "打击乐", "djembe": "打击乐", "tambourine": "打击乐",
    "cowbells": "打击乐", "bells": "打击乐", "timbales": "打击乐",
    # 键盘
    "chords": "键盘", "keys": "键盘", "piano": "键盘", "wurlitzer": "键盘",
    "stabs": "键盘", "electric piano": "键盘", "organ": "键盘", "clavinet": "键盘",
    "keys melody": "键盘",
    # 人声
    "fx vocals": "人声", "female vocals": "人声", "vocal fx": "人声", "vocoder": "人声",
    "screams": "人声", "whisper vocals": "人声", "male vocals": "人声", "spoken word": "人声",
    "vocal phrases": "人声", "vocal shouts": "人声", "dialogue": "人声",
    # 音效
    "downers": "音效", "impacts": "音效", "textures": "音效", "field recordings": "音效",
    "risers": "音效", "sweeps": "音效", "atmospheres": "音效", "reverse": "音效",
    # 其他
    "camping": "其他", "classical": "其他",
}


def categorize(word: str, zh: str, definition: str) -> str:
    w = word.strip().lower()
    if w in WORD_CATEGORY:
        return WORD_CATEGORY[w]
    # 兜底：只用「单词 + 中文释义」匹配，避免定义里跨界术语（如正弦波里的"弦"、失真）串台
    hay = (w + " " + zh).lower()
    for cat, kws in CATEGORY_RULES:
        for kw in kws:
            if kw.lower() in hay:
                return cat
    return "其他"


def parse_file(path: str) -> list:
    with open(path, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()

    source = os.path.basename(path).replace(".md", "")
    words = []
    cur = None  # dict under construction

    for line in lines:
        if HEADER_RE.match(line):
            if cur is not None:
                words.append(cur)
            cur = {"word": "", "ipa": "", "translit": "", "zh": "",
                   "def": "", "example": "", "category": "音乐英语", "source": source}
            plain = clean(line)
            plain = re.sub(r"^>\s*\[!quote\]-\s*", "", plain)
            plain = NUM_RE.sub("", plain)
            # 拆分 word/ipa/音译 与 中文
            if " — " in plain:
                left, right = plain.split(" — ", 1)
            elif "—" in plain:
                left, right = plain.split("—", 1)
            else:
                left, right = plain, ""
            left, right = left.strip(), right.strip()
            m = re.search(r"/([^/]+)/", left)
            if m:
                cur["word"] = left[: m.start()].strip()
                cur["ipa"] = m.group(1).strip()
                cur["translit"] = left[m.end():].strip()
            else:
                cur["word"] = left.strip()
            cur["zh"] = right.strip()
            continue

        if cur is not None and line.startswith("> - "):
            bullet = clean(line[4:])
            if not cur["def"]:
                cur["def"] = bullet
            else:
                cur["example"] = bullet
            continue

        # 空行或非条目内容：结束当前条目（但不丢，等下一个 header 时已 append）
    if cur is not None:
        words.append(cur)

    return words


def main():
    all_words = []
    for root, dirs, files in os.walk(WORD_DIR):
        for fn in sorted(files):
            if fn.endswith(".md"):
                all_words.extend(parse_file(os.path.join(root, fn)))

    # 去重：按小写单词去重，保留第一条
    seen = set()
    unique = []
    skipped = 0
    for w in all_words:
        key = w["word"].strip().lower()
        if not key:
            continue
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        w["category"] = categorize(w["word"], w["zh"], w["def"])
        unique.append(w)

    for i, w in enumerate(unique):
        w["id"] = i + 1

    js = "window.WORDS = " + json.dumps(unique, ensure_ascii=False, indent=2) + ";\n"
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)

    # 统计
    from collections import Counter
    cats = Counter(w["category"] for w in unique)
    print(f"解析到 {len(all_words)} 条，去重后 {len(unique)} 条（跳过重复 {skipped} 条）")
    print("分类统计：", dict(cats))
    print("输出：", OUT)


if __name__ == "__main__":
    main()
