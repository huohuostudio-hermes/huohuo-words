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
SOURCE_DIR = os.path.join(WORD_DIR, "原文语境")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "words.js")

MARK_RE = re.compile(r"</?mark[^>]*>", re.IGNORECASE)
HEADER_RE = re.compile(r"^>\s*\[!quote\]", re.IGNORECASE)
NUM_RE = re.compile(r"^\s*\d+\.\s*")


# 分类：关键词命中 → 分类。按顺序匹配，先命中先得（手动映射表已覆盖存量词，这里兜底新截图词）。
CATEGORY_RULES = [
    ("插件操作", ["压缩", "均衡", "滤波", "混音", "混响", "延迟", "调制", "声像", "叠加", "分层",
                  "路由", "自动化", "量化", "限幅", "门限", "饱和", "激励", "齿音", "双轨", "弯音",
                  "共振峰", "瞬态", "推子", "sidechain", "compress", "compressor", "eq", "filter",
                  "sweep", "layer", "layering", "bounce", "pan", "panning", "route", "routing",
                  "de-esser", "bitcrush", "double-track", "automation", "modulation", "formant",
                  "mastering", "mixing", "reverb", "delay", "phaser", "chorus", "limiter", "gate",
                  "fader", "distortion", "saturation"]),
    ("乐器们", ["吉他", "钢琴", "键盘", "贝斯", "鼓", "打击乐", "沙锤", "康加", "邦戈", "金贝", "铃鼓",
                "牛铃", "木鱼", "小号", "长号", "萨克斯", "长笛", "口琴", "小提琴", "中提琴", "大提琴",
                "弦乐", "铜管", "木管", "合成器", "铺底", "主音", "人声", "声码器", "音效", "氛围音",
                "拟音", "guitar", "piano", "synth", "synthesizer", "organ", "keys", "keyboard",
                "bass", "drum", "percussion", "shaker", "conga", "bongo", "djembe", "tambourine",
                "cowbell", "timbale", "woodblock", "bell", "trumpet", "trombone", "saxophone",
                "flute", "harmonica", "violin", "viola", "cello", "strings", "brass", "woodwind",
                "pad", "lead", "pluck", "arp", "808", "vocoder", "vocal", "vocals", "voice", "choir",
                "riser", "impact", "downer", "atmosphere", "ambience", "foley", "drone", "reverse",
                "field recording", "oscillator", "waveform"]),
    ("声音描述", ["温暖", "明亮", "刺耳", "厚实", "丰满", "粗粝", "干净", "清音", "失真", "柔和", "激进",
                  "宽敞", "空间感", "颗粒感", "清晰", "织体", "质感", "音色", "特性", "谐波", "深度",
                  "宽度", "warm", "bright", "dark", "harsh", "punchy", "airy", "wide", "thick", "thin",
                  "rich", "lush", "gritty", "muddy", "clean", "distorted", "dirty", "smooth", "gentle",
                  "aggressive", "spacious", "deep", "mellow", "tinny", "hollow", "nasal", "tight",
                  "full", "massive", "subtle", "articulate", "texture", "timbre", "tone", "character",
                  "clarity", "sibilance", "transient", "lo-fi", "warmth"]),
    ("音乐词汇", ["和弦", "旋律", "节奏", "律动", "速度", "调性", "音阶", "音符", "主歌", "副歌", "桥段",
                  "前奏", "尾奏", "编曲", "连复段", "风格", "流派", "古典", "摇滚", "爵士", "灵魂", "放克",
                  "拉丁", "管弦", "电影配乐", "氛围音乐", "chord", "melody", "rhythm", "groove", "tempo",
                  "harmony", "key", "scale", "note", "verse", "chorus", "bridge", "intro", "outro",
                  "arrangement", "riff", "genre", "rock", "jazz", "house", "soul", "funk", "classical",
                  "orchestral", "cinematic", "ambient", "electronic", "techno", "pop", "hip-hop",
                  "synthwave", "neo-soul", "garage", "staccato", "legato", "portamento", "ensemble",
                  "session", "strum", "bowing", "midi"]),
]

DEFAULT_CAT = "日常生活"

# 明确要丢弃的条目（整句 / 无意义碎片，非单词），不入库


def clean(text: str) -> str:
    text = MARK_RE.sub("", text)
    return re.sub(r"\s+", " ", text).strip()


