# 🚀 快速开始指南

## 已完成的配置

✅ **shadcn/ui 组件库** - 新中式学术风主题  
✅ **Tailwind CSS 4** - 自定义主题配置  
✅ **Zustand** - 状态管理  
✅ **Tiptap** - 富文本编辑器  
✅ **Recharts** - 图表可视化  
✅ **Vaul** - 移动端抽屉  
✅ **Day.js** - 日期处理  
✅ **lunar-javascript** - 易学算法  

## 立即使用

### 1. 基础组件示例

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

### 2. 查看完整示例

查看 `lib/components/ExampleUsage.tsx` 了解所有组件的使用方法。

### 3. 添加更多组件

```bash
npx shadcn@latest add dialog
npx shadcn@latest add table
npx shadcn@latest add tabs
```

## 主题定制

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

## 文档

- [SHADCN_SETUP.md](./SHADCN_SETUP.md) - 详细配置说明
- [COMPONENTS_GUIDE.md](./COMPONENTS_GUIDE.md) - 组件使用指南
- [SETUP_COMPLETE.md](./SETUP_COMPLETE.md) - 配置完成总结

## 下一步

1. 查看示例组件：`lib/components/ExampleUsage.tsx`
2. 根据需要添加更多 shadcn/ui 组件
3. 开始构建你的页面！

