# 易知 (YiZhi) UI Design System

## 1. 设计理念 (Design Philosophy)

**“纸墨朱韵，数字易学”**

易知的设计语言采用了**“新中式 (New Chinese)”**风格，旨在构建一座连接古老智慧与未来算力的数字桥梁。
核心视觉元素汲取自中国传统书法与绘画：
*   **纸 (Paper)**: 温润的米白底色，模拟宣纸的触感与纹理。
*   **墨 (Ink)**: 深沉的墨色作为主色调，传达专业与沉稳。
*   **朱 (Cinnabar)**: 朱砂红作为点睛之笔，象征印章、批注与能量。

整体风格追求**“疏朗、雅致、现代”**，避免过度的仿古装饰，而是提取传统神韵，结合现代 Web 的极简布局与微交互。

---

## 2. 设计变量 (Design Tokens)

基于 Tailwind CSS v4 配置 (`web/app/globals.css`)。

### 2.1 色彩体系 (Color Palette)

| 语义 (Semantic) | 变量名 (Variable) | 色值 (Hex/HSL) | 用途 |
| :--- | :--- | :--- | :--- |
| **背景 (Background)** | `--background` | `#fdfbf7` (HSL 38 15% 98%) | 全局背景，宣纸白 |
| **卡片 (Card)** | `--card` | `#fdfbf7` (HSL 38 20% 99%) | 卡片背景，比背景微亮 |
| **前景/文本 (Foreground)** | `--foreground` | `#2c3e50` (HSL 210 29% 24%) | 正文，墨黑色 |
| **主色 (Primary)** | `--primary` | `#2c3e50` (HSL 210 29% 24%) | 主要按钮、激活状态 |
| **次色 (Secondary)** | `--secondary` | `#e4e7eb` (HSL 210 10% 95%) | 次要按钮、背景装饰 |
| **强调/破坏 (Destructive)** | `--destructive` | `#c0392b` (HSL 6 63% 46%) | 错误、删除、重要强调（朱砂） |
| **边框 (Border)** | `--border` | `#e4e7eb` (HSL 210 10% 88%) | 组件边框，淡墨色 |