# 人工标定分类（存量词精确映射，416 词）；新词走下方关键词兜底
WORD_CATEGORY = {
    "5.1 surround": "插件操作",
    "808": "乐器们",
    "acid": "乐器们",
    "acid dist delay": "乐器们",
    "acoustic": "声音描述",
    "acoustic guitar": "乐器们",
    "acoustic piano": "乐器们",
    "acoustic violin": "乐器们",
    "across the master bus": "音乐词汇",
    "adds movement": "音乐词汇",
    "adjusting": "插件操作",
    "aggressive": "声音描述",
    "aggressive harmonics": "声音描述",
    "aggressive rock male vocals": "乐器们",
    "airy": "声音描述",
    "aligning": "插件操作",
    "alter": "插件操作",
    "ambience": "乐器们",
    "ambient": "音乐词汇",
    "ambient genres": "音乐词汇",
    "ambient textures": "音乐词汇",
    "american upright": "乐器们",
    "amp sim": "插件操作",
    "analog": "乐器们",
    "analog delays": "插件操作",
    "analog leads": "乐器们",
    "analog oscillator": "乐器们",
    "analog summing mixer": "插件操作",
    "analog synth brass": "乐器们",
    "analog warmth": "声音描述",
    "anthemic": "声音描述",
    "arp": "乐器们",
    "arrangement": "音乐词汇",
    "arrangement ideas": "音乐词汇",
    "articulate": "声音描述",
    "atmospheres": "乐器们",
    "atmospheric pads": "乐器们",
    "automating": "插件操作",
    "automation": "插件操作",
    "backing voice": "乐器们",
    "basic chords": "音乐词汇",
    "bass": "乐器们",
    "before the drop": "音乐词汇",
    "bells": "乐器们",
    "beneath the main arrangement": "音乐词汇",
    "bitcrusher": "插件操作",
    "blending": "插件操作",
    "bode warmer": "声音描述",
    "body sounds": "乐器们",
    "bongos": "乐器们",
    "bounce": "插件操作",
    "bowing": "音乐词汇",
    "brass": "乐器们",
    "brass and woodwinds": "乐器们",
    "bridge": "音乐词汇",
    "bridge tone": "声音描述",
    "bridge volume": "乐器们",
    "bright": "声音描述",
    "browsing splice": "音乐词汇",
    "by synths": "乐器们",
    "careful eqing": "插件操作",
    "carving out space": "插件操作",
    "cc1": "音乐词汇",
    "cc11": "音乐词汇",
    "cello": "乐器们",
    "character": "声音描述",
    "character-rich": "声音描述",
    "chase the sun": "音乐词汇",
    "chord": "音乐词汇",
    "chord progression": "音乐词汇",
    "chords": "音乐词汇",
    "chorus": "音乐词汇",
    "choruses": "音乐词汇",
    "cinematic": "音乐词汇",
    "cinematic fx": "乐器们",
    "clarity": "声音描述",
    "clashing": "插件操作",
    "classic": "音乐词汇",
    "classical": "音乐词汇",
    "clavinet": "乐器们",
    "clean": "声音描述",
    "clean as a whistle": "声音描述",
    "clean guitar": "声音描述",
    "clean guitar sound": "声音描述",
    "clean male vocals": "乐器们",
    "clean tone": "声音描述",
    "complex textures": "音乐词汇",
    "compress": "插件操作",
    "compressed": "插件操作",
    "compressor": "插件操作",
    "conga": "乐器们",
    "cowbells": "乐器们",
    "cut through": "插件操作",
    "cuts through": "插件操作",
    "cutting": "插件操作",
    "cyberpunk tracks": "音乐词汇",
    "dark": "声音描述",
    "de-esser": "插件操作",
    "dedicated controller": "插件操作",
    "dedicated sub group": "乐器们",
    "deep": "声音描述",
    "delay throws": "插件操作",
    "delicate": "声音描述",
    "dense electronic tracks": "音乐词汇",
    "dense midrange frequencies": "声音描述",
    "dense mix": "声音描述",
    "dense synthesizer pad": "乐器们",
    "depth": "声音描述",
    "detuned pads": "乐器们",
    "dialogue": "乐器们",
    "digital": "乐器们",
    "digital echoes": "音乐词汇",
    "digital synth": "乐器们",
    "dirge lead": "乐器们",
    "dirty cabinet": "声音描述",
    "dirty lows": "声音描述",
    "dirty small": "声音描述",
    "distorted": "声音描述",
    "djembe": "乐器们",
    "double-tracking": "插件操作",
    "downers": "乐器们",
    "driving force": "音乐词汇",
    "drones": "乐器们",
    "drum": "乐器们",
    "drums": "乐器们",
    "dynamic clean": "声音描述",
    "dynamic eq": "插件操作",
    "dynamic keys": "乐器们",
    "ear fatigue": "声音描述",
    "echo band dist": "乐器们",
    "electric": "乐器们",
    "electric guitar": "乐器们",
    "electric guitar leads": "乐器们",
    "electric keys": "乐器们",
    "electric piano": "乐器们",
    "electronic": "音乐词汇",
    "electronic beats": "音乐词汇",
    "electronic hi-hats": "乐器们",
    "electronic music": "音乐词汇",
    "electronic soundscapes": "音乐词汇",
    "electronic tracks": "音乐词汇",
    "emotional dynamics": "声音描述",
    "ensemble": "音乐词汇",
    "eq": "插件操作",
    "eqing": "插件操作",
    "essential techniques": "音乐词汇",
    "evolving motion": "音乐词汇",
    "expression": "音乐词汇",
    "expression face": "插件操作",
    "expressive performance": "声音描述",
    "extreme low frequencies": "乐器们",
    "extreme low frequency": "乐器们",
    "extreme vocal fx": "乐器们",
    "fast-attack compressor": "插件操作",
    "female vocals": "乐器们",
    "fender telecaster": "乐器们",
    "field recordings": "乐器们",
    "filter": "插件操作",
    "filter cutoff": "插件操作",
    "flute": "乐器们",
    "focusrite isa one": "插件操作",
    "foley": "乐器们",
    "footsteps": "日常生活",
    "for the chorus": "音乐词汇",
    "formant control": "插件操作",
    "frequency decay": "音乐词汇",
    "frothy": "声音描述",
    "full": "声音描述",
    "fully weighted action": "乐器们",
    "future garage": "音乐词汇",
    "fx vocals": "乐器们",
    "generates": "插件操作",
    "genre": "音乐词汇",
    "gentle": "声音描述",
    "glitchy ambient voice": "乐器们",
    "glm-calibrated": "音乐词汇",
    "gore": "乐器们",
    "granular cinematic pads": "乐器们",
    "granular synthesis": "乐器们",
    "gritty": "声音描述",
    "groove": "音乐词汇",
    "groove keywords": "音乐词汇",
    "grooves": "音乐词汇",
    "guitar": "乐器们",
    "guitar melody": "乐器们",
    "harmonic punch": "声音描述",
    "harmonic richness": "声音描述",
    "harmonica": "乐器们",
    "harmony": "音乐词汇",
    "harsh": "声音描述",
    "harsh resonances": "声音描述",
    "haunting cinematic texture": "音乐词汇",
    "heavily distorted": "声音描述",
    "heavily processed": "插件操作",
    "heavy electronic beats": "音乐词汇",
    "heavy electronic track": "音乐词汇",
    "heavy guitar wall": "声音描述",
    "heavy saturation": "声音描述",
    "hi-hat": "乐器们",
    "high frequencies": "声音描述",
    "hollow": "声音描述",
    "horn": "乐器们",
    "house track": "音乐词汇",
    "hum & hiss": "声音描述",
    "human feel": "声音描述",
    "hybrid genres": "音乐词汇",
    "hybrid texture": "音乐词汇",
    "impacts": "乐器们",
    "in the mix": "音乐词汇",
    "intro": "音乐词汇",
    "isa one": "插件操作",
    "jazz": "音乐词汇",
    "key": "音乐词汇",
    "keys": "乐器们",
    "keys melody": "乐器们",
    "keywords": "音乐词汇",
    "kick": "乐器们",
    "layer": "插件操作",
    "layered with another waveform": "插件操作",
    "layering": "插件操作",
    "lead": "乐器们",
    "lead guitar": "乐器们",
    "lead male vocals": "乐器们",
    "lead singer": "乐器们",
    "leads": "乐器们",
    "legatos": "音乐词汇",
    "lexicon pro": "插件操作",
    "live violin": "乐器们",
    "lo-fi": "声音描述",
    "logic pro": "音乐词汇",
    "low end": "乐器们",
    "lush": "声音描述",
    "lush pads": "乐器们",
    "m-s progbass": "乐器们",
    "main bass": "乐器们",
    "main keys": "乐器们",
    "main volume": "插件操作",
    "maintain sonic clarity": "声音描述",
    "male vocals": "乐器们",
    "manipulation": "插件操作",
    "massive": "声音描述",
    "massive stereo image": "声音描述",
    "massive tonal shifts": "声音描述",
    "master bus": "音乐词汇",
    "mastering": "插件操作",
    "math rock riffs": "音乐词汇",
    "mellow": "声音描述",
    "melodic inspiration": "音乐词汇",
    "melody": "音乐词汇",
    "melody line": "音乐词汇",
    "midi": "音乐词汇",
    "midrange": "声音描述",
    "mixing": "插件操作",
    "modern": "音乐词汇",
    "modern music production": "音乐词汇",
    "modern rock": "音乐词汇",
    "modulating": "插件操作",
    "modulation": "插件操作",
    "monitor system": "音乐词汇",
    "muddy": "声音描述",
    "muddying the low end": "声音描述",
    "multiple synthesizer leads": "乐器们",
    "music": "音乐词汇",
    "mute": "音乐词汇",
    "nasal": "声音描述",
    "nasty": "声音描述",
    "natural high-frequency air": "声音描述",
    "neck tone": "声音描述",
    "neck volume": "乐器们",
    "neo-soul": "音乐词汇",
    "neural dsp plugins": "插件操作",
    "noise": "乐器们",
    "note": "音乐词汇",
    "on splice": "音乐词汇",
    "orchestral": "音乐词汇",
    "orchestral elements": "乐器们",
    "organ": "乐器们",
    "organic acoustic textures": "音乐词汇",
    "organic contrast": "音乐词汇",
    "organic shakers": "乐器们",
    "oscillator": "乐器们",
    "outro": "音乐词汇",
    "pad": "乐器们",
    "pads": "乐器们",
    "pan": "插件操作",
    "panning": "插件操作",
    "parallel channel": "插件操作",
    "percussion": "乐器们",
    "piano": "乐器们",
    "pitchbend down": "插件操作",
    "pitchbend up": "插件操作",
    "playing style": "音乐词汇",
    "pluck": "乐器们",
    "portamento": "插件操作",
    "practice amp in room": "乐器们",
    "processing": "插件操作",
    "processing complex riffs": "插件操作",
    "programming": "插件操作",
    "pulse": "乐器们",
    "punchy": "声音描述",
    "re-recording": "插件操作",
    "recording": "插件操作",
    "release noise": "声音描述",
    "respace": "日常生活",
    "reverb": "插件操作",
    "reverb effect": "插件操作",
    "reverse": "乐器们",
    "rhythm": "音乐词汇",
    "rhythm section": "音乐词汇",
    "rhythmic elements": "音乐词汇",
    "rich": "声音描述",
    "riding": "插件操作",
    "riff": "音乐词汇",
    "riffs": "音乐词汇",
    "risers": "乐器们",
    "rock": "音乐词汇",
    "route": "插件操作",
    "routing": "插件操作",
    "s2 tables spectral vowel": "乐器们",
    "sample libraries": "音乐词汇",
    "saw": "乐器们",
    "saxophone": "乐器们",
    "scale": "音乐词汇",
    "scrapes": "音乐词汇",
    "screams": "乐器们",
    "searching splice": "音乐词汇",
    "sense of infinite space": "声音描述",
    "session": "音乐词汇",
    "shakers": "乐器们",
    "shakers loop": "乐器们",
    "sibilance": "声音描述",
    "side-chain": "插件操作",
    "sidechain": "插件操作",
    "simple hum": "乐器们",
    "sine wave": "乐器们",
    "sixties": "音乐词汇",
    "skillfully layering": "插件操作",
    "slow phaser": "插件操作",
    "smooth": "声音描述",
    "snare": "乐器们",
    "solo violin": "乐器们",
    "spacious": "声音描述",
    "specific vocal fx": "乐器们",
    "splice": "音乐词汇",
    "spoken word": "乐器们",
    "ssl uf1": "插件操作",
    "stab": "乐器们",
    "stabs": "乐器们",
    "staccato": "音乐词汇",
    "standard loops": "音乐词汇",
    "stereo movement": "音乐词汇",
    "striking contrast": "声音描述",
    "string noise": "声音描述",
    "strings": "乐器们",
    "strings melody": "乐器们",
    "strum": "音乐词汇",
    "sub": "乐器们",
    "sub bass": "乐器们",
    "sub frequencies": "乐器们",
    "sub frequency": "乐器们",
    "subtle": "声音描述",
    "sustained bass": "乐器们",
    "sweep": "插件操作",
    "sweeps": "插件操作",
    "synth": "乐器们",
    "synth loops": "乐器们",
    "synthesizer": "乐器们",
    "synthesizer keys": "乐器们",
    "synthesizer pads": "乐器们",
    "synthetic voice": "乐器们",
    "synthwave": "音乐词汇",
    "tambourine": "乐器们",
    "tame the harsh transients": "插件操作",
    "taming": "插件操作",
    "tempo": "音乐词汇",
    "texture": "声音描述",
    "textures": "声音描述",
    "the instrumental mix": "音乐词汇",
    "the transition": "音乐词汇",
    "thick": "声音描述",
    "thick chorus effect": "插件操作",
    "tight": "声音描述",
    "timbales": "乐器们",
    "timbre": "声音描述",
    "tinny": "声音描述",
    "to the grid": "插件操作",
    "tone": "声音描述",
    "traditional melodies": "音乐词汇",
    "transient": "声音描述",
    "transient-rich impacts": "乐器们",
    "trombone": "乐器们",
    "trumpet": "乐器们",
    "tuning": "音乐词汇",
    "unquantized drift": "插件操作",
    "verse": "音乐词汇",
    "vintage textures": "音乐词汇",
    "viola": "乐器们",
    "violin": "乐器们",
    "vocal": "乐器们",
    "vocal chops": "乐器们",
    "vocal fx": "乐器们",
    "vocal leads": "乐器们",
    "vocal phrases": "乐器们",
    "vocal shouts": "乐器们",
    "vocals": "乐器们",
    "vocoder": "乐器们",
    "voice": "乐器们",
    "voice tags": "乐器们",
    "volume fader": "插件操作",
    "warm": "声音描述",
    "warm analog pads": "乐器们",
    "warm imperfections": "声音描述",
    "warmth": "声音描述",
    "whisper vocals": "乐器们",
    "wide": "声音描述",
    "wider stereo image": "声音描述",
    "width": "声音描述",
    "wobble": "乐器们",
    "woodblock": "乐器们",
    "woodwind": "乐器们",
    "wurlitzer": "乐器们",
    "electronics": "日常生活",
    "game enhancement key": "日常生活",
    "keyboard combination": "日常生活",
    "multimedia key": "日常生活",
    "shortcut key": "日常生活",
}

