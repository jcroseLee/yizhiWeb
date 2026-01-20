# SMS 签名错误修复说明

## 问题描述

错误信息：`该账号下找不到对应签名` (Cannot find corresponding signature under this account)

这个错误发生在使用 Supabase 的 `auth.signUp()` 方法注册手机号用户时。Supabase 会自动尝试发送手机号确认短信，但项目中没有配置 Supabase 的 SMS 提供商（如 Twilio），导致发送失败。

## 解决方案

为了避免触发 Supabase 的自动 SMS 确认，我们改用 Supabase Admin API 来创建用户，并设置 `phone_confirm: true`，这样可以直接确认手机号而不需要发送确认短信。

## 修改内容

### 1. 创建新的注册 API 路由

**文件**: `web/app/api/sms/register/route.ts`

- 新增专门的手机号注册 API
- 使用 Admin API (`auth.admin.createUser`) 创建用户
- 设置 `phone_confirm: true` 避免触发 SMS 确认
- 先验证自定义验证码，再创建用户

### 2. 修改注册表单

**文件**: `web/app/login/components/RegisterForm.tsx`

- 将 `supabase.auth.signUp()` 改为调用 `/api/sms/register` API
- 注册成功后使用密码登录创建会话

### 3. 修复微信绑定手机号功能

**文件**: `web/app/api/wechat-bind-phone/route.ts`
**文件**: `supabase/functions/wechat-bind-phone/index.ts`

- 将 `supabase.auth.signUp()` 改为 `supabase.auth.admin.createUser()`
- 设置 `phone_confirm: true` 避免触发 SMS 确认
- 创建用户后手动创建会话

## 技术细节

### 为什么会出现这个错误？

当调用 `supabase.auth.signUp({ phone: '...' })` 时：
1. Supabase 会尝试发送手机号确认短信
2. 如果项目没有配置 SMS 提供商（Twilio 等），就会报错
3. 错误信息来自 Supabase 的 SMS 服务提供商

### 为什么使用 Admin API？

使用 `auth.admin.createUser()` 的好处：
1. 可以设置 `phone_confirm: true`，直接确认手机号
2. 不会触发 Supabase 的自动 SMS 发送
3. 我们使用自己的阿里云 SMS 服务来发送验证码

### 工作流程

1. **发送验证码**: 使用 `/api/sms/send-code`，通过阿里云 SMS 发送
2. **验证验证码**: 使用 `/api/sms/verify-code` 或 `/api/sms/register`
3. **创建用户**: 使用 Admin API 创建，设置 `phone_confirm: true`
4. **登录**: 使用 `signInWithPassword` 创建会话

## 注意事项

1. **环境变量**: 确保配置了 `SUPABASE_SERVICE_ROLE_KEY`，这是使用 Admin API 必需的
2. **验证码流程**: 我们仍然使用自定义的验证码系统（存储在 `sms_codes` 表）
3. **安全性**: Admin API 只能在服务端使用，不能在客户端代码中使用

## 相关文件

- `web/app/api/sms/send-code/route.ts` - 发送验证码
- `web/app/api/sms/verify-code/route.ts` - 验证验证码
- `web/app/api/sms/login/route.ts` - 手机号登录（已使用 Admin API）
- `web/app/api/sms/register/route.ts` - 手机号注册（新增）
- `web/app/login/components/RegisterForm.tsx` - 注册表单
- `web/app/login/components/LoginForm.tsx` - 登录表单

## 测试建议

1. 测试手机号注册流程
2. 测试手机号登录流程
3. 测试微信绑定手机号功能
4. 确认不再出现 SMS 签名错误
