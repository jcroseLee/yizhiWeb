# 启动说明

## 问题排查

如果你看到空白页面或 Vite 相关的 HTML 内容，请按以下步骤检查：

### 1. 确认你在正确的目录

```bash
cd /Users/huanhuanli/Code/trae_liuyao/6yao/web
```

### 2. 安装依赖（如果还没安装）

```bash
npm install
```

### 3. 启动 Next.js 开发服务器

```bash
npm run dev
```

你应该看到类似这样的输出：
```
  ▲ Next.js 16.0.7
  - Local:        http://localhost:3000
  - Environments: .env.local, .env

 ✓ Starting...
 ✓ Ready in 2.3s
```

### 4. 访问正确的 URL

- ✅ **正确**: http://localhost:3000
- ❌ **错误**: 其他端口（如 5173 是 Vite 的默认端口）

### 5. 如果仍然看到空白页面

1. **清除浏览器缓存**
   - 按 `Cmd+Shift+R` (Mac) 或 `Ctrl+Shift+R` (Windows) 强制刷新
   - 或使用无痕模式

2. **检查控制台错误**
   - 打开浏览器开发者工具 (F12)
   - 查看 Console 标签页是否有错误

3. **检查终端输出**
   - 查看运行 `npm run dev` 的终端
   - 确认没有编译错误

4. **确认没有其他服务占用端口**
   ```bash
   # 检查 3000 端口是否被占用
   lsof -i :3000
   ```

### 6. 如果看到 Vite 相关的内容

这说明你可能访问了错误的端口或项目。确保：
- 访问的是 `http://localhost:3000`（Next.js 默认端口）
- 不是 `http://localhost:5173`（Vite 默认端口）
- 确认运行的是 `npm run dev` 而不是其他命令

## 快速验证

运行以下命令验证项目是否正确设置：

```bash
# 1. 确认在正确的目录
pwd
# 应该显示: .../6yao/web

# 2. 确认 package.json 存在
ls package.json

# 3. 确认 node_modules 存在
ls node_modules | head -5

# 4. 启动开发服务器
npm run dev
```

## 预期结果

启动成功后，访问 http://localhost:3000 应该看到：
- 顶部导航栏（易知、首页、咨询师、社区、消息、我的）
- 推演表单页面
- 日期和干支信息显示

如果仍然有问题，请检查：
1. Node.js 版本（推荐 18+）
2. 所有依赖是否已安装
3. 浏览器控制台的错误信息

