# Tailwind CSS v4 配置说明

## 已完成的配置

项目已升级到 Tailwind CSS v4，配置方式已从 `tailwind.config.js` 迁移到 CSS 文件中的 `@theme` 指令。

## 配置位置

所有 Tailwind 配置现在都在 `app/globals.css` 文件中：

1. **内容扫描路径** - 通过 `@source` 指令定义
2. **主题配置** - 通过 `@theme` 指令定义
3. **自定义 CSS 变量** - 在 `@layer base` 中定义

## 如果样式仍未应用

### 1. 重启开发服务器

```bash
# 停止当前服务器 (Ctrl+C)
# 然后重新启动
npm run dev
```

### 2. 清除 Next.js 缓存

```bash
rm -rf .next
npm run dev
```

### 3. 检查浏览器控制台

打开浏览器开发者工具，检查：
- CSS 文件是否正确加载
- Tailwind 类名是否被正确应用
- 是否有其他样式覆盖了 Tailwind 样式

### 4. 验证 PostCSS 配置

确保 `postcss.config.mjs` 包含：

```js
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
```

### 5. 检查 globals.css 导入

确保 `app/layout.tsx` 中正确导入了 `globals.css`：

```tsx
import "./globals.css";
```

## 自定义颜色使用

在代码中可以使用以下自定义颜色：

- `ink-50`, `ink-100`, `ink-800`, `ink-900`
- `paper-50`, `paper-100`
- `cinnabar-500`, `cinnabar-600`

示例：
```tsx
<div className="bg-ink-800 text-paper-50">
  <button className="bg-cinnabar-500 hover:bg-cinnabar-600">
    按钮
  </button>
</div>
```

## 注意事项

- 旧的 `tailwind.config.js` 已重命名为 `tailwind.config.js.backup`
- Tailwind v4 不再需要配置文件，所有配置都在 CSS 文件中
- `tailwindcss-animate` 插件在 v4 中可能需要不同的配置方式

