# 登录问题故障排除

## 常见错误：AuthApiError - Invalid login credentials

### 错误信息
```
AuthApiError: Invalid login credentials
```

这是最常见的登录错误，可能由多种原因导致。

### 可能的原因和解决方案

#### 1. 邮箱或密码错误

**症状：**
- 控制台显示 `AuthApiError: Invalid login credentials`
- 页面显示"邮箱或密码错误"

**解决方案：**
- ✅ 确认邮箱地址输入正确（注意大小写和空格）
- ✅ 确认密码输入正确（注意大小写、特殊字符和数字）
- ✅ 检查键盘是否开启了 Caps Lock（大写锁定）
- ✅ 如果忘记密码，使用"忘记密码"功能重置
- ✅ 确认邮箱地址完整（包含 @ 符号和域名）

**调试步骤：**
1. 尝试复制粘贴邮箱地址，避免输入错误
2. 尝试复制粘贴密码（如果有保存）
3. 检查浏览器控制台中的邮箱地址是否正确（已自动转换为小写）

#### 2. 用户不存在（邮箱未注册）

**症状：**
- 控制台显示 `AuthApiError: Invalid login credentials`
- 页面可能显示"该邮箱未注册"

**解决方案：**
- 先注册账户，然后再登录
- 确认使用的是正确的邮箱地址
- 检查是否在不同的 Supabase 项目中注册

**注意：** Supabase 出于安全考虑，不会明确区分"用户不存在"和"密码错误"，两者都返回相同的错误信息。

#### 3. 邮箱未验证

**症状：**
- 控制台显示 `AuthApiError: Invalid login credentials` 或 `Email not confirmed`
- 页面显示"请先验证您的邮箱"

**解决方案：**
1. 检查注册时使用的邮箱收件箱
2. 查找来自 Supabase 的验证邮件（可能在垃圾邮件文件夹）
3. 点击邮件中的验证链接
4. 如果未收到邮件：
   - 检查垃圾邮件文件夹
   - 在 Supabase Dashboard > Authentication > Users 中手动验证用户
   - 或者在注册页面点击"重新发送验证邮件"

**临时解决方案（开发环境）：**
在 Supabase Dashboard > Authentication > Providers > Email 中：
- 取消勾选 "Enable email confirmations"
- 这样注册后可以直接登录，无需验证邮箱

## 常见错误：400 Bad Request

### 错误信息
```
POST https://your-project.supabase.co/auth/v1/token?grant_type=password 400 (Bad Request)
```

### 可能的原因和解决方案

#### 1. 邮箱或密码错误（同上）

参考上面的 "Invalid login credentials" 解决方案。

#### 2. 邮箱未验证

**症状：**
- 控制台显示 400 错误
- 页面显示"请先验证您的邮箱"

**解决方案：**
1. 检查注册时使用的邮箱收件箱
2. 查找来自 Supabase 的验证邮件
3. 点击邮件中的验证链接
4. 如果未收到邮件：
   - 检查垃圾邮件文件夹
   - 在 Supabase Dashboard > Authentication > Users 中手动验证用户
   - 或者在注册页面点击"重新发送验证邮件"

**临时解决方案（开发环境）：**
在 Supabase Dashboard > Authentication > Providers > Email 中：
- 取消勾选 "Enable email confirmations"
- 这样注册后可以直接登录，无需验证邮箱

#### 3. 用户不存在

**症状：**
- 控制台显示 400 错误
- 页面显示"该邮箱未注册"

**解决方案：**
- 先注册账户，然后再登录
- 确认使用的是正确的邮箱地址

#### 4. 邮箱格式错误

**症状：**
- 页面显示"邮箱格式不正确"

**解决方案：**
- 确认邮箱格式正确：`username@domain.com`
- 检查是否有多余的空格
- 确认包含 @ 符号

#### 5. 环境变量未配置

**症状：**
- 控制台显示 "⚠️ Supabase environment variables are not set"

**解决方案：**
1. 在 `web` 目录下创建 `.env.local` 文件
2. 添加以下内容：
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```
3. 重启开发服务器

详细步骤请参考 [ENV_SETUP.md](./ENV_SETUP.md)

## 调试步骤

### 1. 检查浏览器控制台

打开浏览器开发者工具（F12），查看：
- Console 标签：查看错误信息
- Network 标签：查看请求详情

### 2. 检查请求详情

在 Network 标签中找到失败的请求：
- 查看 Request Payload（请求体）
- 查看 Response（响应内容）
- 查看 Status Code（状态码）

### 3. 检查 Supabase Dashboard

1. 登录 [Supabase Dashboard](https://app.supabase.com)
2. 进入 **Authentication** > **Users**
3. 检查用户是否存在
4. 检查用户的邮箱验证状态
5. 查看 **Logs** 标签中的错误信息

### 4. 测试步骤

1. **测试注册功能**
   - 使用新邮箱注册
   - 确认注册成功
   - 检查是否收到验证邮件

2. **测试登录功能**
   - 使用注册的邮箱和密码登录
   - 如果启用了邮箱验证，先验证邮箱

3. **检查环境变量**
   ```bash
   # 在浏览器控制台运行
   console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
   console.log('Supabase Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '已配置' : '未配置')
   ```

## 常见问题 FAQ

### Q: 为什么登录时显示 400 错误？

A: 400 错误通常表示请求格式有问题或认证失败。最常见的原因是：
- 邮箱或密码错误
- 邮箱未验证（如果启用了邮箱验证）
- 用户不存在

### Q: 如何禁用邮箱验证？

A: 在 Supabase Dashboard > Authentication > Providers > Email 中，取消勾选 "Enable email confirmations"。

### Q: 如何重置密码？

A: 点击登录页面的"忘记密码"链接，输入邮箱地址，然后按照邮件中的说明重置密码。

### Q: 登录后立即被登出？

A: 检查：
1. 环境变量是否正确配置
2. Supabase 项目是否正常运行
3. 浏览器控制台是否有错误
4. Cookie 是否被阻止

### Q: OAuth 登录失败？

A: 检查：
1. OAuth 提供者（Google/GitHub）的配置是否正确
2. 重定向 URL 是否在 Supabase 和 OAuth 提供者中都正确配置
3. 浏览器控制台中的错误信息

## 获取帮助

如果以上方法都无法解决问题：

1. 查看 Supabase Dashboard > Logs 中的详细错误信息
2. 检查浏览器控制台的完整错误堆栈
3. 查看 [Supabase 官方文档](https://supabase.com/docs/guides/auth)
4. 查看项目的 [EMAIL_AUTH_SETUP.md](../docs/EMAIL_AUTH_SETUP.md) 文档

