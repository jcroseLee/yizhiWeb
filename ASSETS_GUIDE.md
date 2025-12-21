# 📦 资源文件管理指南

## 📁 目录结构

项目中的图片资源统一存放在 `public/images/` 目录下，按用途分类：

```
public/images/
├── backgrounds/      # 背景图片
│   ├── bg.png       # 主背景图
│   └── topbg.png    # 顶部背景
│
├── icons/           # 图标图片
│   ├── home.png     # 首页图标
│   ├── community.png # 社区图标
│   ├── message.png  # 消息图标
│   └── my.png       # 个人中心图标
│
├── illustrations/   # 插画/装饰图片
│   ├── baishan.png  # 白山插画
│   └── cherry-blossom.png # 樱花装饰
│
├── hexagram/        # 卦象相关图片
│   ├── coin.png     # 硬币正面
│   ├── coin-reverse.png # 硬币反面
│   └── guashi.png   # 卦式图
│
├── logos/           # Logo 和品牌图片
│   └── logo.png     # 主 Logo
│
└── ui/              # UI 组件相关图片
```

## 🚀 使用方法

### 1. 使用图片路径工具函数（推荐）

```tsx
import Image from 'next/image'
import { iconImages, backgroundImages } from '@/lib/utils/images'

export default function Component() {
  return (
    <>
      {/* 使用图标 */}
      <Image
        src={iconImages.home}
        alt="首页"
        width={24}
        height={24}
      />
      
      {/* 使用背景图 */}
      <div
        style={{
          backgroundImage: `url(${backgroundImages.main})`,
        }}
      />
    </>
  )
}
```

### 2. 直接使用路径

```tsx
import Image from 'next/image'

<Image
  src="/images/icons/home.png"
  alt="首页"
  width={24}
  height={24}
/>
```

### 3. 在 CSS 中使用

```css
.background {
  background-image: url('/images/backgrounds/bg.png');
}
```

## 📋 可用的图片路径常量

在 `lib/utils/images.ts` 中定义了所有图片路径：

- `backgroundImages` - 背景图片
- `iconImages` - 图标图片
- `hexagramImages` - 卦象图片
- `illustrationImages` - 插画图片
- `logoImages` - Logo 图片

## 🔄 从原项目迁移图片

### 方法 1: 使用迁移脚本（推荐）

```bash
cd web
./scripts/migrate-images.sh
```

### 方法 2: 手动复制

```bash
# 复制背景图
cp ../6yao/public/bg.png public/images/backgrounds/
cp ../6yao/public/topbg.png public/images/backgrounds/

# 复制图标
cp ../6yao/public/home.png public/images/icons/
cp ../6yao/public/community.png public/images/icons/
# ... 以此类推
```

## 📝 图片命名规范

1. **使用小写字母和连字符**：`home-icon.png` ✅
2. **避免使用空格**：`home icon.png` ❌
3. **描述性命名**：`coin-yang.png` ✅ 而不是 `img1.png` ❌
4. **版本号**：如需多版本，使用 `-v2` 后缀

## 🎨 图片格式建议

| 用途 | 推荐格式 | 说明 |
|------|---------|------|
| 图标/Logo | SVG 或 PNG | SVG 用于矢量图标，PNG 用于位图 |
| 照片/插画 | PNG 或 WebP | PNG 支持透明，WebP 压缩更好 |
| 背景图 | JPG 或 WebP | JPG 适合不透明图片，WebP 压缩更好 |
| 装饰元素 | PNG 或 SVG | 根据是否需要缩放选择 |

## ⚡ 性能优化建议

1. **使用 Next.js Image 组件**
   - 自动优化图片
   - 支持懒加载
   - 响应式图片

2. **压缩图片**
   - 使用 [TinyPNG](https://tinypng.com/) 或类似工具
   - 目标：图标 < 50KB，背景图 < 200KB

3. **使用 WebP 格式**
   - 更好的压缩率
   - 现代浏览器支持良好

4. **懒加载大图片**
   ```tsx
   <Image
     src={backgroundImages.main}
     alt="背景"
     loading="lazy"
   />
   ```

## 🎯 新中式主题图片建议

根据项目的"新中式学术风"定位：

- **背景**: 宣纸纹理、水墨画风格、淡雅色调
- **图标**: 简洁线条、传统元素（印章、竹简、毛笔）
- **装饰**: 传统纹样、书法元素、古典图案
- **色彩**: 与主题色板（墨蓝、朱砂红、宣纸白）协调

## 📚 相关文档

- [public/images/README.md](./public/images/README.md) - 详细目录说明
- [lib/utils/images.ts](./lib/utils/images.ts) - 图片路径工具函数
- [lib/components/ImageExample.tsx](./lib/components/ImageExample.tsx) - 使用示例组件

