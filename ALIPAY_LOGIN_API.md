# 支付宝登录（Web）API 文档

本项目的支付宝登录基于支付宝开放平台 OAuth2.0（网页授权），并在服务端完成 token 兑换与用户信息拉取，最终建立 Supabase 登录态（Cookie Session）。

## 1. 发起授权

**GET** `/api/auth/alipay/start`

### Query 参数

| 参数名 | 必填 | 说明 |
| --- | --- | --- |
| `redirect` | 否 | 登录成功后的站内跳转路径，仅允许以 `/` 开头的相对路径 |

### 行为

- 生成 `state`（CSRF 防护），写入 `HttpOnly` Cookie：`yi_alipay_oauth_state_v1`
- 302/307 重定向到支付宝授权页

### 响应

- **3xx Redirect**：`Location` 指向 `https://openauth.alipay.com/oauth2/publicAppAuthorize.htm?...`

## 2. 授权回调

**GET** `/api/auth/alipay/callback`

### Query 参数（来自支付宝）

| 参数名 | 必填 | 说明 |
| --- | --- | --- |
| `auth_code` | 是 | 授权码 |
| `state` | 是 | 原样回传的 state |

### 行为

- 校验 `state` Cookie 与 UA 绑定哈希（CSRF 防护）
- 调用 `alipay.system.oauth.token` 换取 `access_token` 与 `user_id`
- 调用 `alipay.user.info.share` 获取 `user_id / nick_name / avatar`
- 在 Supabase 中创建/更新用户，并通过 `admin.generateLink + verifyOtp` 建立 Cookie Session
- 写入/更新 `profiles`：`nickname / avatar_url / last_login_at / role / email`
- 成功后重定向回 `redirect` 指定的站内路径

### 响应

- **3xx Redirect**：
  - 成功：跳转到 `redirect` 指定路径（默认 `/`）
  - 失败：跳转到 `/login?error=...`（见错误码文档）

## 3. 环境变量

| 变量名 | 必填 | 说明 |
| --- | --- | --- |
| `ALIPAY_APP_ID` | 是 | 支付宝开放平台应用 APPID |
| `ALIPAY_PRIVATE_KEY` | 是 | 应用私钥 |
| `ALIPAY_PUBLIC_KEY` | 是 | 支付宝公钥 |
| `NEXT_PUBLIC_SUPABASE_URL` | 是 | Supabase URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 是 | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | 是 | Supabase service role key（仅服务端） |
| `NEXT_PUBLIC_APP_URL` / `APP_URL` | 建议 | 用于生成回调 URL（生产环境建议为 https） |

## 4. 安全与缓存策略

- 使用 `state` + HttpOnly Cookie + UA 哈希绑定进行 CSRF 防护
- 不在 URL 中暴露 Supabase token，登录态通过 Cookie 建立
- 回调与发起接口均设置 `Cache-Control: no-store`

