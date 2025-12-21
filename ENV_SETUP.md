# 环境变量配置指南

## 快速开始

### 1. 创建 `.env.local` 文件

在 `web` 目录下创建 `.env.local` 文件：

```bash
cd web
cp .env.local.example .env.local
```

### 2. 获取 Supabase 配置信息

#### 方法一：通过 Supabase Dashboard

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 选择你的项目（如果没有项目，先创建一个）
3. 进入 **Settings** > **API**
4. 复制以下信息：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 方法二：通过 Supabase CLI

如果你使用 Supabase CLI，可以运行：

```bash
supabase status
```

这会显示项目的 URL 和 API keys。

### 3. 配置 `.env.local` 文件

编辑 `web/.env.local` 文件，填入你的 Supabase 配置：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. 重启开发服务器

配置完成后，需要重启 Next.js 开发服务器：

```bash
# 停止当前服务器（Ctrl+C）
# 然后重新启动
npm run dev
```

## 验证配置

配置成功后，浏览器控制台应该不再显示 Supabase 环境变量未设置的警告。

你可以在浏览器控制台运行以下代码来验证：

```javascript
// 在浏览器控制台中运行
console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '已配置' : '未配置')
console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置' : '未配置')
```

## 注意事项

1. **不要提交 `.env.local` 到 Git**
   - `.env.local` 文件已添加到 `.gitignore`
   - 只提交 `.env.local.example` 作为模板

2. **环境变量命名**
   - 必须以 `NEXT_PUBLIC_` 开头才能在客户端使用
   - Supabase 客户端需要在客户端和服务端都能访问

3. **安全性**
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` 是公开密钥，可以暴露在客户端
   - 但不要暴露 `service_role` key（服务端密钥）
   - 使用 Row Level Security (RLS) 策略保护数据库

## 故障排除

### 问题：配置后仍然显示警告

**解决方案：**
1. 确认 `.env.local` 文件在 `web` 目录下
2. 确认环境变量名称正确（注意大小写）
3. 重启开发服务器
4. 清除浏览器缓存并刷新页面

### 问题：找不到 Supabase 项目

**解决方案：**
1. 访问 [Supabase Dashboard](https://app.supabase.com)
2. 如果没有项目，点击 "New Project" 创建一个
3. 等待项目初始化完成（通常需要几分钟）

### 问题：环境变量不生效

**解决方案：**
1. 确认文件名为 `.env.local`（注意开头的点）
2. 确认没有多余的空格或引号
3. 确认值没有换行
4. 重启开发服务器

## 下一步

配置完成后，你可以：

1. 测试邮箱注册和登录功能
2. 查看 [EMAIL_AUTH_QUICKSTART.md](./EMAIL_AUTH_QUICKSTART.md) 了解如何使用
3. 查看 [docs/EMAIL_AUTH_SETUP.md](../docs/EMAIL_AUTH_SETUP.md) 了解详细配置

