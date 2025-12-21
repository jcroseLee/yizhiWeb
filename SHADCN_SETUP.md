# shadcn/ui 配置说明

本项目已配置 shadcn/ui 组件库，采用**新中式学术风**设计主题。

## 🎨 设计主题

### 色彩系统
- **宣纸白** (`paper-50`): `#fdfbf7` - 页面背景
- **浅米色** (`paper-100`): `#f5f1e8` - 卡片背景
- **墨蓝** (`ink-800`): `#2c3e50` - 主标题/Navbar
- **朱砂红** (`cinnabar-500`): `#c0392b` - 强调/应验标记

### 字体
- **标题**: Noto Serif SC（思源宋体）- 增加学术感
- **正文**: Noto Sans SC（思源黑体）- 保证易读性

## 📦 已安装的核心库

### UI 组件库
- `@radix-ui/react-slot` - 基础组件
- `@radix-ui/react-dialog` - 对话框
- `@radix-ui/react-dropdown-menu` - 下拉菜单
- `@radix-ui/react-label` - 标签
- `class-variance-authority` - 变体管理
- `clsx` + `tailwind-merge` - 类名合并
- `lucide-react` - 图标库

### 功能库
- `@tiptap/react` + `@tiptap/starter-kit` - 富文本编辑器
- `recharts` - 图表可视化
- `vaul` - 移动端抽屉
- `zustand` - 状态管理
- `dayjs` - 日期处理
- `lunar-javascript` - 农历/易学算法

## 🚀 使用方法

### 1. 使用基础组件

```tsx
import { Button } from '@/lib/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/lib/components/ui/card'
import { Input } from '@/lib/components/ui/input'
import { Label } from '@/lib/components/ui/label'

export default function Example() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>示例标题</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">姓名</Label>
            <Input id="name" placeholder="请输入" />
          </div>
          <Button>提交</Button>
        </div>
      </CardContent>
    </Card>
  )
}
```

### 2. 使用状态管理

```tsx
import { useDivinationStore } from '@/lib/stores/divinationStore'

export default function Example() {
  const { question, setQuestion, history } = useDivinationStore()
  
  return (
    <div>
      <input value={question} onChange={(e) => setQuestion(e.target.value)} />
      <div>历史记录: {history.length} 条</div>
    </div>
  )
}
```

### 3. 使用日期工具

```tsx
import { formatDateTime, dayjs } from '@/lib/utils/date'

export default function Example() {
  const now = new Date()
  return <div>{formatDateTime(now)}</div>
}
```

### 4. 添加新的 shadcn/ui 组件

shadcn/ui 不是 npm 包，而是通过 CLI 工具添加组件：

```bash
npx shadcn@latest add [component-name]
```

例如：
```bash
npx shadcn@latest add dialog
npx shadcn@latest add drawer
npx shadcn@latest add table
```

组件会自动添加到 `lib/components/ui/` 目录。

## 🎯 组件变体

### Button 变体
- `default` - 默认（墨蓝色）
- `destructive` - 破坏性操作（朱砂红）
- `outline` - 轮廓
- `secondary` - 次要
- `ghost` - 幽灵
- `link` - 链接

### 尺寸
- `default` - 默认
- `sm` - 小
- `lg` - 大
- `icon` - 图标按钮

## 📝 自定义主题

主题配置在以下文件中：
- `tailwind.config.js` - Tailwind 配置
- `app/globals.css` - CSS 变量定义

修改这些文件即可调整整体主题。

## 🔗 相关链接

- [shadcn/ui 官网](https://ui.shadcn.com/)
- [Radix UI 文档](https://www.radix-ui.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/)
- [Lucide Icons](https://lucide.dev/)

