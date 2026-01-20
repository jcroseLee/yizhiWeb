# 阿里云短信服务配置指南

本文档说明如何配置阿里云短信服务用于手机号登录和注册。

## 1. 获取阿里云 AccessKey 并配置权限

1. 登录 [阿里云控制台](https://ecs.console.aliyun.com/)
2. 进入 **访问控制** > **用户** > **创建用户**
3. 创建用户后，在用户详情页创建 **AccessKey**
4. 记录下 **AccessKey ID** 和 **AccessKey Secret**
5. **重要：配置权限**
   - 在用户详情页，点击 **添加权限**
   - 搜索并添加 `AliyunDysmsFullAccess`（短信服务完全访问权限）
   - 或者添加自定义策略，包含以下权限：
     ```json
     {
       "Version": "1",
       "Statement": [
         {
           "Effect": "Allow",
           "Action": [
             "dysms:SendSms",
             "dysms:QuerySendDetails"
           ],
           "Resource": "*"
         }
       ]
     }
     ```

## 2. 配置短信服务

1. 登录 [阿里云短信服务控制台](https://dysms.console.aliyun.com/)
2. 申请短信签名（如：易知）
3. 申请短信模板，模板内容示例：
   ```
   您的验证码是：${code}，5分钟内有效，请勿泄露给他人。
   ```
   模板参数使用 `code` 作为变量名
4. 记录下 **签名名称** 和 **模板代码**（格式如：SMS_123456789）

## 3. 配置环境变量

在 `.env.local` 文件中添加以下配置：

```bash
# 阿里云短信服务配置
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=

# 阿里云短信签名和模板
ALIYUN_SMS_SIGN_NAME=易知
ALIYUN_SMS_TEMPLATE_CODE=
```

## 4. 创建数据库表

运行数据库迁移文件创建验证码存储表：

```bash
# 如果使用 Supabase CLI
supabase db push

# 或者直接在 Supabase Dashboard 的 SQL Editor 中执行
# supabase/migrations/20260116_create_sms_codes_table.sql
```

## 5. 功能说明

### 发送验证码
- API: `POST /api/sms/send-code`
- 请求体: `{ "phone": "13800138000" }`
- 功能: 发送6位数字验证码到指定手机号，验证码5分钟内有效

### 验证验证码
- API: `POST /api/sms/verify-code`
- 请求体: `{ "phone": "13800138000", "code": "123456" }`
- 功能: 验证手机号和验证码是否匹配

### 手机号登录
- API: `POST /api/sms/login`
- 请求体: `{ "phone": "13800138000", "code": "123456" }`
- 功能: 验证验证码后自动登录或注册用户

## 6. 使用流程

### 注册流程
1. 用户输入手机号
2. 点击"获取验证码"，调用 `/api/sms/send-code`
3. 用户输入收到的验证码和密码
4. 点击"注册"，调用 `/api/sms/verify-code` 验证验证码
5. 验证成功后，使用 Supabase 创建用户

### 登录流程
1. 用户输入手机号
2. 点击"获取验证码"，调用 `/api/sms/send-code`
3. 用户输入收到的验证码
4. 点击"登录"，调用 `/api/sms/login`
5. 系统验证验证码，如果用户不存在则自动注册，然后创建登录会话

## 7. 注意事项

1. **验证码有效期**: 验证码5分钟内有效，过期后需要重新获取
2. **验证码使用**: 每个验证码只能使用一次，验证成功后会被删除
3. **频率限制**: 建议在前端添加60秒倒计时，防止频繁发送
4. **安全性**: AccessKey Secret 必须保密，不要提交到代码仓库
5. **短信模板**: 确保短信模板已审核通过，否则无法发送

## 8. 故障排查

### 发送失败 - 403 权限错误
如果遇到 `NoPermission: code: 403` 错误，请检查：

1. **AccessKey 权限配置**
   - 登录 [RAM 控制台](https://ram.console.aliyun.com/)
   - 找到对应的用户，检查是否已添加 `AliyunDysmsFullAccess` 权限
   - 如果没有，请添加该权限并等待几分钟让权限生效

2. **短信服务激活**
   - 登录 [短信服务控制台](https://dysms.console.aliyun.com/)
   - 确认短信服务已开通并激活

3. **签名和模板审核状态**
   - 在短信服务控制台 > **国内消息** > **签名管理**，确认签名状态为"审核通过"
   - 在短信服务控制台 > **国内消息** > **模板管理**，确认模板状态为"审核通过"
   - 只有审核通过的签名和模板才能使用

4. **AccessKey 所属账户**
   - 确认 AccessKey 属于开通了短信服务的账户
   - 确认 AccessKey 没有被禁用或删除

### 其他发送失败问题
- 检查 AccessKey 是否正确
- 检查短信签名和模板是否已审核通过
- 检查账户余额是否充足
- 查看服务器日志获取详细错误信息

### 验证失败
- 检查验证码是否过期（5分钟）
- 检查验证码是否已被使用
- 检查数据库连接是否正常

### 登录失败
- 检查 Supabase 配置是否正确
- 检查 Service Role Key 是否配置
- 查看服务器日志获取详细错误信息
