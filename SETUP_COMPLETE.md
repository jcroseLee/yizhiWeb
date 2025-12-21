# 🎉 shadcn/ui 新中式主题配置完成

## ✅ 已完成的工作

### 1. 核心依赖安装
- ✅ shadcn/ui 核心依赖（Radix UI、class-variance-authority、clsx、tailwind-merge）
- ✅ Lucide React 图标库
- ✅ Tiptap 富文本编辑器
- ✅ Recharts 图表库
- ✅ Vaul 移动端抽屉
- ✅ Zustand 状态管理
- ✅ Day.js 日期处理
- ✅ lunar-javascript 易学算法库

### 2. 主题配置
- ✅ Tailwind 配置文件（`tailwind.config.js`）
  - 新中式色板：宣纸白、浅米色、墨蓝、朱砂红
  - 字体配置：思源宋体（标题）、思源黑体（正文）
  - 圆角、动画等配置
- ✅ 全局样式（`app/globals.css`）
  - CSS 变量定义（支持亮色/暗色模式）
  - 新中式主题色彩映射

### 3. 基础组件
- ✅ Button - 按钮组件（多种变体）
- ✅ Card - 卡片组件（Header、Title、Content、Footer）
- ✅ Input - 输入框
- ✅ Label - 标签
- ✅ Select - 下拉选择
- ✅ Drawer - 移动端抽屉

### 4. 工具函数
- ✅ `cn()` - 类名合并工具
- ✅ `formatDateTime()` - 日期格式化
- ✅ Zustand Store - 排盘数据管理

### 5. 文档
- ✅ `SHADCN_SETUP.md` - 配置说明文档
- ✅ `COMPONENTS_GUIDE.md` - 组件使用指南
- ✅ `ExampleUsage.tsx` - 示例组件

## 📁 项目结构

```
web/
├── lib/
│   ├── components/
│   │   ├── ui/              # shadcn/ui 组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── select.tsx
│   │   │   └── drawer.tsx
│   │   └── ExampleUsage.tsx # 使用示例
│   ├── stores/
│   │   └── divinationStore.ts  # Zustand 状态管理
│   └── utils/
│       ├── cn.ts            # 类名合并
│       └── date.ts           # 日期工具
├── app/
│   └── globals.css           # 全局样式（新中式主题）
├── tailwind.config.js        # Tailwind 配置
└── package.json              # 已更新依赖
```

## 🎨 设计主题

### 色彩系统
- **宣纸白** (`paper-50`): `#fdfbf7` - 页面背景
- **浅米色** (`paper-100`): `#f5f1e8` - 卡片背景
- **墨蓝** (`ink-800`): `#2c3e50` - 主标题/Navbar
- **朱砂红** (`cinnabar-500`): `#c0392b` - 强调/应验标记

### 字体
- **标题**: Noto Serif SC（思源宋体）
- **正文**: Noto Sans SC（思源黑体）

## 🚀 快速开始

### 1. 使用基础组件

```tsx
import { Button } from '@/lib/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/lib/components/ui/card'

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>标题</CardTitle>
      </CardHeader>
      <CardContent>
        <Button>按钮</Button>
      </CardContent>
    </Card>
  )
}
```

### 2. 使用状态管理

```tsx
import { useDivinationStore } from '@/lib/stores/divinationStore'

export default function Page() {
  const { question, setQuestion } = useDivinationStore()
  return <input value={question} onChange={(e) => setQuestion(e.target.value)} />
}
```

### 3. 添加更多组件

```bash
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add tabs
```

## 📚 相关文档

- [SHADCN_SETUP.md](./SHADCN_SETUP.md) - 详细配置说明
- [COMPONENTS_GUIDE.md](./COMPONENTS_GUIDE.md) - 组件使用指南
- [shadcn/ui 官网](https://ui.shadcn.com/)

## 🎯 下一步建议

1. **添加更多组件**：根据需求使用 CLI 添加 dialog、table、tabs 等
2. **集成 Tiptap**：创建富文本编辑器组件用于案例撰写
3. **集成 Recharts**：创建图表组件用于准确率统计
4. **更新现有页面**：将现有页面迁移到新组件系统
5. **添加字体**：确保 Noto Serif SC 和 Noto Sans SC 字体已加载

## 💡 提示

- 所有组件都可以直接修改源码进行定制
- 主题颜色在 `tailwind.config.js` 和 `globals.css` 中配置
- 使用 `cn()` 函数合并类名，避免样式冲突
- 优先使用主题变量（如 `bg-background`）而不是直接写颜色值

