# 邮箱认证功能快速开始

## 前置要求

1. Supabase 项目已创建
2. 环境变量已配置（`NEXT_PUBLIC_SUPABASE_URL` 和 `NEXT_PUBLIC_SUPABASE_ANON_KEY`）

## 快速测试

### 1. 启动开发服务器

```bash
cd web
npm run dev
```

### 2. 访问登录页面

打开浏览器访问：`http://localhost:3000/login`

### 3. 测试注册

1. 点击"立即注册"按钮
2. 输入邮箱和密码（至少6位）
3. 点击"注册"按钮
4. 如果启用了邮箱验证，检查邮箱中的验证链接
5. 如果禁用了邮箱验证，会自动登录并跳转

### 4. 测试登录

1. 在登录表单中输入已注册的邮箱和密码
2. 点击"登录"按钮
3. 应该成功登录并跳转到首页

## 功能特性

✅ **邮箱注册** - 支持邮箱和密码注册  
✅ **邮箱登录** - 支持邮箱和密码登录  
✅ **邮箱验证** - 支持邮箱验证流程（可选）  
✅ **OAuth 登录** - 支持 Google 和 GitHub 登录  
✅ **路由保护** - 自动保护需要登录的路由  
✅ **会话管理** - 自动管理用户会话  
✅ **错误处理** - 友好的错误提示  
✅ **重定向** - 登录后自动跳转到之前访问的页面  

## 主要文件

- `/app/login/page.tsx` - 登录页面
- `/app/login/components/LoginForm.tsx` - 登录表单
- `/app/login/components/RegisterForm.tsx` - 注册表单
- `/app/auth/callback/page.tsx` - 认证回调处理
- `/lib/services/auth.ts` - 认证工具函数
- `/middleware.ts` - 路由保护中间件

## 常见问题

### Q: 注册后没有收到验证邮件？

A: 检查 Supabase Dashboard > Authentication > Email Templates 配置，或禁用邮箱验证进行测试。

### Q: 登录后立即被登出？

A: 检查环境变量是否正确配置，检查浏览器控制台错误。

### Q: 如何禁用邮箱验证？

A: 在 Supabase Dashboard > Authentication > Providers > Email 中，取消勾选 "Enable email confirmations"。

## 下一步

查看完整配置文档：[EMAIL_AUTH_SETUP.md](../docs/EMAIL_AUTH_SETUP.md)

