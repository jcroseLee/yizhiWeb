# 组件使用指南

## 📚 已配置的组件库

### shadcn/ui 基础组件

所有组件位于 `lib/components/ui/` 目录：

- **Button** (`button.tsx`) - 按钮组件，支持多种变体和尺寸
- **Card** (`card.tsx`) - 卡片容器，包含 Header、Title、Content、Footer
- **Input** (`input.tsx`) - 输入框
- **Label** (`label.tsx`) - 标签
- **Select** (`select.tsx`) - 下拉选择
- **Drawer** (`drawer.tsx`) - 移动端抽屉（基于 Vaul）

### 工具函数

- **cn** (`lib/utils/cn.ts`) - 合并 Tailwind 类名
- **formatDateTime** (`lib/utils/date.ts`) - 日期格式化工具

### 状态管理

- **useDivinationStore** (`lib/stores/divinationStore.ts`) - 排盘数据管理

## 🎨 主题定制

### 使用自定义颜色

```tsx
// 直接使用 Tailwind 类名
<div className="bg-paper-50 text-ink-800">
  <button className="bg-cinnabar-500 text-white">朱砂红按钮</button>
</div>
```

### 使用主题变量

```tsx
// 使用 shadcn/ui 主题变量
<div className="bg-background text-foreground">
  <button className="bg-primary text-primary-foreground">主题按钮</button>
</div>
```

## 📝 示例代码

查看 `lib/components/ExampleUsage.tsx` 了解完整的使用示例。

## 🔧 添加更多组件

使用 shadcn/ui CLI 添加组件：

```bash
npx shadcn@latest add [component-name]
```

常用组件：
- `dialog` - 对话框
- `dropdown-menu` - 下拉菜单
- `table` - 表格
- `tabs` - 标签页
- `toast` - 提示消息
- `tooltip` - 工具提示

## 🎯 最佳实践

1. **优先使用主题变量**：使用 `bg-background`、`text-foreground` 等，而不是直接写颜色值
2. **使用 cn 函数**：合并类名时使用 `cn()` 而不是字符串拼接
3. **保持一致性**：使用预定义的组件变体，保持 UI 风格统一
4. **响应式设计**：使用 Tailwind 的响应式前缀（`md:`, `lg:` 等）

## 📦 相关库文档

- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)
- [Zustand](https://zustand-demo.pmnd.rs/)
- [Tiptap](https://tiptap.dev/)
- [Recharts](https://recharts.org/)

