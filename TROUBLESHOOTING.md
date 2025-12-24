# 故障排除指南

## Supabase 环境变量错误

### 错误信息
```
Missing Supabase environment variables
```

### 解决方案

1. **如果暂时不需要 Supabase 功能**（推演功能使用 localStorage，不需要 Supabase）：
   - 应用仍然可以正常运行
   - 只是 Supabase 相关功能（用户认证、云端数据存储）将不可用
   - 可以忽略这个警告

2. **如果需要 Supabase 功能**：
   - 创建 `.env.local` 文件（在 `web` 目录下）
   - 添加以下内容：
     ```env
     NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
     ```
   - 重启开发服务器：`npm run dev`

## 浏览器扩展错误

### 错误信息
```
popup.js:1 Uncaught TypeError
BackgroundService.js:1 Uncaught SyntaxError
```

### 说明
这些错误通常来自浏览器扩展（如广告拦截器、开发者工具等），不是项目代码的问题。

### 解决方案
- 可以忽略这些错误，它们不影响应用功能
- 如果想消除这些错误，可以：
  1. 禁用相关浏览器扩展
  2. 使用无痕模式测试
  3. 使用不同的浏览器

## 其他常见问题

### 1. 页面刷新后数据丢失
- 推演结果存储在 `localStorage` 中
- 如果使用无痕模式，`localStorage` 会在关闭标签页后清除
- 这是正常行为

### 2. 样式不显示
- 确保 Tailwind CSS 已正确安装：`npm install`
- 重启开发服务器

### 3. TypeScript 类型错误
- 运行 `npm install` 确保所有依赖已安装
- 如果问题持续，删除 `node_modules` 和 `package-lock.json`，然后重新安装

## 获取帮助

如果遇到其他问题，请检查：
1. Node.js 版本（推荐 18+）
2. 所有依赖是否已安装
3. 环境变量是否正确配置
4. 浏览器控制台是否有其他错误信息

