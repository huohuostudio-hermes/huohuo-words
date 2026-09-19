#!/bin/bash
# 火火单词自动同步：解析 Obsidian 词汇 → 有变动则推 GitHub Pages
cd /Users/xingyan/projects/huohuo-words || exit 1

# 1. 重新解析 Obsidian 笔记 → words.js
/usr/bin/python3 sync_words.py >/dev/null 2>&1

# 2. 只有 words.js 真的变了才提交推送（幂等，无变动零开销）
if ! git diff --quiet -- words.js; then
  git add words.js
  git -c user.name="huohuo" -c user.email="huohuo@users.noreply.github.com" \
    commit -q -m "自动同步单词 $(date '+%Y-%m-%d %H:%M')" 2>&1
  git push origin main 2>&1
  echo "[$(date '+%F %T')] 已同步并推送"
else
  echo "[$(date '+%F %T')] 无变动"
fi
