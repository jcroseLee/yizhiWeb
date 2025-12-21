# 修复空白页面问题

## 问题诊断

你看到的 HTML 显示的是 Vite 开发服务器的内容，但这是一个 **Next.js** 项目。

## 解决步骤

### 步骤 1: 停止所有正在运行的服务

```bash
# 查找并停止所有 node 进程（可选，如果端口冲突）
# 或者直接关闭运行服务的终端窗口
```

### 步骤 2: 确认你在正确的目录

```bash
cd /Users/huanhuanli/Code/trae_liuyao/6yao/web
pwd
# 应该显示: .../6yao/web
```

### 步骤 3: 清理并重新安装依赖（如果需要）

```bash
# 如果之前安装有问题，可以清理后重新安装
rm -rf node_modules package-lock.json
npm install
```

### 步骤 4: 启动 Next.js 开发服务器

```bash
npm run dev
```

**重要**: 你应该看到类似这样的输出：
```
  ▲ Next.js 16.0.7
  - Local:        http://localhost:3000
  - Environments: .env.local, .env

 ✓ Starting...
 ✓ Ready in 2.3s
```

### 步骤 5: 访问正确的 URL

**必须访问**: http://localhost:3000

**不要访问**:
- ❌ http://localhost:5173 (这是 Vite 的默认端口)
- ❌ 其他端口

### 步骤 6: 清除浏览器缓存

1. 按 `Cmd + Shift + R` (Mac) 或 `Ctrl + Shift + R` (Windows) 强制刷新
2. 或者使用无痕/隐私模式打开浏览器

## 验证 Next.js 是否正在运行

在浏览器中访问 http://localhost:3000，你应该看到：

1. **页面标题**: "易知 - 六爻占卜"
2. **导航栏**: 顶部有 "易知"  logo 和导航链接
3. **占卜表单**: 包含事项输入、时间选择、起卦方式选择
4. **日期信息**: 显示公历、农历和干支信息

## 如果仍然看到空白页面

### 检查浏览器控制台

1. 按 `F12` 打开开发者工具
2. 查看 **Console** 标签页
3. 查看是否有错误信息

### 检查终端输出

查看运行 `npm run dev` 的终端窗口，确认：
- ✅ 没有编译错误
- ✅ 显示 "Ready in X.Xs"
- ✅ 显示 "Local: http://localhost:3000"

### 常见问题

**Q: 我看到 "Cannot GET /" 错误**
A: 这可能是 Next.js 没有正确启动，尝试重启开发服务器

**Q: 页面显示 "404"**
A: 确认访问的是 http://localhost:3000，不是其他端口

**Q: 仍然看到 Vite 相关的内容**
A: 你可能访问了错误的端口或项目。确认：
- 运行的是 `cd web && npm run dev`
- 不是 `cd cms && npm run dev`（cms 是另一个 Vite 项目）

## 快速测试

运行这个命令来验证项目是否正确设置：

```bash
cd /Users/huanhuanli/Code/trae_liuyao/6yao/web
npm run dev
```

然后在浏览器中访问: **http://localhost:3000**

如果一切正常，你应该看到完整的占卜界面，而不是空白页面。





