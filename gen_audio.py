#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""给含空格词（有道 dictvoice 发不出的短语/句子）增量生成本地神经发音 audio/{audioFile}.mp3。

只处理 words.js 里带 audioFile 字段的词；文件已存在则跳过（幂等，可反复跑）。
音源：微软 Edge 神经语音（edge-tts，免费无需 key）。失败跳过，下次跑自动重试。
"""
import asyncio
import json
import os
import re

import edge_tts

HERE = os.path.dirname(os.path.abspath(__file__))
WORDS_JS = os.path.join(HERE, "words.js")
AUDIO_DIR = os.path.join(HERE, "audio")
VOICE = "en-US-AvaNeural"


def load_words():
    txt = open(WORDS_JS, encoding="utf-8").read()
    m = re.search(r"window\.WORDS\s*=\s*(\[.*?\]);", txt, re.S)
    if not m:
        return []
    return json.loads(m.group(1))


async def gen(word, path):
    c = edge_tts.Communicate(word, VOICE)
    await c.save(path)


async def main():
    os.makedirs(AUDIO_DIR, exist_ok=True)
    words = load_words()
    todo = []
    for w in words:
        af = w.get("audioFile")
        if not af:
            continue
        path = os.path.join(AUDIO_DIR, af + ".mp3")
        if os.path.exists(path):
            continue
        todo.append((w["word"], path))
    if not todo:
        print("无新音频（含空格词已全部就绪）")
        return
    print(f"生成 {len(todo)} 个音频…")
    ok = 0
    for i, (word, path) in enumerate(todo, 1):
        try:
            await gen(word, path)
            ok += 1
        except Exception as e:
            print(f"  ✗ 失败 {word!r}: {e}")
        if i % 20 == 0 or i == len(todo):
            print(f"  {i}/{len(todo)}")
    print(f"完成 {ok}/{len(todo)}")


if __name__ == "__main__":
    asyncio.run(main())