**扩展色彩 (Extended Palette)**:
*   **Ink (墨)**: `50` (#f5f7fa) -> `900` (#1a252f)
*   **Paper (纸)**: `50` (#fdfbf7) -> `100` (#f5f1e8)
*   **Cinnabar (朱)**: `500` (#c0392b) -> `600` (#a93226)

### 2.2 排版 (Typography)

*   **标题字体 (Serif)**: `--font-serif` ("Noto Serif SC", SimSun, serif)
    *   用于 `h1` - `h6`，营造人文气息。
*   **正文字体 (Sans)**: `--font-sans` ("Noto Sans SC", system-ui, sans-serif)
    *   用于 UI 界面、长文阅读，确保清晰度。
*   **特殊样式**:
    *   `.vertical-serif`: 竖排宋体，用于传统卦名展示。
    *   `.ink-text`: 带有微弱阴影的文字，模拟墨迹晕染。

### 2.3 形状与质感 (Shape & Texture)

*   **圆角 (Radius)**: `--radius: 0.3rem` (约 4-5px)。
    *   采用**微圆角**设计，介于直角与圆角之间，体现“方正之中见圆润”的东方器物美学。
*   **纹理 (Texture)**:
    *   `.paper-texture`: 使用 SVG 噪点滤镜 (`feTurbulence`) 模拟宣纸纤维感。
    *   `.nav-bg-pattern`: 顶部云纹装饰。
*   **阴影 (Shadow)**:
    *   `.card-shadow`: 暖色调扩散阴影 (`rgba(163, 148, 128, 0.1)`)，模拟纸张悬浮。

---

## 3. 核心组件 (Core Components)

### 3.1 按钮 (Buttons)
*   **Default (Primary)**: 墨色背景 + 白字。用于主要操作（如“登录”、“确认”）。
*   **Destructive**: 朱砂红背景 + 白字。用于高风险或强调操作（如“删除”、“立即修习”）。
*   **Outline**: 透明/宣纸背景 + 淡墨边框。用于次要操作。
*   **Ghost**: 透明背景 + 悬浮底色。用于图标按钮或低优先级操作。

### 3.2 印章 (Seals)
项目特色的视觉组件，用于状态标识或评价。
*   **样式类**: `.seal-stamp`
*   **特征**: 双边框、旋转 (`-8deg`)、朱砂色 (`#C82E31`)、仿宋字体。
*   **变体**:
    *   `pending` (待验/土黄)
    *   `accurate` (准确/墨绿)
    *   `archived` (已结案/青瓷色/圆形)

### 3.3 卦象容器 (Hexagram Container)
*   **样式类**: `.gua-container`
*   **特征**: 去框化设计，背景透明，强调线条本身。
*   **动爻标记**: 空心红圈 (`.changing-line-marker`)，辅以红色小印章。

---

## 4. 动效系统 (Motion System)

动效设计追求“气韵生动”，模拟自然流动。

*   **水墨呼吸 (Organic Breathe)**: `.ink-aura-main`
    *   用于背景光晕，不规则缩放与旋转，模拟墨滴在水中的扩散。
*   **流光 (Shimmer)**: `.animate-shimmer`
    *   用于加载骨架屏或 AI 卡片的高光扫过效果。
*   **浮动 (Float)**: `.digital-trigram`
    *   卦象符号的缓慢升起与淡出，寓意数据的流动与升华。
*   **金钱卦 (Coin Toss)**: `.coin-3d`
    *   3D 翻转动画，模拟真实的掷币起卦过程。

---

## 5. 前端审查与改进建议 (Review & Recommendations)

经过对 `/web` 目录代码的审查，发现以下改进空间，建议在后续迭代中优化：

### 5.1 🔴 硬编码色值 (Hardcoded Colors)
**问题**: 在 `web/app/page.tsx` 及部分组件中，大量使用了硬编码的 Hex 色值，而非 CSS 变量。
*   例如: `text-[#C82E31]` (朱砂红), `bg-[#FDFBF7]` (宣纸白), `text-stone-900`。
**建议**:
*   将 `#C82E31` 替换为 `text-destructive` 或 `text-[color:var(--color-cinnabar-500)]`。
*   将 `#FDFBF7` 替换为 `bg-background`。
*   将 `stone-xxx` 系列替换为 `ink-xxx` 系列变量，确保暗色模式下的自动适配。

### 5.2 🟠 全局样式污染 (Global Style Pollution)
**问题**: `web/app/page.tsx` 中包含了一个巨大的 `<style jsx global>{styles}</style>` 块，定义了 `.snap-container`, `.seal-stamp` 等大量全局样式。
**建议**:
*   将通用样式（如 `.seal-stamp`, `.paper-texture`）移至 `web/app/globals.css` 的 `@layer utilities` 或 `@layer components` 中。
*   特定页面的样式应使用 CSS Modules 或 Tailwind 的局部作用域写法，避免全局污染。

### 5.3 🟡 字体与排版一致性
**问题**: 部分地方混用了 `font-serif` 和 `font-mono`，且字号使用 `text-[0.625rem]` 等 Arbitrary Value。
**建议**:
*   统一在 Tailwind 配置中定义字号阶梯（如 `text-2xs`），减少魔数（Magic Numbers）。
*   确保所有中文标题统一使用 `font-serif`，正文使用 `font-sans`。

### 5.4 🔵 Tailwind v4 迁移
**问题**: 项目已引入 Tailwind v4，但部分旧代码仍沿用 v3 的配置方式或复杂的 `calc()` 计算。
**建议**:
*   充分利用 v4 的 CSS 变量原生支持，简化 `tailwind.config`。
*   检查 `postcss.config.mjs` 确保兼容性。

---

**文档生成日期**: 2026-01-26
**生成者**: Trae AI Design Assistant
