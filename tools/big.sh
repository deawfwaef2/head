#!/bin/bash
# big/：大体积资产（身体、世界场景资产）。GitHub 上是普通目录；你的电脑 clone 下来也是普通目录。
# 仅在 Arena 沙箱里：head/big 是指向 /home/user/.cache/bigwt/big 的符号链接（.cache 不计入 128MB 快照），
# 索引里 big/* 标记 skip-worktree，git status 不会把它们当成“已删除”。
#   tools/big.sh restore        # 会话重置/重新 clone 后：从 git 取回 big/ 到 .cache，并重建链接与标记
#   tools/big.sh add big/xxx    # 把 .cache/bigwt/big 下的新文件加入索引（之后正常 git commit / push）
set -e
GD=/home/user/.cache/headgit; WT=/home/user/.cache/bigwt; H=/home/user/head
mkdir -p "$WT/big"
mark() { git --git-dir=$GD ls-files big | xargs -r git --git-dir=$GD --work-tree=$H update-index --skip-worktree; }
case "$1" in
  restore)
    (cd "$WT" && git --git-dir=$GD --work-tree="$WT" checkout HEAD -- big 2>/dev/null || true)
    [ -L "$H/big" ] || { rm -rf "$H/big"; ln -s "$WT/big" "$H/big"; }
    grep -qx big "$GD/info/exclude" 2>/dev/null || echo big >> "$GD/info/exclude"
    mark; echo "big restored: $(ls "$WT/big" | wc -l) entries" ;;
  add)
    shift; (cd "$WT" && git --git-dir=$GD --work-tree="$WT" add --sparse -f "$@"); mark ;;
  *) echo "usage: tools/big.sh restore | add <paths>"; exit 1 ;;
esac
