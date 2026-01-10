#!/bin/bash

# 图片资源迁移脚本
# 从 6yao 项目复制图片到 web 项目的 images 目录

set -e

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SOURCE_DIR="$PROJECT_ROOT/../tools/6yao/public"
TARGET_DIR="$PROJECT_ROOT/public/images"

echo "📦 开始迁移图片资源..."
echo "源目录: $SOURCE_DIR"
echo "目标目录: $TARGET_DIR"
echo ""

# 检查源目录是否存在
if [ ! -d "$SOURCE_DIR" ]; then
  echo "❌ 错误: 源目录不存在: $SOURCE_DIR"
  exit 1
fi

# 创建目标目录（如果不存在）
mkdir -p "$TARGET_DIR/backgrounds"
mkdir -p "$TARGET_DIR/icons"
mkdir -p "$TARGET_DIR/illustrations"
mkdir -p "$TARGET_DIR/hexagram"
mkdir -p "$TARGET_DIR/logos"
mkdir -p "$TARGET_DIR/ui"

# 复制背景图片
echo "🖼️  复制背景图片..."
if [ -f "$SOURCE_DIR/bg.png" ]; then
  cp "$SOURCE_DIR/bg.png" "$TARGET_DIR/backgrounds/" && echo "  ✓ bg.png"
fi
if [ -f "$SOURCE_DIR/topbg.png" ]; then
  cp "$SOURCE_DIR/topbg.png" "$TARGET_DIR/backgrounds/" && echo "  ✓ topbg.png"
fi

# 复制图标
echo "🎨 复制图标..."
for icon in home.png community.png message.png my.png; do
  if [ -f "$SOURCE_DIR/$icon" ]; then
    cp "$SOURCE_DIR/$icon" "$TARGET_DIR/icons/" && echo "  ✓ $icon"
  fi
done

# 复制卦象相关图片
echo "🔮 复制卦象图片..."
if [ -f "$SOURCE_DIR/coin.png" ]; then
  cp "$SOURCE_DIR/coin.png" "$TARGET_DIR/hexagram/" && echo "  ✓ coin.png"
fi
if [ -f "$SOURCE_DIR/coin-reverse.png" ]; then
  cp "$SOURCE_DIR/coin-reverse.png" "$TARGET_DIR/hexagram/" && echo "  ✓ coin-reverse.png"
fi
if [ -f "$SOURCE_DIR/guashi.png" ]; then
  cp "$SOURCE_DIR/guashi.png" "$TARGET_DIR/hexagram/" && echo "  ✓ guashi.png"
fi

# 复制插画
echo "🎭 复制插画..."
if [ -f "$SOURCE_DIR/baishan.png" ]; then
  cp "$SOURCE_DIR/baishan.png" "$TARGET_DIR/illustrations/" && echo "  ✓ baishan.png"
fi
if [ -f "$SOURCE_DIR/cherry-blossom.png" ]; then
  cp "$SOURCE_DIR/cherry-blossom.png" "$TARGET_DIR/illustrations/" && echo "  ✓ cherry-blossom.png"
fi
if [ -f "$SOURCE_DIR/yu.png" ]; then
  cp "$SOURCE_DIR/yu.png" "$TARGET_DIR/illustrations/" && echo "  ✓ yu.png"
fi

echo ""
echo "✅ 图片迁移完成！"
echo ""
echo "📝 提示:"
echo "  - 检查复制的图片是否符合要求"
echo "  - 考虑使用图片压缩工具优化文件大小"
echo "  - 查看 public/images/README.md 了解目录结构"

