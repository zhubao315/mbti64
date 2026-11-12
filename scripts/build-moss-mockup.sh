#!/usr/bin/env bash
# 《千分之一的你》3D 立体效果图 · 全流程
#
#   1) moss-image 生成「封面是纯色」的书模底图（透视 / 材质 / 光影 / 纸页 / 投影）
#   2) 检测出封面四边形，把真实的 封面.png / 封底.png 透视贴回去
#      —— 文字因此逐像素准确（AI 直接画书模会把中文画错，见 docs/book-visual/06-电商效果图.md）
#
# 用法：
#   bash scripts/build-moss-mockup.sh            # 全流程（重新生图 + 合成）
#   bash scripts/build-moss-mockup.sh --compose  # 只合成（底图已存在时用，省时间）
#   bash scripts/build-moss-mockup.sh --only front
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BINDING="书-千分之一的你/装帧"
BASES="assets-hifi/moss-mockup"
COVER="书-千分之一的你/装帧/封面.png"
BACK="书-千分之一的你/装帧/封底.png"
SPINE_SRC="书-千分之一的你/装帧/书脊.png"
SPINE_TEX="$BASES/spine-texture.png"

COMPOSE_ONLY=0
ONLY=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose) COMPOSE_ONLY=1; shift ;;
    --only) ONLY="$2"; shift 2 ;;
    *) echo "未知参数 $1"; exit 1 ;;
  esac
done

# 视角 → 贴哪张封面。back 用封底，其余用正面封面。
composite_view() {
  local view="$1" src="$2" extra="${3:-}"
  python3 scripts/apply_cover.py \
    --base "$BASES/$view.png" \
    --cover "$src" \
    --out "$BINDING/mockup-$view.jpg" \
    --h-lo 100 --h-hi 145 --expand 1.5 --reach 45 $extra
}

if [[ $COMPOSE_ONLY -eq 0 ]]; then
  if [[ -n "$ONLY" ]]; then
    node scripts/gen-moss-mockup.mjs --only "$ONLY"
  else
    node scripts/gen-moss-mockup.mjs
  fi
fi

# 书脊贴图：书脊条是「印刷拼版」（46×291mm），不是书脊本身。
# 换成按书脊面比例（24mm×200mm）重排的纹理，否则竖排书名会被压扁。
python3 - <<PY
import sys
sys.path.insert(0, "scripts")
from PIL import Image
import render_book_mockup as rbm
strip = Image.open("$SPINE_SRC").convert("RGBA")
tex = rbm.build_spine_texture(strip)
tex.save("$SPINE_TEX")
print(f"书脊纹理 {tex.size} → $SPINE_TEX")
PY

echo
echo "✓ 合成封面："
for view in hero-3q front flat-lay scene-desk; do
  [[ -f "$BASES/$view.png" ]] || { echo "  ! 缺底图 $BASES/$view.png，跳过"; continue; }
  composite_view "$view" "$COVER"
done

# 方形主图（淘宝 / 京东主图要 1:1）
if [[ -f "$BASES/hero-3q.png" ]]; then
  python3 scripts/apply_cover.py \
    --base "$BASES/hero-3q.png" --cover "$COVER" \
    --out "$BINDING/mockup-hero-3q-square.jpg" \
    --h-lo 100 --h-hi 145 --expand 1.5 --reach 45 \
    --square --resize 1536x1536
fi

# 白底版（平台要求纯白底）
if [[ -f "$BASES/hero-white.png" ]]; then
  python3 scripts/apply_cover.py \
    --base "$BASES/hero-white.png" --cover "$COVER" \
    --out "$BINDING/mockup-hero-3q-white.jpg" \
    --h-lo 100 --h-hi 145 --expand 1.5 --reach 45 --white-bg
  python3 scripts/apply_cover.py \
    --base "$BASES/hero-white.png" --cover "$COVER" \
    --out "$BINDING/mockup-hero-3q-square-white.jpg" \
    --h-lo 100 --h-hi 145 --expand 1.5 --reach 45 \
    --square --resize 1536x1536 --white-bg
fi

# 封底
if [[ -f "$BASES/back.png" ]]; then
  composite_view back "$BACK"
fi

# 书脊（贴的是重排后的书脊纹理；窄条要放宽改色范围）
if [[ -f "$BASES/spine.png" ]]; then
  composite_view spine "$SPINE_TEX" "--reach 60"
fi

echo
echo "产物在 $BINDING/"
ls -1 "$BINDING"/mockup-*.jpg
