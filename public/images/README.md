# 图片资源目录说明

本目录用于存放项目中使用的所有图片资源。

## 📁 目录结构

```
images/
├── backgrounds/      # 背景图片
│   ├── bg.png        # 主背景图
│   ├── topbg.png     # 顶部背景
│   └── paper-texture.png  # 宣纸纹理（可选）
│
├── icons/            # 图标图片
│   ├── home.png      # 首页图标
│   ├── community.png # 社区图标
│   ├── message.png   # 消息图标
│   ├── my.png        # 个人中心图标
│   └── masters.png   # 咨询师图标
│
├── illustrations/    # 插画/装饰图片
│   ├── baishan.png   # 白山插画
│   ├── cherry-blossom.png  # 樱花装饰
│   └── yu.png        # 其他装饰图
│
├── hexagram/         # 卦象相关图片
│   ├── coin.png      # 硬币正面
│   ├── coin-reverse.png  # 硬币反面
│   └── guashi.png    # 卦式图
│
├── logos/            # Logo 和品牌图片
│   └── logo.png      # 主 Logo
│
└── ui/               # UI 组件相关图片
    └── (按钮、卡片等 UI 元素图片)
```

## 🎨 图片命名规范

1. **使用小写字母和连字符**：`home-icon.png` 而不是 `HomeIcon.png`
2. **描述性命名**：`coin-yang.png` 而不是 `img1.png`
3. **版本号**：如需多版本，使用 `-v2` 后缀：`coin-v2.png`
4. **尺寸标识**（可选）：`logo-512.png`、`icon-32.png`

## 📦 图片格式建议

- **图标/Logo**: SVG（矢量）或 PNG（透明背景）
- **照片/插画**: PNG（透明背景）或 WebP（压缩）
- **背景图**: JPG（不透明）或 WebP（压缩）
- **装饰元素**: PNG 或 SVG

## 🚀 在代码中使用

### Next.js Image 组件（推荐）

```tsx
import Image from 'next/image'

export default function Component() {
  return (
    <Image
      src="/images/icons/home.png"
      alt="首页"
      width={24}
      height={24}
    />
  )
}
```

### 直接引用（CSS/内联）

```tsx
// CSS 背景
<div style={{ backgroundImage: 'url(/images/backgrounds/bg.png)' }} />

// 内联图片
<img src="/images/icons/home.png" alt="首页" />
```

## 📝 注意事项

1. **优化图片大小**：上传前使用工具压缩图片（如 TinyPNG）
2. **响应式图片**：使用 Next.js Image 组件自动优化
3. **懒加载**：大图片使用 `loading="lazy"` 属性
4. **Alt 文本**：始终提供有意义的 alt 文本（无障碍访问）

## 🔄 从 6yao 项目迁移图片

如果需要从原 6yao 项目复制图片：

```bash
# 复制背景图
cp ../../6yao/public/bg.png images/backgrounds/
cp ../../6yao/public/topbg.png images/backgrounds/

# 复制图标
cp ../../6yao/public/home.png images/icons/
cp ../../6yao/public/community.png images/icons/
cp ../../6yao/public/message.png images/icons/
cp ../../6yao/public/my.png images/icons/

# 复制卦象相关
cp ../../6yao/public/coin.png images/hexagram/
cp ../../6yao/public/coin-reverse.png images/hexagram/
cp ../../6yao/public/guashi.png images/hexagram/

# 复制插画
cp ../../6yao/public/baishan.png images/illustrations/
cp ../../6yao/public/cherry-blossom.png images/illustrations/
cp ../../6yao/public/yu.png images/illustrations/
```

## 🎯 新中式主题图片建议

根据项目的"新中式学术风"定位，建议使用：

- **背景**: 宣纸纹理、水墨画风格
- **图标**: 简洁线条、传统元素（如印章、竹简）
- **装饰**: 传统纹样、书法元素
- **色彩**: 与主题色板（墨蓝、朱砂红）协调