# 明确要丢弃的条目（整句 / 无意义碎片，非单词），不入库
SKIP_WORDS = {
    "after all the steps have been applied",
    "an advertisement",
    "an hour of focused practice",
    "and many people teach beginners that when they start out",
    "but",
    "daily hour",
    "do you know",
    "every day",
    "forgot",
    "great video!",
    "he",
    "how much better it sounds",
    "i don't know",
    "i have seen so many people try to focus on mixing when they are starting out",
    "if this sounds trash",
    "sounds like",
    "thank you for teaching music the way it should be taught",
    "then my shit sounds like hell",
    "to buy",
    "turns the fretboard from a puzzle into a second language",
    "why",
    "why did he leave his keys on the table?",
    "why he forgot to buy milk",
    "why he is so tired today?"
}

_ASCII_KW_RE = re.compile(r"^[a-z0-9\-./ ]+$")

def _kw_match(kw: str, hay: str) -> bool:
    # 英文关键词用词边界匹配（"key" 不误命中 "keychron"/"keyboard"），并兼容 s/es 复数；
    # 中文关键词用子串匹配。
    if _ASCII_KW_RE.match(kw):
        pat = r"\b" + re.escape(kw) + r"(?:s|es)?\b"
        return re.search(pat, hay, re.IGNORECASE) is not None
    return kw in hay


