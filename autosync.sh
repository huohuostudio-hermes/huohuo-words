#!/bin/bash
# 火火单词自动同步：解析 Obsidian 词汇 → 生成本地发音 → 有变动则推 GitHub Pages
cd /Users/xingyan/projects/huohuo-words || exit 1

# 1. 重新解析 Obsidian 笔记 → words.js
/usr/bin/python3 sync_words.py >/dev/null 2>&1

# 2. 给含空格词（有道发不出的短语/句子）增量生成本地神经发音
/usr/bin/python3 gen_audio.py >>/tmp/huohuo-gen-audio.log 2>&1

# 3. words.js 或 audio/ 有变动才提交推送（含未跟踪的新音频，幂等，无变动零开销）
if [ -n "$(git status --porcelain -- words.js audio/)" ]; then
  git add words.js audio/
  git -c user.name="huohuo" -c user.email="huohuo@users.noreply.github.com" \
    commit -q -m "自动同步单词 $(date '+%Y-%m-%d %H:%M')" 2>&1
  git push origin main 2>&1
  echo "[$(date '+%F %T')] 已同步并推送"
else
  echo "[$(date '+%F %T')] 无变动"
fi
