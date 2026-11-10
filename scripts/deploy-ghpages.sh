#!/usr/bin/env bash
# 把 out/ 作为 gh-pages 的新快照部署到 GitHub Pages。
#
# 用法：
#   bash scripts/deploy-ghpages.sh            构造提交并推送
#   DRY_RUN=1 bash scripts/deploy-ghpages.sh  只构造提交，不推送
#
# 不切换分支、不改动工作区、不重写历史：新提交的父节点是 origin/gh-pages。
# 因此旧的部署文件会从线上树里消失，但仍保留在 Git 历史中。
set -euo pipefail

ROOT=$(git rev-parse --show-toplevel)
cd "$ROOT"
OUT="$ROOT/out"
TMP="$ROOT/.deploy"
mkdir -p "$TMP"
IDX="$TMP/ghpages.index"
LIST="$TMP/ghpages.files"
FULL="$TMP/ghpages.full"
SHA="$TMP/ghpages.sha"
INFO="$TMP/ghpages.info"

[ -f "$OUT/index.html" ] || { echo "ERROR: out/index.html 不存在，请先 npm run build" >&2; exit 1; }

git fetch origin gh-pages
PARENT=$(git rev-parse origin/gh-pages)
echo "parent (origin/gh-pages) = $PARENT"

# hash-object --stdin-paths 以仓库根为基准解析路径，故补上 out/ 前缀；
# 写入索引时仍使用相对 out/ 的路径（即站点根目录）。
# 排除站点未引用的外部同步产物（out/64-cards/ 由同步工具写入）与
# 同步临时 / 冲突文件，避免把瞬时状态发布到线上。
find "$OUT" -type f -printf '%P\n' \
  | grep -vE '^64-cards/|^assets/book-visual/|syncthing|sync-conflict|\.tmp$' \
  | LC_ALL=C sort > "$LIST"
sed 's|^|out/|' "$LIST" > "$FULL"
git hash-object -w --stdin-paths < "$FULL" > "$SHA"
awk 'NR==FNR{sha[FNR]=$0;next}{printf "100644 %s\t%s\n", sha[FNR], $0}' "$SHA" "$LIST" > "$INFO"
echo "files = $(wc -l < "$LIST")"

rm -f "$IDX"
export GIT_INDEX_FILE="$IDX"
git read-tree --empty
git update-index --index-info < "$INFO"
TREE=$(git write-tree)
unset GIT_INDEX_FILE

COMMIT=$(git commit-tree "$TREE" -p "$PARENT" -m "deploy: 静态站快照（$(git rev-parse --short HEAD)）")
echo "new commit = $COMMIT"
echo "tree files = $(git ls-tree -r --name-only "$TREE" | wc -l)"
echo "tree png   = $(git ls-tree -r --name-only "$TREE" | grep -c '\.png$' || true)"

if [ "${DRY_RUN:-0}" = "1" ]; then
  echo "DRY_RUN: 未推送"
  exit 0
fi

git push origin "$COMMIT:gh-pages"
echo "DEPLOYED $COMMIT"