def categorize(word: str, zh: str, definition: str) -> str:
    w = word.strip().lower()
    if w in WORD_CATEGORY:
        return WORD_CATEGORY[w]
    # 兜底：只用「单词 + 中文释义」匹配，避免定义里跨界术语串台
    hay = (w + " " + zh).lower()
    for cat, kws in CATEGORY_RULES:
        for kw in kws:
            if _kw_match(kw, hay):
                return cat
    return DEFAULT_CAT

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
                   "def": "", "example": "", "context": "", "contextZh": "",
                   "category": "音乐英语", "source": source}
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
            if bullet.startswith("原文："):
                cur["context"] = bullet[len("原文："):].strip()
            elif bullet.startswith("翻译："):
                cur["contextZh"] = bullet[len("翻译："):].strip()
            elif re.match(r"^(?:听觉)?例子", bullet):
                cur["example"] = bullet
            elif not cur["def"]:
                cur["def"] = bullet
            else:
                cur["example"] = bullet
            continue

        # 空行或非条目内容：结束当前条目（但不丢，等下一个 header 时已 append）
    if cur is not None:
        words.append(cur)

    return words


def parse_source_file(path: str) -> list:
    """解析「原文语境」目录下的长句记录文件。

    格式：
        > [!source]- 1. <mark>原文</mark>
        > - 翻译：整段中文
        > - 分支：why ｜ 为什么
    """
    with open(path, "r", encoding="utf-8") as f:
        lines = f.read().splitlines()
    date = os.path.basename(path).replace(".md", "")
    sources = []
    cur = None
    for line in lines:
        if line.startswith("> [!source]"):
            if cur is not None:
                sources.append(cur)
            cur = {"date": date, "text": "", "translation": "", "category": "", "branches": []}
            plain = clean(line)
            plain = re.sub(r"^>\s*\[!source\]-\s*(?:\d+\.\s*)?", "", plain)
            cur["text"] = plain.strip()
            continue
        if cur is not None and line.startswith("> - "):
            bullet = clean(line[4:])
            if bullet.startswith("翻译："):
                cur["translation"] = bullet[len("翻译："):].strip()
            elif bullet.startswith("分类："):
                cur["category"] = bullet[len("分类："):].strip()
            elif bullet.startswith("分支："):
                b = bullet[len("分支："):].strip()
                if "｜" in b:
                    w, zh = b.split("｜", 1)
                    cur["branches"].append({"word": w.strip(), "zh": zh.strip()})
                else:
                    cur["branches"].append({"word": b.strip(), "zh": ""})
            continue
    if cur is not None:
        sources.append(cur)
    return sources


def split_inline_translation(text):
    """把结尾括号里的中文翻译拆出来，返回 (剩余原文, 翻译)。"""
    m = re.search(r"[（(]([^（()）]*[\u4e00-\u9fa5][^（()）]*)[)）]\s*$", text)
    if m:
        return text[:m.start()].strip(), m.group(1).strip()
    return text.strip(), ""


def main():
    all_words = []
    for root, dirs, files in os.walk(WORD_DIR):
        # 「原文语境」是长句记录，不是词条，跳过（由 parse_source_file 单独解析）
        dirs[:] = [d for d in dirs if d != "原文语境"]
        for fn in sorted(files):
            if fn.endswith(".md"):
                all_words.extend(parse_file(os.path.join(root, fn)))

    sources = []
    for src_dir in (SOURCE_DIR,):
        if os.path.isdir(src_dir):
            for root, dirs, files in os.walk(src_dir):
                for fn in sorted(files):
                    if fn.endswith(".md"):
                        sources.extend(parse_source_file(os.path.join(root, fn)))

    # 去重：按小写单词去重，保留第一条
    seen = set()
    unique = []
    skipped = 0
    for w in all_words:
        key = w["word"].strip().lower()
        if not key:
            continue
        if key in SKIP_WORDS:
            skipped += 1
            continue
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        w["category"] = categorize(w["word"], w["zh"], w["def"])
        unique.append(w)

    for i, w in enumerate(unique):
        w["id"] = i + 1

    # 给「源自」补译文：先拆内联括号中文，再匹配「原文语境」的整句翻译
    trans_map = {}
    for src in sources:
        key = re.sub(r"\s+", " ", src.get("text", "")).strip().lower()
        if key and src.get("translation"):
            trans_map[key] = src["translation"]
    for w in unique:
        ctx = (w.get("context") or "").strip()
        if not ctx or (w.get("contextZh") or "").strip():
            continue
        rest, inline = split_inline_translation(ctx)
        if inline:
            w["context"] = rest
            w["contextZh"] = inline
        else:
            key = re.sub(r"\s+", " ", ctx).strip().lower()
            if key in trans_map:
                w["contextZh"] = trans_map[key]

    js = "window.WORDS = " + json.dumps(unique, ensure_ascii=False, indent=2) + ";\n"
    js += "window.SOURCES = " + json.dumps(sources, ensure_ascii=False, indent=2) + ";\n"
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(js)

    # 统计
    from collections import Counter
    cats = Counter(w["category"] for w in unique)
    print(f"解析到 {len(all_words)} 条，去重后 {len(unique)} 条（跳过重复 {skipped} 条）")
    print(f"解析到 {len(sources)} 条长句记录")
    print("分类统计：", dict(cats))
    print("输出：", OUT)


if __name__ == "__main__":
    main()
